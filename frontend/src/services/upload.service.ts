import apiClient from "./api.client";

export type IncomeSlipUploadResponse = {
  file_name: string;
  url: string;
  extracted_monthly_income?: number | null;
  extraction_status?: "FOUND" | "NOT_FOUND";
  extraction_message?: string;
};

export const UploadService = {
  async uploadIncomeSlip(file: File): Promise<IncomeSlipUploadResponse> {
    const form = new FormData();
    form.append("file", file);

    const res = await apiClient.post("/uploads/income-slip", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  async deleteIncomeSlip(fileName: string): Promise<{ message: string }> {
    const res = await apiClient.delete(`/uploads/income-slip/${encodeURIComponent(fileName)}`);
    return res.data;
  },

  async fetchIncomeSlipBlobByUrl(fileUrl: string): Promise<Blob> {
    const parsed = new URL(fileUrl, window.location.origin);
    const pathWithQuery = `${parsed.pathname}${parsed.search || ""}`;
    const res = await apiClient.get(pathWithQuery, { responseType: "blob" });
    return res.data as Blob;
  },
};
