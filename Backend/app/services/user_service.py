from datetime import datetime, time, date
from bson import ObjectId
from app.repositories.user_repository import UserRepository
from app.auth.password import hash_password, verify_password
from app.auth.security import create_access_token
from app.enums.user import KYCStatus, UserApprovalStatus
from app.enums.role import Role
from app.db.mongodb import db


class UserService:
    def __init__(self):
        self.repo = UserRepository()

    # =====================================================
    # USER REGISTRATION
    # =====================================================
    async def register_user(self, payload):
        if await self.repo.find_by_phone(payload.phone):
            raise ValueError("Phone number already registered")

        existing_aadhaar = await self.repo.collection.find_one(
            {"aadhaar": payload.aadhaar}
        )
        if existing_aadhaar:
            raise ValueError("Aadhaar already registered")

        full_name = f"{payload.first_name} {payload.last_name}".strip()

        user_doc = {
            "name": full_name,
            "first_name": payload.first_name,
            "last_name": payload.last_name,
            "phone": payload.phone,
            "aadhaar": payload.aadhaar,
            "password_hash": hash_password(payload.password),

            "kyc_status": KYCStatus.PENDING,
            "approval_status": UserApprovalStatus.PENDING,
            "is_minor": False,

            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        user_id = await self.repo.create(user_doc)
        return str(user_id)

    # =====================================================
    # FLEXIBLE LOGIN
    # Aadhaar + Password  OR  DigiPIN only
    # =====================================================
    async def login_user_flexible(
        self,
        aadhaar: str | None,
        password: str | None,
        digi_pin: str | None
    ):
        # 🔐 DigiPIN-only login
        if digi_pin and digi_pin.strip():
            user = await self.repo.collection.find_one(
                {"digi_pin_hash": {"$exists": True}}
            )

            if not user or not verify_password(digi_pin, user["digi_pin_hash"]):
                raise ValueError("Invalid Digi PIN")

        # 🔐 Aadhaar + Password login
        else:
            if not aadhaar or not password:
                raise ValueError("Aadhaar and password required")

            user = await self.repo.collection.find_one({"aadhaar": aadhaar})
            if not user or not verify_password(password, user["password_hash"]):
                raise ValueError("Invalid Aadhaar or password")

        # ✅ Login allowed before approval (for KYC)
        return create_access_token(
            subject=str(user["_id"]),
            role=Role.USER
        )

    # =====================================================
    # BASIC USER PROFILE
    # =====================================================
    async def get_user_by_id(self, user_id: str):
        user = await self.repo.find_by_id(user_id)
        if not user:
            return None

        return {
            "user_id": str(user["_id"]),
            "name": user["name"],
            "phone": user["phone"],
            "kyc_status": user["kyc_status"],
            "approval_status": user["approval_status"],
            "has_digi_pin": bool(user.get("digi_pin_hash")),
            "is_minor": user.get("is_minor", False),
            "approved_by_manager_id": (
                str(user.get("approved_by_manager_id"))
                if user.get("approved_by_manager_id") else None
            ),
            "created_at": user["created_at"].isoformat()
        }

    # =====================================================
    # KYC SUBMISSION
    # =====================================================
    async def submit_kyc(self, user_id: str, payload):
        user = await self.repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if user["kyc_status"] == KYCStatus.COMPLETED:
            raise ValueError("KYC already completed")

        # Strict mandatory-field validation for KYC submission.
        if not payload.pan or not str(payload.pan).strip():
            raise ValueError("PAN is required")
        if not payload.occupation or not str(payload.occupation).strip():
            raise ValueError("Occupation is required")
        if not payload.address or not str(payload.address.line1).strip():
            raise ValueError("Address line is required")
        if not str(payload.address.city).strip():
            raise ValueError("Address city is required")
        if not str(payload.address.state).strip():
            raise ValueError("Address state is required")
        if not str(payload.address.pincode).strip():
            raise ValueError("Address pincode is required")
        if not payload.nominee or not str(payload.nominee.name).strip() or not str(payload.nominee.relation).strip():
            raise ValueError("Nominee details are required")
        if (
            not payload.guarantor
            or not str(payload.guarantor.name).strip()
            or not str(payload.guarantor.relation).strip()
            or not str(payload.guarantor.contact_no).strip()
        ):
            raise ValueError("Guarantor details are required")

        # Mandatory KYC documents before submission.
        user_obj_id = ObjectId(str(user["_id"]))
        doc_types = await db.user_documents.distinct("doc_type", {"user_id": user_obj_id})
        doc_set = {str(t).upper() for t in doc_types}
        # Require at least one identity document before KYC submission.
        required_any_of = {"AADHAAR", "PAN", "DRIVING_LICENCE"}
        if not (doc_set & required_any_of):
            raise ValueError(
                "Upload at least one identity document (AADHAAR / PAN / DRIVING_LICENCE) before KYC submission"
            )

        today = date.today()
        age = today.year - payload.dob.year - (
            (today.month, today.day) < (payload.dob.month, payload.dob.day)
        )
        is_minor = age < 18

        update_data = {
            "pan": payload.pan,
            "dob": datetime.combine(payload.dob, time.min),
            "gender": payload.gender,
            "occupation": payload.occupation,
            "address": payload.address.dict(),
            "nominee": payload.nominee.dict() if getattr(payload, 'nominee', None) else None,
            "guarantor": payload.guarantor.dict() if getattr(payload, 'guarantor', None) else None,

            "is_minor": is_minor,
            "kyc_status": KYCStatus.COMPLETED,
            "updated_at": datetime.utcnow()
        }

        await self.repo.update_kyc(user_id, update_data)

    # =====================================================
    # PROFILE UPDATE (editable fields only)
    # =====================================================
    async def update_profile(self, user_id: str, payload):
        user = await self.repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        # Keep profile completeness strict after KYC as well.
        if not payload.pan or not str(payload.pan).strip():
            raise ValueError("PAN is required")
        if not payload.occupation or not str(payload.occupation).strip():
            raise ValueError("Occupation is required")
        if not payload.address or not str(payload.address.line1).strip():
            raise ValueError("Address line is required")
        if not str(payload.address.city).strip():
            raise ValueError("Address city is required")
        if not str(payload.address.state).strip():
            raise ValueError("Address state is required")
        if not str(payload.address.pincode).strip():
            raise ValueError("Address pincode is required")
        if not payload.nominee or not str(payload.nominee.name).strip() or not str(payload.nominee.relation).strip():
            raise ValueError("Nominee details are required")
        if (
            not payload.guarantor
            or not str(payload.guarantor.name).strip()
            or not str(payload.guarantor.relation).strip()
            or not str(payload.guarantor.contact_no).strip()
        ):
            raise ValueError("Guarantor details are required")

        # Name and Aadhaar are immutable by design
        update_data = {
            "pan": payload.pan,
            "dob": datetime.combine(payload.dob, time.min),
            "gender": payload.gender,
            "occupation": payload.occupation,
            "address": payload.address.dict(),
            "nominee": payload.nominee.dict() if getattr(payload, 'nominee', None) else None,
            "guarantor": payload.guarantor.dict() if getattr(payload, 'guarantor', None) else None,
            "updated_at": datetime.utcnow()
        }

        await self.repo.update_kyc(user_id, update_data)

        # If a bank manager had saved a KYC draft for review, the user updating their profile
        # should supersede that draft. This prevents stale manager drafts from masking user edits.
        await self.repo.collection.update_one(
            {"_id": user["_id"]},
            {"$unset": {"kyc_review_draft": "", "kyc_review_draft_updated_at": "", "kyc_review_draft_by": ""}}
        )

    # =====================================================
    # DIGI PIN SETUP (OPTIONAL)
    # =====================================================
    async def set_digi_pin(self, user_id: str, aadhaar: str, digi_pin: str):
        user = await self.repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if user.get("digi_pin_hash"):
            raise ValueError("Digi PIN already set")

        # DigiPIN can be set only after KYC completion and bank approval.
        if user.get("kyc_status") != KYCStatus.COMPLETED:
            raise ValueError("Please complete KYC before setting DigiPIN")

        if user.get("approval_status") != UserApprovalStatus.APPROVED:
            raise ValueError("Account not approved by bank manager yet")

        # verify aadhaar matches user's aadhaar on record
        if not user.get("aadhaar") or str(user.get("aadhaar")) != str(aadhaar):
            raise ValueError("Aadhaar does not match our records")

        await self.repo.collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "digi_pin_hash": hash_password(digi_pin),
                    "digi_pin_set_at": datetime.utcnow()
                }
            }
        )

    # =====================================================
    # FULL USER DETAILS
    # =====================================================
    async def get_user_full_details(self, user_id: str):
        user = await self.repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        # If a bank manager saved a KYC draft while the user's account is still pending,
        # show the draft as the effective KYC so the user sees manager corrections.
        draft = user.get("kyc_review_draft") or None
        draft_active = bool(draft) and user.get("approval_status") == UserApprovalStatus.PENDING

        def pick(field: str, default):
            if not draft_active:
                return default
            v = (draft or {}).get(field)
            return default if v is None else v

        effective_aadhaar = pick("aadhaar", user.get("aadhaar"))
        effective_pan = pick("pan", user.get("pan"))
        effective_dob = pick("dob", user.get("dob"))
        effective_gender = pick("gender", user.get("gender"))
        effective_occupation = pick("occupation", user.get("occupation"))
        effective_address = pick("address", user.get("address"))
        effective_nominee = pick("nominee", user.get("nominee"))
        effective_guarantor = pick("guarantor", user.get("guarantor"))

        return {
            "user_id": str(user["_id"]),
            "name": user.get("name"),
            "phone": user.get("phone"),
            "created_at": user["created_at"].isoformat(),

            "kyc_status": user.get("kyc_status"),
            "approval_status": user.get("approval_status"),
            "is_minor": user.get("is_minor", False),
            "has_digi_pin": bool(user.get("digi_pin_hash")),
            "approved_by_manager_id": (
                str(user.get("approved_by_manager_id"))
                if user.get("approved_by_manager_id") else None
            ),
            "kyc_source": "MANAGER_DRAFT" if draft_active else "SUBMITTED",
            "kyc_draft_updated_at": (
                user.get("kyc_review_draft_updated_at").isoformat()
                if user.get("kyc_review_draft_updated_at") else None
            ),
            "kyc_edit_request": {
                "requested": bool(user.get("kyc_edit_requested")),
                "reason": user.get("kyc_edit_request_reason"),
                "requested_at": (
                    user.get("kyc_edit_requested_at").isoformat()
                    if user.get("kyc_edit_requested_at") else None
                ),
            },

            "kyc": {
                "aadhaar": self._mask_aadhaar(effective_aadhaar),
                "pan": self._mask_pan(effective_pan),
                "dob": effective_dob.isoformat() if effective_dob else None,
                "gender": effective_gender,
                "occupation": effective_occupation,
                "address": effective_address,
                "nominee": effective_nominee,
                "guarantor": effective_guarantor
            } if user.get("kyc_status") == KYCStatus.COMPLETED else None
        }

    # =====================================================
    # KYC EDIT REQUEST (USER -> BANK MANAGER)
    # =====================================================
    async def request_kyc_edit(self, user_id: str, reason: str):
        user = await self.repo.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if not reason or not str(reason).strip():
            raise ValueError("Reason is required")

        await self.repo.collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "kyc_edit_requested": True,
                    "kyc_edit_request_reason": reason.strip(),
                    "kyc_edit_requested_at": datetime.utcnow(),
                    "kyc_edit_requested_by": ObjectId(user_id),
                    "updated_at": datetime.utcnow(),
                }
            }
        )

    # =====================================================
    # MASKING HELPERS
    # =====================================================
    def _mask_aadhaar(self, aadhaar: str | None):
        if not aadhaar:
            return None
        return "XXXX-XXXX-" + aadhaar[-4:]

    def _mask_pan(self, pan: str | None):
        if not pan:
            return None
        return pan[:2] + "XXXXX" + pan[-1]
