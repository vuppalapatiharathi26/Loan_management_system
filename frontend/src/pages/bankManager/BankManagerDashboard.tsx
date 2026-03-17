import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BankManagerService, type AccountDetails, type ManagerProfile } from "../../services/bankManager.service";
import { AuthService } from "../../services/auth.service";
import monifyLogo from "../../assets/monify-logo.png";
import { useToast } from "../../context/ToastContext";
// import Footer from "../../components/common/Footer";

import { QueryService, type ManagerNotificationItem, type QueryMessage } from "../../services/query.service";

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "DELETED";
type KYCStatus = "PENDING" | "COMPLETED";

type BankUserRow = {
  user_id: string;
  name: string;
  phone?: string;
  kyc_status?: KYCStatus;
  approval_status?: ApprovalStatus;
  is_minor?: boolean;
  aadhaar?: string;
  deletion_requested?: boolean;
  kyc_edit_requested?: boolean;
  kyc_edit_request_reason?: string;
  kyc_edit_requested_at?: string;
  created_at?: string;
};

type UserDetails = {
  user_id: string;
  name: string;
  phone?: string;
  kyc_status?: KYCStatus;
  approval_status?: ApprovalStatus;
  is_minor?: boolean;
  aadhaar?: string;
  pan?: string;
  dob?: string;
  gender?: string;
  occupation?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  kyc_edit_request?: {
    requested?: boolean;
    reason?: string;
    requested_at?: string;
  };
  account_number?: string;
  ifsc_code?: string;
  created_at?: string;
  updated_at?: string;
};

type KYCDetails = {
  user_id: string;
  name: string;
  phone?: string;
  approval_status?: ApprovalStatus;
  approved_by_manager_id?: string | null;
  created_at?: string;
  kyc_draft?: {
    aadhaar?: string;
    pan?: string;
    dob?: string;
    gender?: string;
    occupation?: string;
    address?: {
      line1?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
  };
  pending_account?: {
    account_number?: string;
    ifsc_code?: string;
    generated_at?: string;
    state?: string;
  };
  kyc_edit_request?: {
    requested?: boolean;
    reason?: string;
    requested_at?: string;
  };
  kyc?: {
    aadhaar?: string;
    pan?: string;
    dob?: string;
    gender?: string;
    occupation?: string;
    address?: {
      line1?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
  };
};

type KycDraftForm = {
  aadhaar: string;
  pan: string;
  dob: string;
  gender: string;
  occupation: string;
  address: {
    line1: string;
    city: string;
    state: string;
    pincode: string;
  };
};

const VALID_GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
const PAN_REGEX = /^[A-Z0-9]{10}$/;
const PINCODE_REGEX = /^\d{6}$/;
const INDIAN_STATES = [
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
const STATE_IFSC_SUFFIX: Record<string, string> = {
  "Andhra Pradesh": "000001",
  "Arunachal Pradesh": "000002",
  "Assam": "000003",
  "Bihar": "000004",
  "Chhattisgarh": "000005",
  "Goa": "000006",
  "Gujarat": "000007",
  "Haryana": "000008",
  "Himachal Pradesh": "000009",
  "Jharkhand": "000010",
  "Karnataka": "000011",
  "Kerala": "000012",
  "Madhya Pradesh": "000013",
  "Maharashtra": "000014",
  "Manipur": "000015",
  "Meghalaya": "000016",
  "Mizoram": "000017",
  "Nagaland": "000018",
  "Odisha": "000019",
  "Punjab": "000020",
  "Rajasthan": "000021",
  "Sikkim": "000022",
  "Tamil Nadu": "000023",
  "Telangana": "000024",
  "Tripura": "000025",
  "Uttar Pradesh": "000026",
  "Uttarakhand": "000027",
  "West Bengal": "000028",
};

const getIfscForState = (state: string) => {
  const suffix = STATE_IFSC_SUFFIX[(state || "").trim()];
  return suffix ? `MONI0${suffix}` : "";
};

const normalizeDraft = (draft: KycDraftForm): KycDraftForm => ({
  aadhaar: (draft.aadhaar || "").replace(/\D/g, ""),
  pan: (draft.pan || "").trim().toUpperCase(),
  dob: (draft.dob || "").trim(),
  gender: (draft.gender || "").trim().toUpperCase(),
  occupation: (draft.occupation || "").trim(),
  address: {
    line1: (draft.address?.line1 || "").trim(),
    city: (draft.address?.city || "").trim(),
    state: (draft.address?.state || "").trim(),
    pincode: (draft.address?.pincode || "").replace(/\D/g, ""),
  },
});

const validateDraft = (draft: KycDraftForm): { valid: boolean; message?: string; sanitized: KycDraftForm } => {
  const sanitized = normalizeDraft(draft);

  if (!/^\d{12}$/.test(sanitized.aadhaar)) {
    return { valid: false, message: "Aadhaar must be exactly 12 digits", sanitized };
  }
  if (!PAN_REGEX.test(sanitized.pan)) {
    return { valid: false, message: "PAN must be exactly 10 alphanumeric characters", sanitized };
  }
  if (!sanitized.dob) {
    return { valid: false, message: "DOB is required", sanitized };
  }

  const dobDate = new Date(sanitized.dob);
  if (Number.isNaN(dobDate.getTime())) {
    return { valid: false, message: "DOB is invalid", sanitized };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dobDate > today) {
    return { valid: false, message: "DOB cannot be a future date", sanitized };
  }

  if (!VALID_GENDERS.includes(sanitized.gender as typeof VALID_GENDERS[number])) {
    return { valid: false, message: "Please select a valid gender", sanitized };
  }
  if (sanitized.occupation.length < 2 || sanitized.occupation.length > 15) {
    return { valid: false, message: "Occupation must be between 2 and 15 characters", sanitized };
  }
  if (!sanitized.address.line1 || !sanitized.address.city || !sanitized.address.state) {
    return { valid: false, message: "Address line, city, and state are required", sanitized };
  }
  if (!PINCODE_REGEX.test(sanitized.address.pincode)) {
    return { valid: false, message: "Pincode must be exactly 6 digits", sanitized };
  }

  return { valid: true, sanitized };
};

type FilterState = {
  approval_status: "ALL" | ApprovalStatus;
  kyc_status: "ALL" | KYCStatus;
  deletion_requested: "ALL" | "YES" | "NO";
};
type DeleteActionMode = "DIRECT_DELETE" | "ESCALATION_APPROVE";

const initialFilters: FilterState = {
  approval_status: "ALL",
  kyc_status: "ALL",
  deletion_requested: "ALL",
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const formatAddress = (address?: {
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}) => {
  if (!address) return "-";
  return [address.line1, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(", ");
};

const toDateInputValue = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildDraft = (source?: {
  aadhaar?: string;
  pan?: string;
  dob?: string;
  gender?: string;
  occupation?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}): KycDraftForm => ({
  aadhaar: source?.aadhaar || "",
  pan: source?.pan || "",
  dob: toDateInputValue(source?.dob),
  gender: source?.gender || "",
  occupation: source?.occupation || "",
  address: {
    line1: source?.address?.line1 || "",
    city: source?.address?.city || "",
    state: source?.address?.state || "",
    pincode: source?.address?.pincode || "",
  },
});

const approvalBadgeClass = (status?: ApprovalStatus) => {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    case "DELETED":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
};

const kycBadgeClass = (status?: KYCStatus) => {
  return status === "COMPLETED"
    ? "bg-green-100 text-green-700"
    : "bg-amber-100 text-amber-700";
};

const BankManagerDashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState<BankUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [kycDetails, setKycDetails] = useState<KYCDetails | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [managerProfile, setManagerProfile] = useState<ManagerProfile | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<ManagerNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [chatUserId, setChatUserId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<QueryMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatSending, setChatSending] = useState(false);

  const [kycDraft, setKycDraft] = useState<KycDraftForm | null>(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);

  const [docPreviewOpen, setDocPreviewOpen] = useState(false);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [docPreviewType, setDocPreviewType] = useState<string | null>(null);
  const [docPreviewName, setDocPreviewName] = useState<string | null>(null);
  const [docPreviewLoading, setDocPreviewLoading] = useState(false);
  const [docPreviewError, setDocPreviewError] = useState<string | null>(null);

  const [approvalOpen, setApprovalOpen] = useState(false);
  const [accountDetails, setAccountDetails] = useState<AccountDetails | null>(null);
  const [accountGenerating, setAccountGenerating] = useState(false);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);

  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionApproved, setDecisionApproved] = useState(true);
  const [decisionReason, setDecisionReason] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteActionMode, setDeleteActionMode] = useState<DeleteActionMode>("DIRECT_DELETE");

  const selectedRow = useMemo(
    () => rows.find((r) => r.user_id === selectedUserId) ?? null,
    [rows, selectedUserId]
  );

  const stats = useMemo(() => {
    return {
      total: rows.length,
      pending: rows.filter((r) => r.approval_status === "PENDING").length,
      approved: rows.filter((r) => r.approval_status === "APPROVED").length,
      escalatedRequests: rows.filter((r) => r.deletion_requested).length,
    };
  }, [rows]);

  const fetchUsers = useCallback(async (showInitial = false) => {
    try {
      if (showInitial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const payload: {
        approval_status?: string;
        kyc_status?: string;
        deletion_requested?: boolean;
      } = {};

      if (filters.approval_status !== "ALL") {
        payload.approval_status = filters.approval_status;
      }
      if (filters.kyc_status !== "ALL") {
        payload.kyc_status = filters.kyc_status;
      }
      if (filters.deletion_requested !== "ALL") {
        payload.deletion_requested = filters.deletion_requested === "YES";
      }

      const data = await BankManagerService.listUsers(payload);
      setRows(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to load users";
      setError(typeof msg === "string" ? msg : "Failed to load users");
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  const refreshNotifications = useCallback(async () => {
    try {
      setNotificationLoading(true);
      const data = await QueryService.listManagerNotifications();
      setNotifications(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(typeof data.total_unread === "number" ? data.total_unread : 0);
    } catch (err) {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  const refreshChatMessages = useCallback(async (userId: string) => {
    try {
      setChatLoading(true);
      const msgs = await QueryService.listMessagesForUser(userId);
      setChatMessages(Array.isArray(msgs) ? msgs : []);
    } catch (err: any) {
      toast.push({ type: "error", message: err?.response?.data?.detail || "Failed to load messages" });
      setChatMessages([]);
    } finally {
      setChatLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers(true);
  }, [fetchUsers]);

  useEffect(() => {
    BankManagerService.getManagerProfile()
      .then((profile) => setManagerProfile(profile))
      .catch(() => setManagerProfile(null));
  }, []);

  useEffect(() => {
    refreshNotifications();
    const t = window.setInterval(() => void refreshNotifications(), 5000);
    return () => window.clearInterval(t);
  }, [refreshNotifications]);

  useEffect(() => {
    if (!selectedUserId) {
      setKycDraft(null);
      setDraftDirty(false);
      setAccountDetails(null);
      setApprovalConfirmed(false);
      return;
    }
    const source = kycDetails?.kyc_draft || kycDetails?.kyc || details || undefined;
    setKycDraft(buildDraft(source as any));
    setDraftDirty(false);
    setAccountDetails(kycDetails?.pending_account ? {
      account_number: kycDetails.pending_account.account_number || "",
      ifsc_code: kycDetails.pending_account.ifsc_code || "",
      generated_at: kycDetails.pending_account.generated_at,
      state: kycDetails.pending_account.state,
    } : null);
    setApprovalConfirmed(false);
  }, [selectedUserId, kycDetails, details]);

  useEffect(() => {
    if (!docPreviewOpen && docPreviewUrl) {
      URL.revokeObjectURL(docPreviewUrl);
      setDocPreviewUrl(null);
    }
  }, [docPreviewOpen, docPreviewUrl]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.name?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.user_id.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const total = filteredRows.length;
  const start = (page - 1) * pageSize;
  const displayed = filteredRows.slice(start, start + pageSize);

  const openDetails = async (userId: string) => {
    setSelectedUserId(userId);
    setDetails(null);
    setKycDetails(null);
    setDocPreviewOpen(false);
    setDocPreviewError(null);
    setApprovalOpen(false);
    setApprovalConfirmed(false);
    setAccountDetails(null);

    try {
      setModalLoading(true);
      const [detailsRes, kycRes] = await Promise.all([
        BankManagerService.getUserDetails(userId),
        BankManagerService.reviewKYC(userId).catch(() => null),
      ]);
      setDetails(detailsRes ?? null);
      setKycDetails(kycRes ?? null);
    } catch (err) {
      console.error("Failed to load user details", err);
      toast.push({ type: 'error', message: 'Failed to load user details' });
      setSelectedUserId(null);
    } finally {
      setModalLoading(false);
    }
  };

  const closeDetailsModal = () => {
    setSelectedUserId(null);
    setDetails(null);
    setKycDetails(null);
    setKycDraft(null);
    setDraftDirty(false);
    setAccountDetails(null);
    setApprovalConfirmed(false);
    setApprovalOpen(false);
    setDocPreviewOpen(false);
    setDocPreviewError(null);
    setDecisionOpen(false);
    setDeleteOpen(false);
    setDecisionReason("");
    setDeleteReason("");
    setDeleteActionMode("DIRECT_DELETE");
  };

  const submitDecision = async () => {
    if (!selectedUserId) return;

    if (!decisionApproved && !decisionReason.trim()) {
      toast.push({ type: 'error', message: 'Rejection reason is required' });
      return;
    }

    if (decisionApproved) {
      if (!accountDetails?.account_number || !accountDetails?.ifsc_code) {
        toast.push({ type: 'error', message: 'Generate account number and IFSC before approval' });
        return;
      }
    }

    try {
      setModalLoading(true);
      await BankManagerService.approveOrRejectUser(selectedUserId, {
        approved: decisionApproved,
        remarks: decisionReason.trim() || undefined,
        account_number: decisionApproved ? accountDetails?.account_number : undefined,
        ifsc_code: decisionApproved ? accountDetails?.ifsc_code : undefined,
      });

      setDecisionOpen(false);
      setDecisionReason("");
      await fetchUsers();
      await openDetails(selectedUserId);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to submit decision";
      toast.push({ type: 'error', message: typeof msg === "string" ? msg : "Failed to submit decision" });
    } finally {
      setModalLoading(false);
    }
  };

  const submitDelete = async () => {
    if (!selectedUserId) return;
    if (!deleteReason.trim()) {
      toast.push({ type: 'error', message: 'Deletion reason is required' });
      return;
    }

    try {
      setModalLoading(true);
      if (deleteActionMode === "ESCALATION_APPROVE") {
        await BankManagerService.handleDeleteEscalation(selectedUserId, {
          approved: true,
          reason: deleteReason.trim(),
        });
      } else {
        await BankManagerService.deleteUser(selectedUserId, deleteReason.trim());
      }

      setDeleteOpen(false);
      setDeleteReason("");
      setDeleteActionMode("DIRECT_DELETE");
      await fetchUsers();
      await openDetails(selectedUserId);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to delete user";
      toast.push({ type: 'error', message: typeof msg === "string" ? msg : "Failed to delete user" });
    } finally {
      setModalLoading(false);
    }
  };

  const submitEscalationDecline = async () => {
    if (!selectedUserId) return;
    try {
      setModalLoading(true);
      await BankManagerService.handleDeleteEscalation(selectedUserId, {
        approved: false,
      });
      await fetchUsers();
      await openDetails(selectedUserId);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to decline escalation request";
      toast.push({ type: 'error', message: typeof msg === "string" ? msg : "Failed to decline escalation request" });
    } finally {
      setModalLoading(false);
    }
  };

  const clearKycEditRequest = async () => {
    if (!selectedUserId) return;
    try {
      setModalLoading(true);
      await BankManagerService.clearKycEditRequest(selectedUserId);
      await fetchUsers();
      await openDetails(selectedUserId);
      toast.push({ type: "success", message: "KYC edit request cleared" });
    } catch (err: any) {
      toast.push({ type: "error", message: err?.response?.data?.detail || "Failed to clear KYC edit request" });
    } finally {
      setModalLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!selectedUserId || !kycDraft) return;
    const result = validateDraft(kycDraft);
    if (!result.valid) {
      toast.push({ type: "error", message: result.message || "Invalid KYC details" });
      return;
    }
    try {
      setDraftSaving(true);
      setKycDraft(result.sanitized);
      await BankManagerService.saveKycDraft(selectedUserId, result.sanitized);
      toast.push({ type: "success", message: "KYC draft saved" });
      setDraftDirty(false);
      await openDetails(selectedUserId);
    } catch (err: any) {
      toast.push({ type: "error", message: err?.response?.data?.detail || "Failed to save draft" });
    } finally {
      setDraftSaving(false);
    }
  };

  const openDocumentPreview = async () => {
    if (!selectedUserId) return;
    try {
      setDocPreviewLoading(true);
      setDocPreviewError(null);
      const docs = await BankManagerService.listUserDocuments(selectedUserId, "AADHAAR");
      const doc = docs[0];
      if (!doc?.document_id) {
        setDocPreviewError("No Aadhaar document found");
        return;
      }
      const blob = await BankManagerService.fetchDocumentBlob(doc.document_id);
      const url = URL.createObjectURL(blob);
      setDocPreviewUrl(url);
      setDocPreviewType(doc.content_type || blob.type || "");
      setDocPreviewName(doc.original_name || "Aadhaar Document");
      setDocPreviewOpen(true);
    } catch (err: any) {
      setDocPreviewError(err?.response?.data?.detail || "Failed to load document");
    } finally {
      setDocPreviewLoading(false);
    }
  };

  const generateAccount = async () => {
    if (!selectedUserId) return;
    try {
      setAccountGenerating(true);
      const details = await BankManagerService.generateAccountDetails(selectedUserId);
      setAccountDetails(details);
    } catch (err: any) {
      toast.push({ type: "error", message: err?.response?.data?.detail || "Failed to generate account details" });
    } finally {
      setAccountGenerating(false);
    }
  };

  const confirmAccountDetails = () => {
    if (!accountDetails?.account_number || !accountDetails?.ifsc_code) {
      toast.push({ type: "error", message: "Generate account details first" });
      return;
    }
    setApprovalOpen(false);
    setApprovalConfirmed(true);
    setDecisionApproved(true);
    setDecisionReason("");
    setDecisionOpen(true);
  };

  const handleRefresh = async () => {
    await fetchUsers();
    if (selectedUserId) {
      await openDetails(selectedUserId);
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate("/home", { replace: true });
  };


  const currentApprovalStatus =
    details?.approval_status || selectedRow?.approval_status || "PENDING";
  const currentKycStatus = details?.kyc_status || selectedRow?.kyc_status || "PENDING";
  const canApproveReject =
    currentApprovalStatus === "PENDING" && currentKycStatus === "COMPLETED";
  const canDeleteUser = currentApprovalStatus !== "DELETED";
  const hasEscalatedRequest = !!selectedRow?.deletion_requested;
  const canEditKycDraft = !!kycDetails?.kyc_edit_request?.requested;

  return (
    <>
      <div className="loan-dashboard-fade-in space-y-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-green-900">Users</h1>
            <p className="mt-1 text-sm text-gray-600">Review KYC, approvals, and requests</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            disabled={refreshing || modalLoading}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-green-100 bg-white p-5 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Users</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.total}</p>
              </div>
              <div className="rounded-md bg-blue-100 p-3 text-blue-700 shadow-inner">U</div>
            </div>
          </div>
          <div className="rounded-lg border border-green-100 bg-white p-5 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Users</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.pending}</p>
              </div>
              <div className="rounded-md bg-amber-100 p-3 text-amber-700 shadow-inner">P</div>
            </div>
          </div>
          <div className="rounded-lg border border-green-100 bg-white p-5 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                  <p className="text-sm text-slate-500">Approved Users</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.approved}</p>
              </div>
                <div className="rounded-md bg-emerald-100 p-3 text-emerald-700 shadow-inner">A</div>
            </div>
          </div>
          <div className="rounded-lg border border-green-100 bg-white p-5 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                  <p className="text-sm text-slate-500">Escalated Requests</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.escalatedRequests}</p>
              </div>
                <div className="rounded-md bg-rose-100 p-3 text-rose-700 shadow-inner">E</div>
            </div>
          </div>
        </div>

          <div className="mb-4 rounded-lg border border-green-100 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, user id"
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition-all duration-300 ease-in-out focus:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-100 lg:col-span-2"
            />

            <select
              value={filters.approval_status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  approval_status: e.target.value as FilterState["approval_status"],
                }))
              }
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition-all duration-300 ease-in-out focus:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-100"
            >
              <option value="ALL">Approval: All</option>
              <option value="PENDING">Approval: Pending</option>
              <option value="APPROVED">Approval: Approved</option>
              <option value="REJECTED">Approval: Rejected</option>
              <option value="DELETED">Approval: Deleted</option>
            </select>

            <select
              value={filters.kyc_status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  kyc_status: e.target.value as FilterState["kyc_status"],
                }))
              }
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition-all duration-300 ease-in-out focus:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-100"
            >
              <option value="ALL">KYC: All</option>
              <option value="PENDING">KYC: Pending</option>
              <option value="COMPLETED">KYC: Completed</option>
            </select>

            <select
              value={filters.deletion_requested}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  deletion_requested: e.target.value as FilterState["deletion_requested"],
                }))
              }
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition-all duration-300 ease-in-out focus:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-100"
            >
              <option value="ALL">Escalated Req: All</option>
              <option value="YES">Escalated Req: Yes</option>
              <option value="NO">Escalated Req: No</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-green-100 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading users...</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No users found.</div>
          ) : (
            <div className="overflow-x-auto bg-white">
              <table className="min-w-full divide-y divide-green-100 text-sm">
                <thead className="bg-green-100/95">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">KYC</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Approval</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Escalated</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Created</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {displayed.map((row) => (
                    <tr key={row.user_id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{row.name || "-"}</p>
                        <p className="text-xs text-slate-500">{row.user_id}</p>
                        <p className="text-xs text-slate-500">{row.phone || "-"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${kycBadgeClass(row.kyc_status)}`}>
                          {row.kyc_status || "PENDING"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${approvalBadgeClass(row.approval_status)}`}>
                          {row.approval_status || "PENDING"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={row.deletion_requested ? "text-rose-600 font-medium" : "text-gray-600"}>
                          {row.deletion_requested ? "YES" : "NO"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(row.created_at)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => openDetails(row.user_id)}
                          className={
                            row.kyc_edit_requested
                              ? "dashboard-ripple-btn loan-view-btn inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-[0_0_0_4px_rgba(239,68,68,0.2)]"
                              : "dashboard-ripple-btn loan-view-btn inline-flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-[0_0_0_4px_rgba(34,197,94,0.2)]"
                          }
                        >
                          <Eye size={14} />
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end mt-4">
          <div className="flex items-center gap-2 rounded-md border border-green-100 bg-white px-3 py-2 shadow-sm">
            <label className="text-sm text-gray-600">Page size:</label>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded border border-gray-200 px-2 py-1 text-sm outline-none transition-all duration-300 ease-in-out"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>

            <div className="text-sm text-gray-600">
              {total === 0 ? 0 : start + 1} - {Math.min(start + pageSize, total)} of {total}
            </div>

            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-gray-200 px-2 py-1 text-sm transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={start + pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-gray-200 px-2 py-1 text-sm transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {notificationOpen && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setNotificationOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                <p className="text-xs text-gray-500">Unread: {unreadCount}</p>
              </div>
              <button
                type="button"
                onClick={() => setNotificationOpen(false)}
                className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100"
              >
                x
              </button>
            </div>

            <div className="h-full overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Messages</h3>
                <button
                  type="button"
                  onClick={() => void refreshNotifications()}
                  className="text-xs px-2 py-1 border rounded"
                  disabled={notificationLoading}
                >
                  {notificationLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="text-sm text-gray-500">No unread messages.</div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div key={n.user_id} className="rounded border p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{n.name || n.user_id}</div>
                          <div className="text-xs text-gray-500">{n.phone || "-"}</div>
                        </div>
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">
                          {n.unread_count}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        {n.last_message || "No message preview"}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setChatUserId(n.user_id);
                            void refreshChatMessages(n.user_id);
                          }}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await QueryService.markUserMessagesRead(n.user_id, true);
                            await refreshNotifications();
                          }}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          Mark Read
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await QueryService.markUserMessagesRead(n.user_id, false);
                            await refreshNotifications();
                          }}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          Mark Unread
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Chat</h4>
                    <div className="text-xs text-gray-500">
                      {chatUserId ? `User: ${chatUserId}` : "Select a message to chat"}
                    </div>
                  </div>
                  {chatUserId && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await QueryService.markUserMessagesRead(chatUserId, true);
                          await refreshNotifications();
                        }}
                        className="rounded border px-2 py-1 text-xs"
                      >
                        Mark Read
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await QueryService.markUserMessagesRead(chatUserId, false);
                          await refreshNotifications();
                        }}
                        className="rounded border px-2 py-1 text-xs"
                      >
                        Mark Unread
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 h-[40vh] overflow-auto rounded border bg-gray-50 p-2">
                  {chatLoading ? (
                    <div className="text-sm text-gray-500">Loading messages...</div>
                  ) : chatMessages.length === 0 ? (
                    <div className="text-sm text-gray-500">No messages yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {chatMessages.map((m, idx) => (
                        <div key={m._id || `${m.created_at}-${idx}`} className={`flex ${m.sender_role === "BANK_MANAGER" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow ${m.sender_role === "BANK_MANAGER" ? "bg-green-600 text-white" : "bg-white border text-gray-900"}`}>
                            <div>{m.message}</div>
                            <div className="text-[10px] opacity-75 mt-1">
                              {m.created_at ? new Date(m.created_at).toLocaleString("en-IN") : ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    placeholder="Type reply..."
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    disabled={!chatUserId || chatSending}
                  />
                  <button
                    type="button"
                    disabled={!chatUserId || chatSending}
                    onClick={async () => {
                      const msg = chatText.trim();
                      if (!chatUserId || !msg) return;
                      setChatSending(true);
                      try {
                        await QueryService.replyToUser(chatUserId, msg);
                        setChatText("");
                        await refreshChatMessages(chatUserId);
                        await refreshNotifications();
                      } catch (e: any) {
                        toast.push({ type: "error", message: e?.response?.data?.detail || "Failed to send" });
                      } finally {
                        setChatSending(false);
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* <Footer /> */}

      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">User Review</h2>
              <button
                type="button"
                onClick={closeDetailsModal}
                className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100"
              >
                x
              </button>
            </div>

            {docPreviewOpen ? (
              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">Aadhaar Document Preview</h3>
                  <button
                    type="button"
                    onClick={() => setDocPreviewOpen(false)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    Back
                  </button>
                </div>
                <div className="rounded-md border bg-gray-50 p-2">
                  {docPreviewUrl ? (
                    docPreviewType?.startsWith("image/") ? (
                      <img
                        src={docPreviewUrl}
                        alt={docPreviewName || "Aadhaar Document"}
                        className="mx-auto max-h-[70vh] w-auto object-contain"
                      />
                    ) : (
                      <iframe
                        title="Aadhaar Document"
                        src={docPreviewUrl}
                        className="h-[70vh] w-full"
                      />
                    )
                  ) : (
                    <div className="p-6 text-sm text-gray-500">Document unavailable.</div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  View-only preview. Downloading or editing is disabled in the UI.
                </p>
              </div>
            ) : modalLoading && !details ? (
              <div className="p-6 text-sm text-gray-500">Loading details...</div>
            ) : (
              <div className="space-y-5 p-5">
                <div className="rounded-md border bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-800">Basic Details</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <p><span className="text-gray-500">User ID:</span> {details?.user_id || selectedUserId}</p>
                    <p><span className="text-gray-500">Name:</span> {details?.name || selectedRow?.name || "-"}</p>
                    <p><span className="text-gray-500">Phone:</span> {details?.phone || selectedRow?.phone || "-"}</p>
                    <p><span className="text-gray-500">Account No:</span> {details?.account_number || "-"}</p>
                      <p>
                        <span className="text-gray-500">IFSC:</span>{" "}
                        {details?.ifsc_code
                          || accountDetails?.ifsc_code
                          || kycDetails?.pending_account?.ifsc_code
                          || getIfscForState(kycDraft?.address.state || "")
                          || "-"}
                      </p>
                    <p>
                      <span className="text-gray-500">Approval:</span>{" "}
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${approvalBadgeClass(details?.approval_status || selectedRow?.approval_status)}`}>
                        {(details?.approval_status || selectedRow?.approval_status || "PENDING")}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-500">KYC:</span>{" "}
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${kycBadgeClass(details?.kyc_status || selectedRow?.kyc_status)}`}>
                        {(details?.kyc_status || selectedRow?.kyc_status || "PENDING")}
                      </span>
                    </p>
                    <p><span className="text-gray-500">Escalated Request:</span> {hasEscalatedRequest ? "Yes" : "No"}</p>
                    <p><span className="text-gray-500">Minor:</span> {details?.is_minor ? "Yes" : "No"}</p>
                    <p><span className="text-gray-500">Created:</span> {formatDate(details?.created_at || selectedRow?.created_at)}</p>
                    <p><span className="text-gray-500">Updated:</span> {formatDate(details?.updated_at)}</p>
                  </div>
                </div>

                <div className="rounded-md border bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-800">KYC Details</p>
                  {kycDetails ? (
                    <div className="mt-3 space-y-4">
                      {kycDetails.kyc_edit_request?.requested && (
                        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                          <p className="font-semibold">KYC Edit Request</p>
                          <div className="mt-1 space-y-1">
                            <p>
                              Requested at:{" "}
                              {kycDetails.kyc_edit_request.requested_at
                                ? formatDate(kycDetails.kyc_edit_request.requested_at)
                                : "-"}
                            </p>
                            <p>Reason: {kycDetails.kyc_edit_request.reason || "-"}</p>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <label className="text-xs text-gray-500">Aadhaar</label>
                          <input
                            value={kycDraft?.aadhaar || ""}
                            onChange={(e) => {
                              setKycDraft((prev) => prev ? ({ ...prev, aadhaar: e.target.value }) : prev);
                              setDraftDirty(true);
                            }}
                            inputMode="numeric"
                            maxLength={12}
                            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100"
                            disabled={!canEditKycDraft}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">PAN</label>
                          <input
                            value={kycDraft?.pan || ""}
                            onChange={(e) => {
                              setKycDraft((prev) => prev ? ({ ...prev, pan: e.target.value }) : prev);
                              setDraftDirty(true);
                            }}
                            maxLength={10}
                            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100"
                            disabled={!canEditKycDraft}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">DOB</label>
                          <input
                            type="date"
                            value={kycDraft?.dob || ""}
                            onChange={(e) => {
                              setKycDraft((prev) => prev ? ({ ...prev, dob: e.target.value }) : prev);
                              setDraftDirty(true);
                            }}
                            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100"
                            disabled={!canEditKycDraft}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Gender</label>
                          <select
                            value={kycDraft?.gender || ""}
                            onChange={(e) => {
                              setKycDraft((prev) => prev ? ({ ...prev, gender: e.target.value }) : prev);
                              setDraftDirty(true);
                            }}
                            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100"
                            disabled={!canEditKycDraft}
                          >
                            <option value="">Select</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Occupation</label>
                          <input
                            value={kycDraft?.occupation || ""}
                            onChange={(e) => {
                              setKycDraft((prev) => prev ? ({ ...prev, occupation: e.target.value }) : prev);
                              setDraftDirty(true);
                            }}
                            maxLength={15}
                            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100"
                            disabled={!canEditKycDraft}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Address Line 1</label>
                          <input
                            value={kycDraft?.address.line1 || ""}
                            onChange={(e) => {
                              setKycDraft((prev) => prev ? ({
                                ...prev,
                                address: { ...prev.address, line1: e.target.value },
                              }) : prev);
                              setDraftDirty(true);
                            }}
                            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100"
                            disabled={!canEditKycDraft}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">City</label>
                          <input
                            value={kycDraft?.address.city || ""}
                            onChange={(e) => {
                              setKycDraft((prev) => prev ? ({
                                ...prev,
                                address: { ...prev.address, city: e.target.value },
                              }) : prev);
                              setDraftDirty(true);
                            }}
                            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100"
                            disabled={!canEditKycDraft}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">State</label>
                          <select
                            value={kycDraft?.address.state || ""}
                            onChange={(e) => {
                              const nextState = e.target.value;
                              setKycDraft((prev) => prev ? ({
                                ...prev,
                                address: { ...prev.address, state: nextState },
                              }) : prev);
                              setDraftDirty(true);
                              setApprovalConfirmed(false);
                              setAccountDetails((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  state: nextState,
                                  ifsc_code: getIfscForState(nextState),
                                };
                              });
                            }}
                            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100"
                            disabled={!canEditKycDraft}
                          >
                            <option value="">Select</option>
                            {INDIAN_STATES.map((state) => (
                              <option key={state} value={state}>
                                {state}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">IFSC Preview</label>
                          <input
                            value={getIfscForState(kycDraft?.address.state || "") || "-"}
                            readOnly
                            className="mt-1 w-full rounded border border-gray-300 bg-gray-100 px-2 py-1 text-gray-700"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Pincode</label>
                          <input
                            value={kycDraft?.address.pincode || ""}
                            onChange={(e) => {
                              setKycDraft((prev) => prev ? ({
                                ...prev,
                                address: { ...prev.address, pincode: e.target.value },
                              }) : prev);
                              setDraftDirty(true);
                            }}
                            inputMode="numeric"
                            maxLength={6}
                            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100"
                            disabled={!canEditKycDraft}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={openDocumentPreview}
                          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                          disabled={docPreviewLoading}
                        >
                          {docPreviewLoading ? "Loading..." : "View Document"}
                        </button>
                        <button
                          type="button"
                          onClick={saveDraft}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          disabled={!canEditKycDraft || !draftDirty || draftSaving}
                        >
                          {draftSaving ? "Saving..." : "Save Draft"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const source = kycDetails?.kyc_draft || kycDetails?.kyc || details || undefined;
                            setKycDraft(buildDraft(source as any));
                            setDraftDirty(false);
                          }}
                          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                          disabled={!canEditKycDraft}
                        >
                          Discard Changes
                        </button>
                        {kycDetails?.kyc_edit_request?.requested && (
                          <button
                            type="button"
                            onClick={clearKycEditRequest}
                            className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            disabled={modalLoading}
                          >
                            Clear Edit Request
                          </button>
                        )}
                        {draftDirty && (
                          <span className="text-xs text-amber-700">Unsaved changes</span>
                        )}
                        {docPreviewError && (
                          <span className="text-xs text-rose-600">{docPreviewError}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">KYC details unavailable or not completed.</p>
                  )}
                </div>

                <div className="rounded-md border bg-white p-4">
                  <p className="text-sm font-semibold text-gray-800">Actions</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canApproveReject && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setApprovalOpen(true);
                          }}
                          className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                          disabled={modalLoading}
                        >
                          Approve KYC
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDecisionApproved(false);
                            setDecisionReason("");
                            setDecisionOpen(true);
                          }}
                          className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
                          disabled={modalLoading}
                        >
                          Reject User
                        </button>
                      </>
                    )}

                    {canDeleteUser && hasEscalatedRequest && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteReason("");
                            setDeleteActionMode("ESCALATION_APPROVE");
                            setDeleteOpen(true);
                          }}
                          className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
                          disabled={modalLoading}
                        >
                          Approve Escalated Delete
                        </button>
                        <button
                          type="button"
                          onClick={submitEscalationDecline}
                          className="rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                          disabled={modalLoading}
                        >
                          Decline Escalation
                        </button>
                      </>
                    )}

                    {canDeleteUser && !hasEscalatedRequest && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteReason("");
                          setDeleteActionMode("DIRECT_DELETE");
                          setDeleteOpen(true);
                        }}
                        className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
                        disabled={modalLoading}
                      >
                        Delete User
                      </button>
                    )}

                    {!canApproveReject && !canDeleteUser && (
                      <p className="text-sm text-gray-500">No actions available for this user.</p>
                    )}
                  </div>
                  {approvalConfirmed && accountDetails && (
                    <p className="mt-2 text-xs text-green-700">
                      Account details confirmed. Proceed to final approval.
                    </p>
                  )}
                </div>

                {approvalOpen && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
                      <div className="flex items-center justify-between border-b px-4 py-3">
                        <h3 className="text-sm font-semibold text-gray-900">Approve KYC - Account Details</h3>
                        <button
                          type="button"
                          onClick={() => setApprovalOpen(false)}
                          className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100"
                        >
                          x
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <label className="text-xs text-gray-600">Bank Manager</label>
                            <input
                              value={managerProfile?.name || "Bank Manager"}
                              readOnly
                              className="mt-1 w-full rounded border border-gray-300 bg-gray-100 px-2 py-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Account Number</label>
                            <input
                              value={accountDetails?.account_number || ""}
                              readOnly
                              className="mt-1 w-full rounded border border-gray-300 bg-gray-100 px-2 py-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">IFSC Code</label>
                            <input
                              value={accountDetails?.ifsc_code || ""}
                              readOnly
                              className="mt-1 w-full rounded border border-gray-300 bg-gray-100 px-2 py-1"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={generateAccount}
                              className="w-full rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
                              disabled={accountGenerating}
                            >
                              {accountGenerating ? "Generating..." : "Generate Account Number"}
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={confirmAccountDetails}
                            className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setApprovalOpen(false)}
                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {decisionOpen && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-900">
                      {decisionApproved ? "Approve user" : "Reject user"}
                    </p>
                    <textarea
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      className="mt-3 w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm"
                      rows={3}
                      placeholder={decisionApproved ? "Optional remarks" : "Rejection reason (required)"}
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={submitDecision}
                        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        disabled={modalLoading}
                      >
                        Submit decision
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDecisionOpen(false);
                          setDecisionReason("");
                        }}
                        className="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700"
                        disabled={modalLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {deleteOpen && (
                  <div className="rounded-md border border-rose-200 bg-rose-50 p-4">
                    <p className="text-sm font-semibold text-rose-900">
                      {deleteActionMode === "ESCALATION_APPROVE"
                        ? "Approve escalated deletion"
                        : "Delete user"}
                    </p>
                    <textarea
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      className="mt-3 w-full rounded-md border border-rose-300 bg-white px-3 py-2 text-sm"
                      rows={3}
                      placeholder="Deletion reason (required)"
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={submitDelete}
                        className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
                        disabled={modalLoading}
                      >
                        {deleteActionMode === "ESCALATION_APPROVE"
                          ? "Confirm escalation delete"
                          : "Confirm delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteOpen(false);
                          setDeleteReason("");
                        }}
                        className="rounded-md border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-700"
                        disabled={modalLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default BankManagerDashboard;
