import apiClient from "./api.client";

export type IdentityDocType = "AADHAAR" | "PAN" | "DRIVING_LICENCE";

export type IdentityDocument = {
  document_id: string;
  doc_type: IdentityDocType;
  original_name: string;
  content_type: string;
  uploaded_at?: string | null;
  url: string;
};

export const DocumentService = {
  async uploadIdentityDocument(doc_type: IdentityDocType, file: File) {
    const form = new FormData();
    form.append("doc_type", doc_type);
    form.append("file", file);

    const res = await apiClient.post("/uploads/identity-document", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data as IdentityDocument;
  },

  async listMyIdentityDocuments(): Promise<IdentityDocument[]> {
    const res = await apiClient.get("/uploads/identity-documents");
    const docs = (res.data as { documents?: unknown })?.documents;
    return Array.isArray(docs) ? (docs as IdentityDocument[]) : [];
  },

  async fetchDocumentBlob(documentId: string) {
    const res = await apiClient.get(`/uploads/identity-docs/${documentId}`, {
      responseType: "blob",
    });
    return res.data as Blob;
  },

  async deleteIdentityDocument(documentId: string) {
    const res = await apiClient.delete(`/uploads/identity-docs/${documentId}`);
    return res.data as { message: string };
  },
};
