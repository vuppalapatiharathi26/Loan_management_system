import { Outlet } from "react-router-dom";

const AdminDashboard = () => {
  return (
    <div className="w-full max-w-none">
      <Outlet />
    </div>
  );
};

export default AdminDashboard;
