import { useEffect, useMemo, useState } from "react";
import { Save, X } from "lucide-react";
import { UserService } from "../../services/user.service";
import type { User } from "../../types/user";
import { useToast } from "../../context/ToastContext";
import { aadhaarDigits, formatAadhaar, isValidAadhaarDigits } from "../../utils/aadhaar";
import ConfirmModal from "../../components/common/ConfirmModal";
import { DocumentService } from "../../services/document.service";
import type { IdentityDocType, IdentityDocument } from "../../services/document.service";
import ContactBankManager from "../../components/user/ContactBankManager";

const relations = ["Father", "Mother", "Spouse", "Brother", "Sister", "Other"];
const occupationOptions = [
  "Employee",
  "Government Job",
  "Private Job",
  "IT",
  "Business Owner",
  "Self Employed",
  "Professional",
  "Doctor",
  "Engineer",
  "Teacher",
  "Lawyer",
  "Nurse",
  "Farmer",
  "Student",
  "Freelancer",
  "Retired",
  "Homemaker",
] as const;

const indianStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

const stateNameByLower = new Map(indianStates.map((s) => [s.toLowerCase(), s]));

type ProfileForm = {
  aadhaar: string;
  pan: string;
  dob: string;
  gender: "" | "MALE" | "FEMALE" | "OTHER";
  occupation: string;
  address: {
    line1: string;
    city: string;
    state: string;
    pincode: string;
  };
  nominee: {
    name: string;
    relation: string;
  };
  guarantor: {
    name: string;
    relation: string;
    contact_no: string;
  };
};

const emptyForm: ProfileForm = {
  aadhaar: "",
  pan: "",
  dob: "",
  gender: "",
  occupation: "",
  address: {
    line1: "",
    city: "",
    state: "",
    pincode: "",
  },
  nominee: {
    name: "",
    relation: "",
  },
  guarantor: {
    name: "",
    relation: "",
    contact_no: "",
  },
};

const formatDate = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN");
};

const valueOrDash = (value?: string) => {
  if (!value || !String(value).trim()) return "-";
  return value;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const maybe = error as { response?: { data?: { detail?: string } } };
  return maybe?.response?.data?.detail || fallback;
};

const UserProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editRequestOpen, setEditRequestOpen] = useState(false);
  const [editRequestReason, setEditRequestReason] = useState("");
  const [editRequestSubmitting, setEditRequestSubmitting] = useState(false);
  const [documents, setDocuments] = useState<IdentityDocument[]>([]);
  const [docType, setDocType] = useState<IdentityDocType>("AADHAAR");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docDeletingId, setDocDeletingId] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [kycAcceptanceChecked, setKycAcceptanceChecked] = useState(false);
  const [occupationChoice, setOccupationChoice] = useState<string>("");

  const toast = useToast();

  const applyUserToForm = (u: User) => {
    const last = localStorage.getItem("last_user_aadhaar") || "";
    const occ = (u.occupation || "").trim();
    const isPreset = occupationOptions.some((o) => o.toLowerCase() === occ.toLowerCase());

    setOccupationChoice(occ ? (isPreset ? occupationOptions.find((o) => o.toLowerCase() === occ.toLowerCase()) || "OTHER" : "OTHER") : "");
    setForm({
      aadhaar: last ? formatAadhaar(last) : "",
      pan: u.pan || "",
      dob: u.dob ? u.dob.split("T")[0] : "",
      gender: (u.gender || "") as ProfileForm["gender"],
      occupation: u.occupation || "",
      address: {
        line1: u.address?.line1 || "",
        city: u.address?.city || "",
        state: u.address?.state || "",
        pincode: u.address?.pincode || "",
      },
      nominee: {
        name: u.nominee?.name || "",
        relation: u.nominee?.relation || "",
      },
      guarantor: {
        name: u.guarantor?.name || "",
        relation: u.guarantor?.relation || "",
        contact_no: u.guarantor?.contact_no || "",
      },
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const u = await UserService.getMyFullDetails();
        setUser(u);
        applyUserToForm(u);
        try {
          const docs = await DocumentService.listMyIdentityDocuments();
          setDocuments(docs);
        } catch {
          setDocuments([]);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const isLocked = useMemo(() => user?.accountStatus === "APPROVED", [user]);
  const isFirstKycSubmission = user?.kycStatus !== "COMPLETED";
  const canManageKycDocs = !isLocked;
  const uploadedDocTypes = useMemo(
    () => new Set(documents.map((d) => String(d.doc_type || "").toUpperCase())),
    [documents]
  );
  const hasMandatoryDocs = useMemo(() => {
    const requiredAnyOf = ["AADHAAR", "PAN", "DRIVING_LICENCE"];
    return requiredAnyOf.some((d) => uploadedDocTypes.has(d));
  }, [uploadedDocTypes]);
  const selectedDocAlreadyUploaded = uploadedDocTypes.has(docType);

  useEffect(() => {
    if (!canManageKycDocs) return;
    // default to Aadhaar (or first choice); user can upload any one identity doc now.
    setDocType((prev) => prev || ("AADHAAR" as IdentityDocType));
  }, [canManageKycDocs]);

  const handleSave = async () => {
    if (!user) {
      toast.push({ type: "error", message: "Unable to save: user not loaded" });
      return;
    }
    if (isLocked) {
      toast.push({ type: "error", message: "Profile is locked after Bank Manager approval" });
      return;
    }

    if (isFirstKycSubmission) {
      if (!isValidAadhaarDigits(form.aadhaar)) {
        toast.push({ type: "error", message: "Enter Aadhaar in XXXX XXXX XXXX format" });
        return;
      }
      if (!kycAcceptanceChecked) {
        toast.push({
          type: "error",
          message: "Please accept the KYC declaration before submitting.",
        });
        return;
      }
      if (!hasMandatoryDocs) {
        toast.push({
          type: "error",
          message: "Upload at least one identity document (AADHAAR / PAN / DRIVING_LICENCE) before KYC submission.",
        });
        return;
      }
    }

    if (!form.pan.trim()) {
      toast.push({ type: "error", message: "PAN is required" });
      return;
    }
    if (!form.dob) {
      toast.push({ type: "error", message: "DOB is required" });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dob)) {
      toast.push({ type: "error", message: "DOB must be in YYYY-MM-DD format with a 4-digit year" });
      return;
    }
    if (!form.gender) {
      toast.push({ type: "error", message: "Gender is required" });
      return;
    }
    if (!form.occupation.trim()) {
      toast.push({ type: "error", message: "Occupation is required" });
      return;
    }
    if (form.occupation.trim().length < 2 || form.occupation.trim().length > 15) {
      toast.push({ type: "error", message: "Occupation must be between 2 and 15 characters" });
      return;
    }
    if (!/^[A-Za-z0-9]{10}$/.test(form.pan.trim())) {
      toast.push({ type: "error", message: "PAN must be exactly 10 alphanumeric characters" });
      return;
    }
    if (!form.address.line1.trim()) {
      toast.push({ type: "error", message: "Address line is required" });
      return;
    }
    if (!form.address.city.trim()) {
      toast.push({ type: "error", message: "Address city is required" });
      return;
    }

    const normalizedState =
      stateNameByLower.get((form.address.state || "").trim().toLowerCase()) || "";
    if (!normalizedState) {
      toast.push({ type: "error", message: "Please select a valid state from the dropdown" });
      return;
    }
    if (!form.address.pincode.trim()) {
      toast.push({ type: "error", message: "Address pincode is required" });
      return;
    }
    if (!/^\d{6}$/.test(form.address.pincode.trim())) {
      toast.push({ type: "error", message: "Address pincode must be exactly 6 digits" });
      return;
    }
    if (!form.nominee.name.trim() || !form.nominee.relation.trim()) {
      toast.push({ type: "error", message: "Nominee details are required" });
      return;
    }
    if (form.nominee.name.trim().length < 4 || form.nominee.name.trim().length > 20) {
      toast.push({ type: "error", message: "Nominee name must be between 4 and 20 characters" });
      return;
    }
    if (
      !form.guarantor.name.trim() ||
      !form.guarantor.relation.trim() ||
      !form.guarantor.contact_no.trim()
    ) {
      toast.push({ type: "error", message: "Guarantor details are required" });
      return;
    }
    if (form.guarantor.name.trim().length < 4 || form.guarantor.name.trim().length > 20) {
      toast.push({ type: "error", message: "Guarantor name must be between 4 and 20 characters" });
      return;
    }
    if (!/^\d{10}$/.test(form.guarantor.contact_no.trim())) {
      toast.push({ type: "error", message: "Guarantor contact number must be exactly 10 digits" });
      return;
    }

    try {
      setSaving(true);
      const aadhaarRaw = isFirstKycSubmission ? aadhaarDigits(form.aadhaar) : "";
      // Store canonical state name (proper casing) before sending.
      const payloadForm = {
        ...form,
        gender: form.gender as "MALE" | "FEMALE" | "OTHER",
        aadhaar: aadhaarRaw,
        address: {
          ...form.address,
          state: normalizedState,
        },
      };
      if (isFirstKycSubmission) {
        await UserService.submitKYC(payloadForm);
        localStorage.setItem("last_user_aadhaar", aadhaarRaw);
        toast.push({ type: "success", message: "KYC submitted successfully. Waiting for Bank Manager approval." });
      } else {
        await UserService.updateProfile(payloadForm);
        toast.push({ type: "success", message: "Profile updated successfully" });
      }
      const updated = await UserService.getMyFullDetails();
      setUser(updated);
      applyUserToForm(updated);
    } catch (error: unknown) {
      const maybe = error as { response?: { data?: { detail?: string } } };
      toast.push({
        type: "error",
        message: maybe?.response?.data?.detail || "Failed to update profile",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      applyUserToForm(user);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-600">Loading profile...</div>;
  }

  if (!user) {
    return <div className="p-6 text-red-600">Unable to load profile.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {user.kycStatus !== "COMPLETED" && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          Please complete KYC now. Upload real and valid documents. Documents remain editable until Bank Manager approval.
        </div>
      )}
      {user.kycStatus === "COMPLETED" && user.accountStatus === "PENDING" && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          KYC completed. Your account is waiting for Bank Manager approval.
        </div>
      )}
      {user.kycStatus === "COMPLETED" && user.accountStatus === "APPROVED" && user.has_digi_pin === false && (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Account approved. Please set DigiPIN from Dashboard to start transactions.
        </div>
      )}
      {user.accountStatus === "REJECTED" && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          KYC/Profile rejected by Bank Manager. Update editable fields and save again.
        </div>
      )}

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-lg">
              {(user.name || "U").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
              <p className="text-sm text-gray-500">
                View account details and edit only allowed fields
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
            <p className="mt-1 font-semibold text-gray-900">{valueOrDash(user.name)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
            <p className="mt-1 font-semibold text-gray-900">{valueOrDash(user.phone)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Aadhaar</p>
            <p className="mt-1 font-semibold text-gray-900">{valueOrDash(user.aadhaar)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">KYC Status</p>
            <p className="mt-1 font-semibold text-gray-900">{valueOrDash(user.kycStatus)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Account Status</p>
            <p className="mt-1 font-semibold text-gray-900">{valueOrDash(user.accountStatus)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Created On</p>
            <p className="mt-1 font-semibold text-gray-900">{formatDate(user.createdAt)}</p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Personal Details</h2>
        </div>

        {!isLocked ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user.kycStatus !== "COMPLETED" && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar (12 digits for KYC submit)</label>
                <input
                  value={form.aadhaar}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, aadhaar: formatAadhaar(e.target.value) }))
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="XXXX XXXX XXXX"
                  inputMode="numeric"
                  maxLength={14}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
              <input
                value={form.pan}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pan: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10),
                  }))
                }
                className="w-full border rounded-lg px-3 py-2"
                minLength={10}
                maxLength={10}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DOB</label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => setForm((prev) => ({ ...prev, dob: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                max="9999-12-31"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={form.gender}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, gender: e.target.value as ProfileForm["gender"] }))
                }
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
              <select
                value={occupationChoice}
                onChange={(e) => {
                  const selected = e.target.value;
                  setOccupationChoice(selected);
                  if (selected === "OTHER") {
                    setForm((prev) => ({ ...prev, occupation: "" }));
                    return;
                  }
                  setForm((prev) => ({ ...prev, occupation: selected }));
                }}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select occupation</option>
                {occupationOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
                <option value="OTHER">Other</option>
              </select>
              {occupationChoice === "OTHER" && (
                <input
                  value={form.occupation}
                  onChange={(e) => setForm((prev) => ({ ...prev, occupation: e.target.value.slice(0, 15) }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Type your occupation"
                  minLength={2}
                  maxLength={15}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-xs text-gray-500">PAN</p>
              <p className="font-medium text-gray-900 mt-1">{valueOrDash(form.pan)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-xs text-gray-500">DOB</p>
              <p className="font-medium text-gray-900 mt-1">
                {form.dob ? formatDate(form.dob) : "-"}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Gender</p>
              <p className="font-medium text-gray-900 mt-1">{valueOrDash(form.gender)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Occupation</p>
              <p className="font-medium text-gray-900 mt-1">{valueOrDash(form.occupation)}</p>
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Address</h3>
          </div>

          {!isLocked ? (
            <div className="space-y-3">
              <input
                placeholder="Address line"
                value={form.address.line1}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    address: { ...prev.address, line1: e.target.value },
                  }))
                }
                className="w-full border rounded-lg px-3 py-2"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  placeholder="City"
                  value={form.address.city}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value },
                    }))
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
                <div className="relative">
                  <input
                    placeholder="State"
                    value={form.address.state}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        address: { ...prev.address, state: e.target.value },
                      }))
                    }
                    onFocus={() => setStateDropdownOpen(true)}
                    onBlur={() => {
                      // Allow click selection before closing.
                      window.setTimeout(() => setStateDropdownOpen(false), 120);
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                    autoComplete="off"
                  />
                  {stateDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-sm max-h-56 overflow-auto">
                      {(() => {
                        const value = form.address.state?.trim().toLowerCase() || "";
                        const list =
                          value === ""
                            ? indianStates
                            : indianStates.filter((s) =>
                                s.toLowerCase().startsWith(value)
                              );

                        return list.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onMouseDown={() => {
                              setForm((prev) => ({
                                ...prev,
                                address: { ...prev.address, state: s },
                              }));
                              setStateDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                          >
                            {s}
                          </button>
                        ));
                      })()}
                    </div>
                  )}

                </div>
                <input
                  placeholder="Pincode"
                  value={form.address.pincode}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      address: { ...prev.address, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) },
                    }))
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  maxLength={6}
                  inputMode="numeric"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-medium text-gray-900">{valueOrDash(form.address.line1)}</p>
              <p className="text-gray-700">
                {[form.address.city, form.address.state, form.address.pincode]
                  .filter((x) => x && x.trim())
                  .join(", ") || "-"}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nominee</h3>
            </div>

            {!isLocked ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="Nominee name"
                  value={form.nominee.name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      nominee: { ...prev.nominee, name: e.target.value },
                    }))
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  minLength={4}
                  maxLength={20}
                />
                <select
                  value={form.nominee.relation}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      nominee: { ...prev.nominee, relation: e.target.value },
                    }))
                  }
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Relation</option>
                  {relations.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-900 font-medium">{valueOrDash(form.nominee.name)}</p>
                <p className="text-gray-700">{valueOrDash(form.nominee.relation)}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Guarantor</h3>
            </div>

            {!isLocked ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  placeholder="Guarantor name"
                  value={form.guarantor.name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      guarantor: { ...prev.guarantor, name: e.target.value },
                    }))
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  minLength={4}
                  maxLength={20}
                />
                <select
                  value={form.guarantor.relation}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      guarantor: { ...prev.guarantor, relation: e.target.value },
                    }))
                  }
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Relation</option>
                  {relations.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Contact number"
                  value={form.guarantor.contact_no}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      guarantor: { ...prev.guarantor, contact_no: e.target.value.replace(/\D/g, "").slice(0, 10) },
                    }))
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  maxLength={10}
                  inputMode="numeric"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-900 font-medium">{valueOrDash(form.guarantor.name)}</p>
                <p className="text-gray-700">
                  {valueOrDash(form.guarantor.relation)} | {valueOrDash(form.guarantor.contact_no)}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents</h2>

        {canManageKycDocs && (
          <div className="space-y-3 mb-5">
            {!hasMandatoryDocs && isFirstKycSubmission && (
              <div className="rounded border border-blue-200 bg-blue-50 p-2 text-sm text-blue-800">
                Mandatory documents pending: <strong>Upload any one of AADHAAR / PAN / DRIVING_LICENCE</strong>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as IdentityDocType)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="AADHAAR">Aadhaar (Identity)</option>
                <option value="PAN">PAN (Identity)</option>
                <option value="DRIVING_LICENCE">Driving Licence (Identity)</option>
              </select>

              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                onChange={(e) => {
                  setDocError(null);
                  setDocFile(e.target.files?.[0] || null);
                }}
                className="w-full border rounded-lg px-3 py-2"
                disabled={docUploading}
              />

              <button
                type="button"
                onClick={async () => {
                  if (selectedDocAlreadyUploaded) {
                    setDocError(
                      `${docType} document is already uploaded. Please choose a different document type.`
                    );
                    return;
                  }
                  if (!docFile) {
                    setDocError("Please choose a file to upload");
                    return;
                  }
                  try {
                    setDocUploading(true);
                    setDocError(null);
                    await DocumentService.uploadIdentityDocument(docType, docFile);
                    const docs = await DocumentService.listMyIdentityDocuments();
                    setDocuments(docs);
                    setDocFile(null);
                    toast.push({ type: "success", message: "Document uploaded" });
                  } catch (e: unknown) {
                    setDocError(getErrorMessage(e, "Upload failed"));
                  } finally {
                    setDocUploading(false);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                disabled={docUploading || selectedDocAlreadyUploaded}
              >
                {docUploading ? "Uploading..." : "Upload"}
              </button>
            </div>
            {docFile && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-700 truncate max-w-[70%]">{docFile.name}</span>
                <button
                  type="button"
                  className="px-3 py-1 border rounded"
                  onClick={() => {
                    const url = URL.createObjectURL(docFile);
                    window.open(url, "_blank", "noopener,noreferrer");
                    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
                  }}
                >
                  View Before Upload
                </button>
              </div>
            )}
            {selectedDocAlreadyUploaded && (
              <div className="text-sm text-amber-700">
                {docType} is already uploaded. Select another type.
              </div>
            )}
            {docError && <div className="text-sm text-red-600">{docError}</div>}
            <div className="text-xs text-gray-500">
              Allowed: PDF, DOC, DOCX, JPG, JPEG, PNG (max 10MB). Mandatory before KYC submit: upload any one identity document.
            </div>
          </div>
        )}
        {!canManageKycDocs && (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Documents are locked after Bank Manager approval and cannot be edited.
          </div>
        )}

        <div className="overflow-x-auto border rounded-lg">
          {documents.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No documents uploaded yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">File</th>
                  <th className="px-3 py-2 text-left">Uploaded At</th>
                  <th className="px-3 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.document_id} className="border-t">
                    <td className="px-3 py-2">{d.doc_type}</td>
                    <td className="px-3 py-2">{d.original_name}</td>
                    <td className="px-3 py-2">
                      {d.uploaded_at ? new Date(d.uploaded_at).toLocaleString("en-IN") : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const blob = await DocumentService.fetchDocumentBlob(d.document_id);
                            const url = URL.createObjectURL(blob);
                            window.open(url, "_blank", "noopener,noreferrer");
                            window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
                          }}
                          className="px-3 py-1 border rounded"
                        >
                          View
                        </button>
                        {canManageKycDocs && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                setDocDeletingId(d.document_id);
                                setDocError(null);
                                await DocumentService.deleteIdentityDocument(d.document_id);
                                const docs = await DocumentService.listMyIdentityDocuments();
                                setDocuments(docs);
                                toast.push({ type: "success", message: "Document deleted" });
                              } catch (e: unknown) {
                                setDocError(getErrorMessage(e, "Failed to delete document"));
                              } finally {
                                setDocDeletingId(null);
                              }
                            }}
                            className="px-3 py-1 border border-red-300 text-red-700 rounded disabled:opacity-50"
                            disabled={docDeletingId === d.document_id || docUploading}
                          >
                            {docDeletingId === d.document_id ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {isLocked && (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Your account is approved and your profile is now locked. To request changes, contact your Bank Manager using the Contact button.
        </div>
      )}
      {isLocked && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Need a profile/KYC edit?</p>
              {user.kycEditRequested ? (
                <p className="text-sm text-blue-900">
                  Edit request submitted.
                  {user.kycEditRequestedAt ? ` (${new Date(user.kycEditRequestedAt).toLocaleString("en-IN")})` : ""}
                </p>
              ) : (
                <p className="text-sm text-blue-900">Send a request to your Bank Manager.</p>
              )}
              {user.kycEditRequested && user.kycEditRequestReason && (
                <p className="text-sm text-blue-900">Reason: {user.kycEditRequestReason}</p>
              )}
            </div>
            {!user.kycEditRequested && (
              <button
                type="button"
                onClick={() => {
                  setEditRequestReason("");
                  setEditRequestOpen(true);
                }}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Request KYC Edit
              </button>
            )}
          </div>
        </div>
      )}

      {isFirstKycSubmission && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">KYC Acceptance</h3>
          <label className="flex items-start gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={kycAcceptanceChecked}
              onChange={(e) => setKycAcceptanceChecked(e.target.checked)}
              className="mt-1"
            />
            <span>I confirm that the information provided is true and correct.</span>
          </label>
          <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
            <li>All fields are mandatory for KYC submission.</li>
            <li>Documents upload is mandatory.</li>
            <li>Documents can be edited/deleted until Bank Manager approval.</li>
            <li>Upload real documents only.</li>
            <li>Process moves forward after Bank Manager approval.</li>
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3 justify-end">
        {!isLocked && (
          <button
            onClick={handleCancel}
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <X size={16} />
            Cancel
          </button>
        )}
        <button
          onClick={() => {
            if (isLocked) return;
            if (user.kycStatus !== "COMPLETED") {
              setConfirmOpen(true);
              return;
            }
            void handleSave();
          }}
          disabled={saving || isLocked}
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "Saving..." : user.kycStatus !== "COMPLETED" ? "Submit KYC" : "Save Changes"}
        </button>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        title="Confirm KYC Submission"
        message="Please confirm that all details are correct. You can edit until Bank Manager approves your account. After approval, changes will be locked."
        confirmLabel="Yes, Submit KYC"
        loading={saving}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          await handleSave();
        }}
      />

      {editRequestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Request KYC Edit</h3>
              <button
                type="button"
                onClick={() => setEditRequestOpen(false)}
                className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100"
              >
                x
              </button>
            </div>
            <div className="p-4">
              <label className="text-sm font-medium text-gray-700">Reason (required)</label>
              <textarea
                value={editRequestReason}
                onChange={(e) => setEditRequestReason(e.target.value)}
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                rows={4}
                placeholder="Explain what needs to be corrected in your KYC details."
              />
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!editRequestReason.trim()) {
                      toast.push({ type: "error", message: "Reason is required" });
                      return;
                    }
                    try {
                      setEditRequestSubmitting(true);
                      await UserService.requestKycEdit(editRequestReason.trim());
                      const updated = await UserService.getMyFullDetails();
                      setUser(updated);
                      applyUserToForm(updated);
                      setEditRequestOpen(false);
                      toast.push({ type: "success", message: "Edit request submitted" });
                    } catch (e: unknown) {
                      toast.push({ type: "error", message: getErrorMessage(e, "Failed to submit request") });
                    } finally {
                      setEditRequestSubmitting(false);
                    }
                  }}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={editRequestSubmitting}
                >
                  {editRequestSubmitting ? "Submitting..." : "Submit Request"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditRequestOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700"
                  disabled={editRequestSubmitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ContactBankManager enabled={Boolean(user.approvedByManagerId)} />
    </div>
  );
};

export default UserProfile;
