import type { Manager } from "../../../types/manager";

interface Props {
  managers: Manager[];
  onView: (manager: Manager) => void;
  onToggleStatus: (managerId: string) => void;
}

const ManagerTable = ({
  managers,
  onView,
  onToggleStatus,
}: Props) => {
  return (
    <div className="w-full overflow-x-auto bg-white rounded-xl shadow-sm border">
      <table className="min-w-[900px] w-full border rounded">
        <thead className="bg-green-100">
          <tr>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Manager ID</th>
            <th className="p-2 border">Role</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Action</th>
          </tr>
        </thead>

        <tbody>
          {managers.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="p-6 text-center text-gray-500"
              >
                No managers found
              </td>
            </tr>
          ) : (
            managers.map((m) => (
              <tr key={m.manager_id}>
                <td className="p-2 border text-center">{m.name}</td>
                <td className="p-2 border text-center">{m.manager_id}</td>
                <td className="p-2 border text-center">{m.role}</td>
                <td className="p-2 border text-center">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      m.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {m.status}
                  </span>
                </td>

                <td className="p-2 border space-x-3">
                  <div className="flex justify-center gap-4">
                  <button
                    onClick={() => onView(m)}
                    className="text-green-600 font-semibold"
                  >
                    View
                  </button>

                  <button
                    onClick={() => onToggleStatus(m.manager_id)}
                    className={`font-semibold ${
                      m.status === "ACTIVE"
                        ? "text-red-600"
                        : "text-purple-600"
                    }`}
                  >
                    {m.status === "ACTIVE" ? "Disable" : "Enable"}
                  </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ManagerTable;
