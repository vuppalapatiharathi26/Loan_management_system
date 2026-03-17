import { useState } from "react";
import type { CreateManagerPayload } from "../../../types/manager";

interface Props {
  onClose: () => void;
  onRegister: (manager: CreateManagerPayload) => void;
}

const RegisterManagerModal = ({ onClose, onRegister }: Props) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<CreateManagerPayload["role"]>("LOAN_MANAGER");
  const [managerId, setManagerId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    if (!name || !phone || !managerId || !password) {
      alert("All fields are required");
      return;
    }

    if (phone.length !== 10) {
      alert("Phone number must be 10 digits");
      return;
    }

    if (managerId.trim().length < 2 || managerId.trim().length > 6) {
      alert("Manager ID must be between 2 and 6 characters");
      return;
    }
    if (!/^[A-Za-z0-9]+$/.test(managerId.trim())) {
      alert("Manager ID must be alphanumeric");
      return;
    }
    if (password.length < 6 || password.length > 13) {
      alert("Password must be between 6 and 13 characters");
      return;
    }

    onRegister({
      manager_id: managerId.trim(),
      name,
      phone,
      role,
      password,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-xl font-bold hover:bg-green-300"
        >
          X
        </button>

        <h2 className="text-2xl font-bold mb-1">
          Register New Manager
        </h2>
        <p className="text-gray-500 mb-6">
          Add a new manager to the system
        </p>

        {/* Full Name */}
        <div className="mb-4">
          <label className="text-sm  font-medium">Full Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter full name"
            className="w-full border-2 rounded hover:border-green-300 px-3 py-2 mt-1"
          />
        </div>

        {/* Phone */}
        <div className="mb-4">
          <label className="text-sm font-medium">Phone Number</label>
          <input
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            placeholder="Enter 10-digit phone number"
            className="w-full border-2 rounded hover:border-green-300 px-3 py-2 mt-1"
          />
        </div>

        {/* Role */}
        <div className="mb-4">
          <label className="text-sm font-medium">Role</label>
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as CreateManagerPayload["role"])
            }
            className="w-full border-2 rounded hover:border-green-300 px-3 py-2 mt-1"
          >
            <option value="LOAN_MANAGER">Loan Manager</option>
            <option value="BANK_MANAGER">Bank Manager</option>
          </select>
        </div>

        {/* Manager ID */}
        <div className="mb-4">
          <label className="text-sm font-medium">Manager ID</label>
          <input
            value={managerId}
            onChange={(e) => setManagerId(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 6))}
            placeholder="e.g. LM001 or BM001"
            className="w-full border-2 rounded hover:border-green-300 px-3 py-2 mt-1"
            minLength={2}
            maxLength={6}
          />
        </div>

        {/* Password */}
        <div className="mb-6">
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            className="w-full border-2 rounded hover:border-green-300 px-3 py-2 mt-1"
            minLength={6}
            maxLength={13}
          />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
        >
          Register Manager
        </button>
      </div>
    </div>
  );
};

export default RegisterManagerModal;
