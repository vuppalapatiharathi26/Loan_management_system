import { useEffect, useMemo, useState } from "react";
import { QueryService, type ManagerInfo, type QueryMessage } from "../../services/query.service";
import { useToast } from "../../context/ToastContext";

interface Props {
  enabled: boolean;
}

const ContactBankManager = ({ enabled }: Props) => {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [manager, setManager] = useState<ManagerInfo | null>(null);
  const [messages, setMessages] = useState<QueryMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");

  const canOpen = enabled;

  const sorted = useMemo(() => {
    return [...messages].sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
  }, [messages]);

  const refresh = async () => {
    setLoading(true);
    try {
      const m = await QueryService.getMyManager();
      setManager(m);
      const msgs = await QueryService.listMyMessages();
      setMessages(msgs);
    } catch (e: any) {
      toast.push({ type: "error", message: e?.response?.data?.detail || "Unable to load chat" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void refresh();
    const t = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(t);
  }, [open]);

  if (!canOpen) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-purple-300 text-black rounded-full shadow-lg px-4 py-3 hover:bg-purple-500"
      >
        Help ❓
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white w-full sm:max-w-xl sm:rounded-xl rounded-t-xl shadow-lg overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">Bank Manager</div>
                <div className="text-xs text-gray-500">
                  {manager ? `${manager.name} • ${manager.phone}` : "Loading..."}
                </div>
              </div>
              <button className="text-sm px-3 py-1 border rounded" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            <div className="p-4 h-[56vh] sm:h-[60vh] overflow-auto bg-gray-50">
              {loading ? (
                <div className="text-sm text-gray-500">Loading conversation...</div>
              ) : sorted.length === 0 ? (
                <div className="text-sm text-gray-500">No messages yet. Start a conversation.</div>
              ) : (
                <div className="space-y-2">
                  {sorted.map((m, idx) => (
                    <div
                      key={m._id || `${m.created_at}-${idx}`}
                      className={`flex ${m.sender_role === "USER" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow ${
                          m.sender_role === "USER"
                            ? "bg-green-600 text-white"
                            : "bg-white border text-gray-900"
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

            <div className="p-4 border-t bg-white flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 border rounded-lg px-3 py-2"
                disabled={sending}
              />
              <button
                type="button"
                onClick={async () => {
                  const msg = text.trim();
                  if (!msg) return;
                  setSending(true);
                  try {
                    await QueryService.sendMyMessage(msg);
                    setText("");
                    await refresh();
                  } catch (e: any) {
                    toast.push({ type: "error", message: e?.response?.data?.detail || "Failed to send" });
                  } finally {
                    setSending(false);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                disabled={sending}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContactBankManager;

