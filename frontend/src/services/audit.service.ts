import apiClient from "./api.client";

export interface AuditLog {
  _id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  remarks: string;
  timestamp: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  skip: number;
}

export const AuditService = {
  async getAllLogs(): Promise<AuditLogsResponse> {
    const response = await apiClient.get("/audit");
    return response.data;
  },
   async getManagerLogs(
        managerId: string,
        skip: number,
        limit: number
        ): Promise<AuditLogsResponse> {
        const response = await apiClient.get("/audit", {
            params: {
            actor_id: managerId,
            skip,
            limit,
            },
        });

        return response.data;
        },
};
