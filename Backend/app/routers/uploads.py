from __future__ import annotations

from datetime import datetime
from pathlib import Path
from uuid import uuid4

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, Request
from fastapi.responses import FileResponse

from app.auth.dependencies import get_current_user, AuthContext
from app.enums.role import Role
from app.db.mongodb import db
from app.enums.user import UserApprovalStatus
from app.services.income_slip_parser_service import IncomeSlipParserService


router = APIRouter(prefix="/uploads", tags=["Uploads"])
income_slip_parser = IncomeSlipParserService()

ALLOWED_IDENTITY_DOCS = ("AADHAAR", "PAN", "DRIVING_LICENCE")
ALLOWED_IDENTITY_CONTENT_TYPES = (
    "application/pdf",
    "application/x-pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/jpg",
    "image/png",
)


def _upload_root() -> Path:
    # Stored outside app package to avoid accidental packaging as code.
    return Path(__file__).resolve().parents[2] / "uploads"

def _safe_ext(filename: str) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return ".pdf"
    if name.endswith(".docx"):
        return ".docx"
    if name.endswith(".doc"):
        return ".doc"
    if name.endswith(".jpeg"):
        return ".jpeg"
    if name.endswith(".jpg"):
        return ".jpg"
    if name.endswith(".png"):
        return ".png"
    return ""


@router.post("/income-slip", status_code=status.HTTP_201_CREATED)
async def upload_income_slip(
    request: Request,
    file: UploadFile = File(...),
    auth: AuthContext = Depends(get_current_user),
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing file")

    # Basic validation for PDF
    if file.content_type not in ("application/pdf", "application/x-pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max file size is 5MB")

    # Create folder per user id
    root = _upload_root()
    user_dir = root / "income_slips" / str(auth.user_id)
    user_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename = f"{stamp}_{uuid4().hex}.pdf"
    path = user_dir / filename
    path.write_bytes(content)

    public_path = f"/uploads/files/income-slips/{auth.user_id}/{filename}"
    base = str(request.base_url).rstrip("/")
    extracted_monthly_income = income_slip_parser.extract_monthly_income_from_pdf(content)
    extraction_status = "FOUND" if extracted_monthly_income is not None else "NOT_FOUND"
    extraction_message = (
        "Gross salary extracted from payslip."
        if extracted_monthly_income is not None
        else "Could not extract gross salary from this payslip. Please upload another payslip PDF."
    )

    return {
        "file_name": filename,
        "url": f"{base}{public_path}",
        "extracted_monthly_income": extracted_monthly_income,
        "extraction_status": extraction_status,
        "extraction_message": extraction_message,
    }

@router.post("/identity-document", status_code=status.HTTP_201_CREATED)
async def upload_identity_document(
    request: Request,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    auth: AuthContext = Depends(get_current_user),
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    user = await db.users.find_one({"_id": ObjectId(str(auth.user_id))}, {"approval_status": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("approval_status") == UserApprovalStatus.APPROVED:
        raise HTTPException(
            status_code=400,
            detail="Identity documents are locked after Bank Manager approval and cannot be edited",
        )

    doc_type_norm = (doc_type or "").strip().upper()
    if doc_type_norm not in ALLOWED_IDENTITY_DOCS:
        raise HTTPException(status_code=400, detail="Invalid document type")

    existing_doc = await db.user_documents.find_one(
        {"user_id": ObjectId(str(auth.user_id)), "doc_type": doc_type_norm},
        {"_id": 1}
    )
    if existing_doc:
        raise HTTPException(
            status_code=400,
            detail=f"{doc_type_norm} document already uploaded. Editing/re-upload is not allowed.",
        )

    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing file")

    if file.content_type not in ALLOWED_IDENTITY_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Allowed: pdf, doc, docx, jpg, jpeg, png",
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max file size is 10MB")

    ext = _safe_ext(file.filename)
    if not ext:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file extension. Allowed: pdf, doc, docx, jpg, jpeg, png",
        )

    root = _upload_root()
    user_dir = root / "identity_docs" / str(auth.user_id) / doc_type_norm.lower()
    user_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    stored_name = f"{stamp}_{uuid4().hex}{ext}"
    path = user_dir / stored_name
    path.write_bytes(content)

    doc = {
        "user_id": ObjectId(str(auth.user_id)),
        "doc_type": doc_type_norm,
        "original_name": file.filename,
        "stored_name": stored_name,
        "content_type": file.content_type,
        "relative_path": str(Path("identity_docs") / str(auth.user_id) / doc_type_norm.lower() / stored_name),
        "uploaded_at": datetime.utcnow(),
    }
    result = await db.user_documents.insert_one(doc)

    base = str(request.base_url).rstrip("/")
    return {
        "document_id": str(result.inserted_id),
        "doc_type": doc_type_norm,
        "original_name": file.filename,
        "uploaded_at": doc["uploaded_at"].isoformat(),
        "url": f"{base}/uploads/identity-docs/{result.inserted_id}",
    }


@router.delete("/identity-docs/{document_id}", status_code=status.HTTP_200_OK)
async def delete_identity_document(
    document_id: str,
    auth: AuthContext = Depends(get_current_user),
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    if not ObjectId.is_valid(document_id):
        raise HTTPException(status_code=404, detail="Document not found")

    user = await db.users.find_one({"_id": ObjectId(str(auth.user_id))}, {"approval_status": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("approval_status") == UserApprovalStatus.APPROVED:
        raise HTTPException(
            status_code=400,
            detail="Identity documents are locked after Bank Manager approval and cannot be deleted",
        )

    doc = await db.user_documents.find_one({"_id": ObjectId(document_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if str(doc.get("user_id")) != str(auth.user_id):
        raise HTTPException(status_code=403, detail="Access denied")

    root = _upload_root()
    rel = doc.get("relative_path") or ""
    path = root / rel
    if path.exists() and path.is_file():
        try:
            path.unlink()
        except Exception:
            # Keep API resilient: DB document removal is the source of truth.
            pass

    await db.user_documents.delete_one({"_id": ObjectId(document_id)})
    return {"message": "Document deleted successfully"}


@router.get("/identity-documents")
async def list_identity_documents(
    request: Request,
    auth: AuthContext = Depends(get_current_user),
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    cursor = db.user_documents.find({"user_id": ObjectId(str(auth.user_id))}).sort("uploaded_at", -1)
    items = []
    async for d in cursor:
        items.append({
            "document_id": str(d["_id"]),
            "doc_type": d.get("doc_type"),
            "original_name": d.get("original_name"),
            "content_type": d.get("content_type"),
            "uploaded_at": d.get("uploaded_at").isoformat() if d.get("uploaded_at") else None,
        })

    base = str(request.base_url).rstrip("/")
    return {
        "documents": [
            {**it, "url": f"{base}/uploads/identity-docs/{it['document_id']}"}
            for it in items
        ]
    }


@router.get("/identity-docs/{document_id}")
async def get_identity_document(
    document_id: str,
    auth: AuthContext = Depends(get_current_user),
):
    # USER can view own docs; BANK_MANAGER / ADMIN can view any (for KYC review).
    if auth.role not in (Role.USER, Role.BANK_MANAGER, Role.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")

    if not ObjectId.is_valid(document_id):
        raise HTTPException(status_code=404, detail="File not found")

    doc = await db.user_documents.find_one({"_id": ObjectId(document_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="File not found")

    if auth.role == Role.USER and str(doc["user_id"]) != str(auth.user_id):
        raise HTTPException(status_code=403, detail="Access denied")

    root = _upload_root()
    rel = doc.get("relative_path") or ""
    path = root / rel
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=str(path),
        media_type=doc.get("content_type") or "application/octet-stream",
        filename=doc.get("original_name") or path.name,
    )


@router.get("/files/income-slips/{user_id}/{file_name}")
async def get_income_slip(
    user_id: str,
    file_name: str,
    auth: AuthContext = Depends(get_current_user),
):
    # Allow users to access their own documents and loan managers/bank managers to access for review
    if auth.role == Role.USER:
        if str(auth.user_id) != str(user_id):
            raise HTTPException(status_code=403, detail="Access denied")
    elif auth.role not in (Role.LOAN_MANAGER, Role.BANK_MANAGER, Role.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")

    root = _upload_root()
    path = root / "income_slips" / str(user_id) / file_name
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=str(path),
        media_type="application/pdf",
        filename=file_name,
    )


@router.delete("/income-slip/{file_name}", status_code=status.HTTP_200_OK)
async def delete_income_slip(
    file_name: str,
    auth: AuthContext = Depends(get_current_user),
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    if not file_name or "/" in file_name or "\\" in file_name:
        raise HTTPException(status_code=400, detail="Invalid file name")

    root = _upload_root()
    path = root / "income_slips" / str(auth.user_id) / file_name
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Income slip file not found")

    try:
        path.unlink()
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to delete income slip file")

    return {"message": "Income slip deleted successfully"}
