import apiClient from "./api.client";

export type ManagerInfo = {
  manager_id: string;
  name: string;
  phone: string;
  role: string;
};

export type QueryMessage = {
  _id?: string;
  user_id: string;
  manager_id: string;
  sender_role: "USER" | "BANK_MANAGER";
  message: string;
  created_at: string;
  is_read_by_manager?: boolean;
};

export type ManagerNotificationItem = {
  user_id: string;
  name?: string | null;
  phone?: string | null;
  unread_count: number;
  last_message?: string | null;
  last_created_at?: string | null;
  last_message_id?: string | null;
};

export const QueryService = {
  async getMyManager(): Promise<ManagerInfo> {
    const res = await apiClient.get("/queries/me/manager");
    return res.data;
  },

  async listMyMessages(): Promise<QueryMessage[]> {
    const res = await apiClient.get("/queries/me");
    const msgs = (res.data as any)?.messages;
    return Array.isArray(msgs) ? (msgs as QueryMessage[]) : [];
  },

  async sendMyMessage(message: string) {
    const res = await apiClient.post("/queries/me", { message });
    return res.data;
  },

  async listAssignedUsers(): Promise<Array<{ user_id: string; name: string; phone: string }>> {
    const res = await apiClient.get("/queries");
    const users = (res.data as any)?.users;
    return Array.isArray(users) ? users : [];
  },

  async listManagerConversations(): Promise<Array<{
    user_id: string;
    name?: string | null;
    phone?: string | null;
    last_message?: string | null;
    last_message_at?: string | null;
    unread_count?: number;
  }>> {
    const res = await apiClient.get("/queries/manager/conversations");
    const items = (res.data as any)?.conversations;
    return Array.isArray(items) ? items : [];
  },

  async listMessagesForUser(userId: string): Promise<QueryMessage[]> {
    const res = await apiClient.get(`/queries/${userId}`);
    const msgs = (res.data as any)?.messages;
    return Array.isArray(msgs) ? (msgs as QueryMessage[]) : [];
  },

  async replyToUser(userId: string, message: string) {
    const res = await apiClient.post(`/queries/${userId}`, { message });
    return res.data;
  },

  async listManagerNotifications(): Promise<{ total_unread: number; items: ManagerNotificationItem[] }> {
    const res = await apiClient.get("/queries/manager/notifications");
    return res.data as { total_unread: number; items: ManagerNotificationItem[] };
  },

  async markMessageRead(messageId: string, read: boolean) {
    const res = await apiClient.patch(`/queries/manager/messages/${messageId}/read`, { read });
    return res.data;
  },

  async markUserMessagesRead(userId: string, read: boolean) {
    const res = await apiClient.patch(`/queries/manager/users/${userId}/read`, { read });
    return res.data;
  },
};

