import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserService } from '../../services/user.service';
import { useToast } from '../../context/ToastContext';
import { aadhaarDigits, formatAadhaar, isValidAadhaarDigits } from '../../utils/aadhaar';

const DigiPinSetup = () => {
  const [aadhaar, setAadhaar] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    // Prefill Aadhaar from latest login/register if available.
    const last = localStorage.getItem("last_user_aadhaar") || "";
    if (last) setAadhaar(formatAadhaar(last));

    // if user already has digi pin, redirect away
    (async () => {
      try {
        const p = await UserService.getProfile();
        if (p.kycStatus !== "COMPLETED" || p.accountStatus !== "APPROVED") {
          toast.push({ type: "info", message: "Complete KYC and wait for approval before setting DigiPIN." });
          navigate("/user/profile", { replace: true });
          return;
        }
        if (p.has_digi_pin) navigate('/user/dashboard');
      } catch (e) {
        // ignore
      }
    })();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAadhaarDigits(aadhaar)) {
      toast.push({ type: 'error', message: 'Enter Aadhaar in XXXX XXXX XXXX format' });
      return;
    }
    if (!/^[0-9]{4,6}$/.test(pin)) {
      toast.push({ type: 'error', message: 'DigiPIN must be 4-6 digits' });
      return;
    }
    if (pin !== confirm) {
      toast.push({ type: 'error', message: 'Pins do not match' });
      return;
    }

    try {
      setLoading(true);
      const raw = aadhaarDigits(aadhaar);
      localStorage.setItem("last_user_aadhaar", raw);
      await UserService.setDigiPin(raw, pin);
      toast.push({ type: 'success', message: 'DigiPIN set successfully.' });
      navigate('/user/dashboard', { replace: true });
    } catch (e: any) {
      toast.push({ type: 'error', message: e?.response?.data?.detail || 'Failed to set DigiPIN' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Set up DigiPIN</h2>
        <p className="text-sm text-gray-600 mb-4">Choose a 4-6 digit DigiPIN for all transactions. Aadhaar will be verified against your approved account.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700">Aadhaar Number</label>
            <input
              value={aadhaar}
              onChange={(e) => setAadhaar(formatAadhaar(e.target.value))}
              inputMode="numeric"
              maxLength={14}
              className="w-full border rounded px-3 py-2 mt-1"
              placeholder="XXXX XXXX XXXX"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700">DigiPIN</label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              type="password"
              maxLength={6}
              className="w-full border rounded px-3 py-2 mt-1"
              placeholder="4-6 digit PIN"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700">Confirm DigiPIN</label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              maxLength={6}
              className="w-full border rounded px-3 py-2 mt-1"
              placeholder="Re-enter PIN"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => navigate('/user/dashboard')} className="px-3 py-2 border rounded">Cancel</button>
            <button type="submit" disabled={loading} className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50">{loading ? 'Saving...' : 'Set DigiPIN'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DigiPinSetup;
