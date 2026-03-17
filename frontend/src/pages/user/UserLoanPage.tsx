import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "../../types/user";
import { UserService } from "../../services/user.service";
import { useToast } from "../../context/ToastContext";
import LoanApplication from "../../components/user/LoanApplication";

const UserLoanPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const toast = useToast();

  const getErrorMessage = (error: unknown, fallback: string) => {
    const maybe = error as { response?: { data?: { detail?: string } } };
    return maybe?.response?.data?.detail || fallback;
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const profile = await UserService.getMyFullDetails();
        setUser(profile);

        // Redirect if KYC not completed
        if (profile.kycStatus !== "COMPLETED") {
          toast.push({
            type: "info",
            message: "Please complete KYC to access loans.",
          });
          navigate("/user/profile", { replace: true });
          return;
        }

        // Redirect if account not approved
        if (profile.accountStatus !== "APPROVED") {
          toast.push({
            type: "info",
            message: "Your account must be approved to access loans.",
          });
          navigate("/user/dashboard", { replace: true });
          return;
        }
      } catch (error) {
        toast.push({
          type: "error",
          message: getErrorMessage(error, "Failed to load user profile"),
        });
        navigate("/user/dashboard", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading loans page...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-center text-red-500">
        Unable to load user details
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Loan Management</h1>
        <p className="text-gray-600 mb-6">Apply for loans, view applications, and manage repayments</p>

        <div className="bg-white rounded shadow p-6">
          <LoanApplication user={user} />
        </div>
      </div>
    </div>
  );
};

export default UserLoanPage;
