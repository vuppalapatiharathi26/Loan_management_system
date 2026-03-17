import { useEffect, useMemo, useState } from "react";
import { QueryService, type QueryMessage } from "../../services/query.service";
import { BankManagerService, type BankUserSearchResult } from "../../services/bankManager.service";
import { useToast } from "../../context/ToastContext";

type ConversationUser = {
  user_id: string;
  name?: string | null;
  phone?: string;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
};

const QueriesPage = () => {
  const toast = useToast();
  const [conversations, setConversations] = useState<ConversationUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ConversationUser | BankUserSearchResult | null>(null);
  const [messages, setMessages] = useState<QueryMessage[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<BankUserSearchResult[]>([]);

  const selected = useMemo(() => {
    if (selectedUser) return selectedUser;
    return conversations.find((u) => u.user_id === selectedUserId) || null;
  }, [conversations, selectedUser, selectedUserId]);

  const refreshConversations = async () => {
    setLoadingUsers(true);
    try {
      const items = await QueryService.listManagerConversations();
      setConversations(items as any);
      if (!selectedUserId && items.length > 0) {
        setSelectedUserId(items[0].user_id);
        setSelectedUser(items[0] as any);
      }
    } catch (e: any) {
      toast.push({ type: "error", message: e?.response?.data?.detail || "Failed to load queries" });
    } finally {
      setLoadingUsers(false);
    }
  };

  const refreshMessages = async (userId: string) => {
    setLoadingMessages(true);
    try {
      const msgs = await QueryService.listMessagesForUser(userId);
      setMessages(msgs);
      await QueryService.markUserMessagesRead(userId, true);
      await refreshConversations();
    } catch (e: any) {
      toast.push({ type: "error", message: e?.response?.data?.detail || "Failed to load messages" });
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    void refreshConversations();
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    void refreshMessages(selectedUserId);
    const t = window.setInterval(() => void refreshMessages(selectedUserId), 5000);
    return () => window.clearInterval(t);
  }, [selectedUserId]);

  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      setSearching(true);
      try {
        const results = await BankManagerService.searchUsersByName(q);
        setSearchResults(results);
      } catch (e: any) {
        toast.push({ type: "error", message: e?.response?.data?.detail || "Search failed" });
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search, toast]);

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Queries</h2>
          <button className="text-sm px-3 py-1 border rounded" onClick={() => void refreshConversations()} disabled={loadingUsers}>
            {loadingUsers ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name..."
            className="w-full border rounded px-3 py-2 text-sm"
          />
          {searching && (
            <div className="mt-2 text-xs text-gray-500">Searching...</div>
          )}
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-2">
              {searchResults.map((u) => (
                <button
                  key={u.user_id}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(u.user_id);
                    setSelectedUser(u);
                    setMessages([]);
                  }}
                  className="w-full text-left px-3 py-2 rounded border border-gray-200 hover:bg-gray-50"
                >
                  <div className="font-medium text-gray-900">{u.name || u.user_id}</div>
                  <div className="text-xs text-gray-600">{u.phone || "-"}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {conversations.length === 0 ? (
          <div className="text-sm text-gray-500">No active chats yet.</div>
        ) : (
          <div className="space-y-2">
            {conversations.map((u) => (
              <button
                key={u.user_id}
                type="button"
                onClick={() => {
                  setSelectedUserId(u.user_id);
                  setSelectedUser(u);
                }}
                className={`w-full text-left px-3 py-2 rounded border ${
                  selectedUserId === u.user_id ? "border-green-500 bg-green-50" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">{u.name || u.user_id}</div>
                  {!!u.unread_count && u.unread_count > 0 && (
                    <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">
                      {u.unread_count}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600">{u.phone || "-"}</div>
                {u.last_message_at && (
                  <div className="text-[10px] text-gray-400">
                    {new Date(u.last_message_at).toLocaleString("en-IN")}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-4 lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">Chat</h2>
            <div className="text-xs text-gray-500">
              {selected ? `User: ${selected.name || selected.user_id} (${selected.user_id})` : "Select a user"}
            </div>
          </div>
        </div>

        <div className="h-[60vh] overflow-auto bg-gray-50 border rounded p-3">
          {loadingMessages ? (
            <div className="text-sm text-gray-500">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-gray-500">No messages yet.</div>
          ) : (
            <div className="space-y-2">
              {messages.map((m, idx) => (
                <div key={m._id || `${m.created_at}-${idx}`} className={`flex ${m.sender_role === "BANK_MANAGER" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow ${
                      m.sender_role === "BANK_MANAGER" ? "bg-green-600 text-white" : "bg-white border text-gray-900"
                    }`}
                  >
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
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type reply..."
            className="flex-1 border rounded-lg px-3 py-2"
            disabled={!selectedUserId || sending}
          />
          <button
            type="button"
          disabled={!selectedUserId || sending}
          onClick={async () => {
            const msg = text.trim();
            if (!selectedUserId || !msg) return;
            setSending(true);
            try {
              await QueryService.replyToUser(selectedUserId, msg);
              setText("");
              await refreshMessages(selectedUserId);
              await refreshConversations();
            } catch (e: any) {
              toast.push({ type: "error", message: e?.response?.data?.detail || "Failed to send" });
            } finally {
              setSending(false);
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
  );
};

export default QueriesPage;
