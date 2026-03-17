import type{ Manager } from "../../../types/manager";

interface Props {
  manager: Manager;
  onConfirm: (managerId: string) => void;
  onCancel: () => void;
}


const DeleteManagerModal = ({ manager, onConfirm, onCancel }: Props) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
        <h2 className="text-xl font-bold text-red-600 mb-4">
          Delete Manager
        </h2>

        <p className="mb-4">
          Are you sure you want to delete the manager:
        </p>

        <div className="bg-gray-100 rounded p-3 mb-6">
          <p><strong>Name:</strong> {manager.name}</p>
          <p><strong>Manager ID:</strong> {manager.manager_id}</p>
          <p><strong>Role:</strong> {manager.role}</p>
        </div>

        <p className="text-sm text-red-500 mb-6">
          ⚠️ This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded bg-gray-200"
          >
            Cancel
          </button>

          <button
            onClick={() => onConfirm(manager.manager_id)}
            className="px-4 py-2 rounded bg-red-600 text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteManagerModal;
