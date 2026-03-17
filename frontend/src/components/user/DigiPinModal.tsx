import { useState } from "react";
import { useToast } from "../../context/ToastContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: { amount: number; digi_pin: string }) => Promise<void>;
  mode: "CREDIT" | "DEBIT";
}

const DigiPinModal = ({ isOpen, onClose, onConfirm, mode }: Props) => {
  const [amountStr, setAmountStr] = useState("");
  const [digiPin, setDigiPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const handleSubmit = async () => {
    setError(null);
    const amount = Number(amountStr);
    if (!amount || amount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (!digiPin || digiPin.length < 4 || !/^\d+$/.test(digiPin)) {
      setError("Enter a valid numeric DigiPIN (4-6 digits)");
      return;
    }

    try {
      setLoading(true);
      await onConfirm({ amount, digi_pin: digiPin });
      setAmountStr("");
      setDigiPin("");
      toast.push({ type: 'success', message: `${mode === 'CREDIT' ? 'Credit' : 'Debit'} processed` });
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || String(e) || 'Transaction failed';
      setError(msg);
      toast.push({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="bg-white rounded shadow p-6 z-10 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-2">{mode === 'CREDIT' ? 'Credit Money' : 'Debit Money'}</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600">Amount</label>
            <input
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              inputMode="numeric"
              className="w-full border rounded px-3 py-2 mt-1"
              placeholder="Enter amount"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">DigiPIN</label>
            <input
              value={digiPin}
              onChange={(e) => setDigiPin(e.target.value)}
              type="password"
              className="w-full border rounded px-3 py-2 mt-1"
              placeholder="4-6 digit DigiPIN"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2 mt-4">
            <button onClick={onClose} className="px-3 py-2 rounded border">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Processing…' : mode === 'CREDIT' ? 'Credit' : 'Debit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigiPinModal;
