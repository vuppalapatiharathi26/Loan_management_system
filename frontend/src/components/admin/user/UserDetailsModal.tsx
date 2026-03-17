import { useState, useEffect } from "react";
import type { User } from "../../../types/user";
import { AdminUserService } from "../../../services/adminUser.service";
import type { Transaction, AccountDetails, UserDocument, AdminLoanNoc } from "../../../services/adminUser.service";
import Pagination from "../../common/Pagination";
import DocumentPreviewModal from "./DocumentPreviewModal";

interface Props {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

interface LoanTabProps {
  user: User;
  transactions: Transaction[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loanNoc: AdminLoanNoc | null;
  loadingNoc: boolean;
  nocError: string | null;
  downloadingNoc: boolean;
  onDownloadNoc: () => void;
}

interface PersonalTabProps {
  user: User;
  accountDetails: AccountDetails | null;
  documents: UserDocument[];
  loadingAccount: boolean;
  loadingDocs: boolean;
  onDocumentPreview: (doc: UserDocument) => void;
}

// helper to shorten long IDs
const shortId = (id?: string) =>
  id ? `${id.slice(0, 6)}...${id.slice(-4)}` : "—";

const UserDetailsModal = ({ user, onClose }: Props) => {
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const limit = 5;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const [accountDetails, setAccountDetails] = useState<AccountDetails | null>(null);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loanNoc, setLoanNoc] = useState<AdminLoanNoc | null>(null);
  const [loadingNoc, setLoadingNoc] = useState(false);
  const [nocError, setNocError] = useState<string | null>(null);
  const [downloadingNoc, setDownloadingNoc] = useState(false);

  const [tab, setTab] = useState<"personal" | "loan">("personal");

  // Document preview state
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [previewDocName, setPreviewDocName] = useState<string>("");
  const [previewDocType, setPreviewDocType] = useState<string | undefined>();
  const [nocPreviewUrl, setNocPreviewUrl] = useState<string | null>(null);

  const openDocumentPreview = (doc: UserDocument) => {
    setPreviewDocId(doc.document_id);
    setPreviewDocName(doc.original_name || "document");
    setPreviewDocType(doc.doc_type);
  };

  // Fetch account details when personal tab is opened
  useEffect(() => {
    if (tab !== "personal") return;

    const fetchAccountAndDocs = async () => {
      try {
        setLoadingAccount(true);
        setLoadingDocs(true);

        const [account, docs] = await Promise.all([
          AdminUserService.getUserAccount(user.userId)
            .catch((err) => {
              console.error("Failed to fetch account:", err);
              return null;
            }),
          AdminUserService.getUserDocuments(user.userId)
            .catch((err) => {
              console.error("Failed to fetch documents:", err);
              return [];
            }),
        ]);

        console.log("Account details:", account);
        console.log("Documents:", docs);

        setAccountDetails(account);
        setDocuments(docs);
      } catch (error) {
        console.error("Error fetching account/documents:", error);
      } finally {
        setLoadingAccount(false);
        setLoadingDocs(false);
      }
    };

    fetchAccountAndDocs();
  }, [tab, user.userId]);

  useEffect(() => {
    if (tab !== "loan") return;

    const fetchTransactions = async () => {
      try {
        setLoading(true);

        const data = await AdminUserService.getUserTransactions(user.userId, skip, limit);
        setTransactions(data.transactions);
        setTotal(data.total)
      } catch (error) {
        console.error("Transaction fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [tab, user, skip]);

  useEffect(() => {
    if (tab !== "loan") return;
    const loanId = user.loanId;
    if (!loanId || user.loanStatus !== "CLOSED") {
      setLoanNoc(null);
      setNocError(null);
      return;
    }

    const fetchNoc = async () => {
      try {
        setLoadingNoc(true);
        setNocError(null);
        const data = await AdminUserService.getLoanNoc(loanId);
        setLoanNoc(data);
      } catch (error: any) {
        setLoanNoc(null);
        setNocError(error?.response?.data?.detail || "Failed to fetch NOC details");
      } finally {
        setLoadingNoc(false);
      }
    };

    fetchNoc();
  }, [tab, user.loanId, user.loanStatus]);

  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const handlePageChange = (page: number) => {
    setSkip((page - 1) * limit);
  };

  useEffect(() => {
    setSkip(0);
  }, [user]);

  useEffect(() => {
    return () => {
      if (nocPreviewUrl) {
        URL.revokeObjectURL(nocPreviewUrl);
      }
    };
  }, [nocPreviewUrl]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-2">{user.name}</h2>

        {/* Shortened ID with hover */}
        <p
          className="text-sm text-gray-500 mb-6"
          title={user.userId}
        >
          {shortId(user.userId)}
        </p>

        {/* Tabs */}
        <div className="flex gap-4 mt-4 border-b">
          <Tab label="Personal" active={tab === "personal"} onClick={() => setTab("personal")} />
          <Tab label="Loan & Financial" active={tab === "loan"} onClick={() => setTab("loan")} />
        </div>

        {tab === "personal" && (
          <PersonalTab 
            user={user} 
            accountDetails={accountDetails}
            documents={documents}
            loadingAccount={loadingAccount}
            loadingDocs={loadingDocs}
            onDocumentPreview={openDocumentPreview}
          />
        )}
        {tab === "loan" && (
          <LoanTab
            user={user}
            transactions={transactions}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            loanNoc={loanNoc}
            loadingNoc={loadingNoc}
            nocError={nocError}
            downloadingNoc={downloadingNoc}
            onDownloadNoc={async () => {
              if (!user.loanId) return;
              try {
                setDownloadingNoc(true);
                const blob = await AdminUserService.downloadLoanNoc(user.loanId);
                const url = URL.createObjectURL(blob);
                setNocPreviewUrl(url);
              } finally {
                setDownloadingNoc(false);
              }
            }}
          />
        )}

      </div>

      {/* Document Preview Modal */}
      {previewDocId && (
        <DocumentPreviewModal
          documentId={previewDocId}
          originalName={previewDocName}
          docType={previewDocType}
          isOpen={!!previewDocId}
          onClose={() => setPreviewDocId(null)}
        />
      )}

      {nocPreviewUrl && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">NOC Preview</h3>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(nocPreviewUrl);
                  setNocPreviewUrl(null);
                }}
                className="px-3 py-1.5 border rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="flex-1 bg-gray-100">
              <iframe src={nocPreviewUrl} className="w-full h-full border-0" title="NOC Preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface TabProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const Tab = ({ label, active, onClick }: TabProps) => (
  <button
    className={`pb-2 font-medium ${
      active ? "border-b-2 border-green-600 text-green-600" : "text-gray-500"
    }`}
    onClick={onClick}
  >
    {label}
  </button>
);

const PersonalTab = ({ 
  user, 
  accountDetails, 
  documents, 
  loadingAccount, 
  loadingDocs,
  onDocumentPreview
}: PersonalTabProps) => {
  return (
    <div className="mt-6 space-y-6">
      {/* Basic Information */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        <p><strong>Phone:</strong> {user.phone ?? "—"}</p>
        <p><strong>KYC Status:</strong> {user.kycStatus ?? "—"}</p>
        <p><strong>Account Status:</strong> {user.accountStatus ?? "—"}</p>
        <p>
          <strong>Deletion Requested:</strong>{" "}
          {user.accountStatus === "PENDING" ? "Yes" : "No"}
        </p>
        <p>
          <strong>Created At:</strong>{" "}
          {user.createdAt
            ? new Date(user.createdAt).toLocaleString()
            : "—"}
        </p>
      </div>

      {/* Account Details Section */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">Account Details</h3>
        {loadingAccount ? (
          <p className="text-sm text-gray-500">Loading account details...</p>
        ) : accountDetails ? (
          <div className="bg-blue-50 p-4 rounded space-y-2">
            <p>
              <strong>IFSC Code:</strong>{" "}
              <span className="font-mono text-blue-700">
                {accountDetails.ifsc_code ?? "—"}
              </span>
            </p>
            <p>
              <strong>Account Number:</strong>{" "}
              <span className="font-mono text-blue-700">
                {accountDetails.account_number ?? "—"}
              </span>
            </p>
            {accountDetails.generated_at && (
              <p className="text-sm text-gray-600">
                Generated at: {new Date(accountDetails.generated_at).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No account details available</p>
        )}
      </div>

      {/* Documents Section */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">Submitted Documents</h3>
        {loadingDocs ? (
          <p className="text-sm text-gray-500">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-gray-500">No documents submitted</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div 
                key={doc.document_id} 
                className="bg-gray-50 p-3 rounded border border-gray-200"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {doc.doc_type ?? "Document"}
                    </p>
                    <p className="text-xs text-gray-600">
                      {doc.original_name ?? "—"}
                    </p>
                    {doc.uploaded_at && (
                      <p className="text-xs text-gray-500">
                        Uploaded: {new Date(doc.uploaded_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onDocumentPreview(doc)}
                    className="text-blue-600 text-sm font-semibold hover:text-blue-800"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const LoanTab = ({
    user,
    transactions,
    loading,
    currentPage,
    totalPages,
    onPageChange,
    loanNoc,
    loadingNoc,
    nocError,
    downloadingNoc,
    onDownloadNoc
  }: LoanTabProps) => {
  const loanAmount = user.loanAmount ?? 0;
  const loanStatus = user.loanStatus ?? "NO_LOAN";

  return (
    <div className="mt-6 space-y-4">
      <div className="p-4 border rounded bg-blue-100">
        <p className="text-sm">Loan Amount</p>
        <p className="text-xl font-bold">
          ₹{loanAmount.toLocaleString()}
        </p>
      </div>

      <div className="p-4 border rounded bg-gray-100">
        <p className="text-sm">Loan Status</p>
        <p className="font-semibold">{loanStatus}</p>
      </div>

      <div className="p-4 border rounded bg-indigo-50">
        <p className="text-sm font-semibold mb-2">NOC</p>
        {loanStatus !== "CLOSED" ? (
          <p className="text-sm text-gray-600">NOC is available only after loan closure.</p>
        ) : loadingNoc ? (
          <p className="text-sm text-gray-600">Loading NOC details...</p>
        ) : nocError ? (
          <p className="text-sm text-red-600">{nocError}</p>
        ) : (
          <div className="space-y-1 text-sm">
            <p><strong>Status:</strong> {loanNoc?.status || user.nocStatus || "PENDING"}</p>
            <p><strong>Reference:</strong> {loanNoc?.reference_no || user.nocReferenceNo || "—"}</p>
            <p><strong>Approved By:</strong> {loanNoc?.approved_by_name || user.nocApprovedByName || "—"}</p>
            <p><strong>Approved At:</strong> {loanNoc?.approved_at ? new Date(loanNoc.approved_at).toLocaleString() : "—"}</p>
            <p><strong>Monify Stamp:</strong> Applied in generated NOC PDF</p>
            <button
              type="button"
              className="mt-2 px-3 py-1.5 border rounded bg-white hover:bg-gray-50 disabled:opacity-50"
              disabled={!(loanNoc?.can_view || user.nocStatus === "APPROVED") || downloadingNoc}
              onClick={onDownloadNoc}
            >
              {downloadingNoc ? "Opening..." : "View NOC"}
            </button>
          </div>
        )}
      </div>

      <h3 className="text-lg font-semibold mb-3">
        Transaction History
      </h3>

      {loading ? (
        <p className="text-sm text-gray-500">Loading transactions...</p>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-gray-500">
          No transactions found.
        </p>
      ) : (
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Description</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr key={txn._id}>
                <td className="p-2 border">
                  {new Date(txn.created_at).toLocaleString()}
                </td>

                <td
                  className={`p-2 border font-semibold ${
                    txn.type === "CREDIT"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {txn.type}
                </td>

                <td className="p-2 border">
                  ₹{txn.amount}
                </td>

                <td className="p-2 border">
                  {txn.description || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table> 
      )}
      <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />

    </div>
  );
};

export default UserDetailsModal;
