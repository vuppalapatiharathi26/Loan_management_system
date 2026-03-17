import { Outlet } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import DashboardFooter from "../components/common/DashboardFooter";

const LoanManagerLayout = () => {
  return (
    <div className="flex flex-col min-h-screen w-full bg-gray-100">
      <Navbar />

      <main className="flex-1 pt-24 w-full">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      <DashboardFooter />
    </div>
  );
};


export default LoanManagerLayout;

