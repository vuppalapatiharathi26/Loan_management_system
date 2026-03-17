import { useState } from "react";
import type { Manager } from "../../../types/manager";

interface Props {
  manager: Manager;
  onClose: () => void;
  onSave: (updatedManager: Manager) => void;
}


const EditManagerModal = ({ manager, onClose, onSave}: Props) => {
    const [phone, setPhone] = useState(manager.phone || "");
    const [role, setRole] = useState<Manager["role"]>(manager.role);

    const handleSave = () => {
        if (phone.length !== 10) {
            alert("Phone number must be 10 digits");
            return;
        }
        
        onSave({
            ...manager,
            phone,
            role,
        });
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 font-bold"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4">Edit Manager</h2>

        {/* Phone Number */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Phone Number
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => {
                const onlyDigits = e.target.value.replace(/\D/g, "");
                setPhone(onlyDigits);
            }}
            maxLength={10}
            placeholder="Enter phone number"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Role */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">
            Role
          </label>
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as Manager["role"])
            }
            className="w-full border rounded px-3 py-2"
          >
            <option value="LOAN_MANAGER">Loan Manager</option>
            <option value="BANK_MANAGER">Bank Manager</option>
          </select>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-green-600 text-white"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
    );

}

export default EditManagerModal;
