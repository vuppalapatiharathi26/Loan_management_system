import { useState, useEffect } from "react";
import { AdminUserService } from "../../../services/adminUser.service";

interface Props {
  documentId: string;
  originalName: string;
  docType?: string;
  isOpen: boolean;
  onClose: () => void;
}

const DocumentPreviewModal = ({
  documentId,
  originalName,
  docType,
  isOpen,
  onClose,
}: Props) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPreviewUrl(null);
      setError(null);
      return;
    }

    const loadPreview = async () => {
      try {
        setLoading(true);
        setError(null);

        const blob = await AdminUserService.fetchDocumentBlob(documentId);
        const url = window.URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch (err) {
        console.error("Failed to load preview:", err);
        setError("Failed to load document preview");
      } finally {
        setLoading(false);
      }
    };

    loadPreview();

    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, documentId]);

  const handleDownload = async () => {
    try {
      const blob = await AdminUserService.fetchDocumentBlob(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = originalName || "document";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download document:", error);
      alert("Failed to download document. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {docType ? `${docType} Document` : "Document"} Preview 
            </h2>
            <p className="text-sm text-gray-600 mt-1">{originalName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-gray-600">Loading document...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2">
              <p className="text-red-600 font-semibold">{error}</p>
              <p className="text-sm text-gray-600">
                Try downloading the document instead
              </p>
            </div>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="Document Preview"
              onError={() => setError("Unable to preview this document format")}
            />
          ) : null}
        </div>

        {/* Footer with Actions */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
