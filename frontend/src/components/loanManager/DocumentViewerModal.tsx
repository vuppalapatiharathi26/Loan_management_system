import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { TokenManager } from "../../services/api.client";

interface Props {
  documentUrl: string;
  documentName?: string;
  onClose: () => void;
}

const DocumentViewerModal: React.FC<Props> = ({ documentUrl, documentName = "Document", onClose }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if already fetched
        if (blobUrlRef.current) {
          setBlobUrl(blobUrlRef.current);
          setLoading(false);
          return;
        }

        const token = TokenManager.getToken();
        if (!token) {
          setError("Authentication token not found");
          setLoading(false);
          return;
        }

        console.log("Fetching PDF from:", documentUrl);

        // Fetch the PDF with authentication header
        const response = await fetch(documentUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("Fetch response status:", response.status);

        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        console.log("Blob size:", blob.size, "Type:", blob.type);

        if (blob.size === 0) {
          throw new Error("Document is empty");
        }

        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      } catch (err) {
        console.error("Error fetching document:", err);
        setError(err instanceof Error ? err.message : "Failed to load document");
      } finally {
        setLoading(false);
      }
    };

    fetchPdf();

    // Cleanup blob URL on unmount
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [documentUrl]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[13000] overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-[13001] mx-auto my-4 w-[95vw] max-w-6xl px-2">
        <div className="flex h-[92vh] flex-col overflow-hidden rounded bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">{documentName}</h2>
          <div className="flex items-center gap-2">
            {!loading && blobUrl && (
              <a
                href={blobUrl}
                download={`${documentName}.pdf`}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Download
              </a>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm bg-gray-300 text-gray-900 rounded hover:bg-gray-400 transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading document...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-red-600 p-6">
                <p className="font-semibold mb-2">Error loading document</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {!loading && blobUrl && !error && (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title={documentName}
              style={{ display: "block" }}
            />
          )}
        </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DocumentViewerModal;
