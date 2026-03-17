import { useEffect, useState } from "react";

import ManagerDetailsModal from "../../components/admin/manager/ManagerDetailModal";
import ManagerTable from "../../components/admin/manager/ManagerTable";
import ManagerStatsCards from "../../components/admin/manager/ManagerStatsCards";
import RegisterManagerModal from "../../components/admin/manager/RegisterManagerModal";
import EditManagerModal from "../../components/admin/manager/EditManagerModal";
import DeleteManagerModal from "../../components/admin/manager/DeleteManagerModal";

import type { Manager, CreateManagerPayload } from "../../types/manager";
import { AdminService } from "../../services/admin.service";
import apiClient from "../../services/api.client";

const ManagerPage = () => {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [showRegister, setShowRegister] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [editManager, setEditManager] = useState<Manager | null>(null);
  const [deleteManager, setDeleteManager] = useState<Manager | null>(null);

  // ====================================
  // Fetch managers
  // ====================================
  useEffect(() => {
    AdminService.getManagers()
      .then(setManagers)
      .catch(console.error);
  }, []);

  // ====================================
  // Stats (derived)
  // ====================================
  const total = managers.length;
  const active = managers.filter(m => m.status === "ACTIVE").length;
  const disabled = managers.filter(m => m.status === "DISABLED").length;

  // ====================================
  // Register manager
  // ====================================
  const handleRegister = async (payload: CreateManagerPayload) => {
    try {
      const newManager = await AdminService.createManager(payload);
      setManagers(prev => [...prev, newManager]);
      setShowRegister(false);
    } catch (error) {
      console.error("Manager registration failed", error);
      alert("Failed to register manager");
    }
  };

  // ====================================
  // Edit manager
  // ====================================
  const handleSaveManager = async (updated: Manager) => {
    try {
      await AdminService.updateManager(
        updated.manager_id,
        {
          phone: updated.phone,
          role: updated.role,
        }
      );

      setManagers(prev =>
        prev.map(m =>
          m.manager_id === updated.manager_id ? { ...m, ...updated } : m
        )
      );
      setSelectedManager(prev =>
        prev?.manager_id === updated.manager_id ? { ...prev, ...updated } : prev
      );
      setEditManager(prev =>
        prev?.manager_id === updated.manager_id ? { ...prev, ...updated } : prev
      );

      setEditManager(null);
    } catch (err: any) {
      console.error("Update failed →", err.response?.data);
      alert(JSON.stringify(err.response?.data, null, 2));
    }
  };
  
  // ====================================
  // Delete manager
  // ====================================
  const handleDeleteManager = async (managerId: string) => {
    try {
      await apiClient.delete(
        `http://localhost:8080/admin/managers/${managerId}`
      );

      setManagers(prev =>
        prev.filter(m => m.manager_id !== managerId)
      );

      setDeleteManager(null);
    } catch (err) {
      console.error("Delete failed", err);
      alert("Failed to delete manager");
    }
  };

  // ====================================
  // Toggle status (frontend-only or API-backed)
  // ====================================
  const handleToggleStatus = async (manager: Manager) => {
    try {
      const endpoint =
        manager.status === "ACTIVE"
          ? "disable"
          : "enable";

      await apiClient.patch(
        `http://localhost:8080/admin/managers/${manager.manager_id}/${endpoint}`
      );

      setManagers((prev) =>
        prev.map((m) =>
          m.manager_id === manager.manager_id
            ? {
                ...m,
                status:
                  m.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
              }
            : m
        )
      );
    } catch (err) {
      alert("Failed to update manager status");
    }
  };


  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Managers</h2>

      {/* 🔹 STATS */}
      <ManagerStatsCards
        total={total}
        active={active}
        disabled={disabled}
      />

      <button
        onClick={() => setShowRegister(true)}
        className="bg-green-600 text-white px-4 py-2 mb-3 rounded font-semibold"
      >
        + Register Manager
      </button>

      <ManagerTable
        managers={managers}
        onView={setSelectedManager}
        onToggleStatus={(id) => {
          const manager = managers.find(m => m.manager_id === id);
          if (manager) handleToggleStatus(manager);
        }}
      />

      {/* Register */}
      {showRegister && (
        <RegisterManagerModal
          onClose={() => setShowRegister(false)}
          onRegister={handleRegister}
        />
      )}

      {/* View */}
      {selectedManager && (
        <ManagerDetailsModal
          manager={selectedManager}
          onClose={() => setSelectedManager(null)}
          onEdit={setEditManager}
          onDelete={setDeleteManager}
        />
      )}

      {/* Edit */}
      {editManager && (
        <EditManagerModal
          manager={editManager}
          onClose={() => setEditManager(null)}
          onSave={handleSaveManager}
        />
      )}

      {/* Delete */}
      {deleteManager && (
        <DeleteManagerModal
          manager={deleteManager}
          onCancel={() => setDeleteManager(null)}
          onConfirm={(id) => handleDeleteManager(id)}
        />
      )}
    </div>
  );
};

export default ManagerPage;
