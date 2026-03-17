import { useState } from "react";

interface Props {
  isOpen: boolean;
  title: string;
  confirmLabel: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (digi_pin: string) => Promise<void>;
}

const PinPromptModal = ({
  isOpen,
  title,
  confirmLabel,
  loading = false,
  onClose,
  onConfirm,
}: Props) => {
  const [digiPin, setDigiPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const submit = async () => {
    setError(null);
    if (!/^\d{4,6}$/.test(digiPin)) {
      setError("Enter a valid 4-6 digit DigiPIN");
      return;
    }

    await onConfirm(digiPin);
    setDigiPin("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="bg-white rounded shadow p-6 z-10 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600">DigiPIN</label>
            <input
              value={digiPin}
              onChange={(e) => setDigiPin(e.target.value)}
              type="password"
              className="w-full border rounded px-3 py-2 mt-1"
              placeholder="4-6 digit DigiPIN"
              maxLength={6}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2 mt-4">
            <button onClick={onClose} className="px-3 py-2 rounded border" disabled={loading}>
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={loading}
              className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            >
              {loading ? "Processing..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinPromptModal;

