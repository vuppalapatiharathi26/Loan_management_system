import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/monify-logo.png";

import { AuthService } from "../../services/auth.service";
import apiClient from "../../services/api.client";
import { QueryService } from "../../services/query.service";
import { AdminService } from "../../services/admin.service";
import type { Role } from "../../types/auth";

interface Props {
  role?: Role | null;
  setRole?: (r: Role | null) => void;
}

const Navbar = ({ role: propRole, setRole: propSetRole }: Props) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [internalRole, setInternalRole] = useState<Role | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [queryUnreadCount, setQueryUnreadCount] = useState(0);
  const [adminEscalationUnreadCount, setAdminEscalationUnreadCount] = useState(0);

  const role = propRole ?? internalRole;
  const setRole = propSetRole ?? setInternalRole;

  const navigate = useNavigate();
  const location = useLocation();

  // ====================================
  // Sync role from token
  // ====================================
  useEffect(() => {
    const tokenRole = AuthService.getRole();
    if (
      tokenRole === "USER" ||
      tokenRole === "ADMIN" ||
      tokenRole === "BANK_MANAGER" ||
      tokenRole === "LOAN_MANAGER"
    ) {
      setRole(tokenRole);
    } else {
      setRole(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadName = async () => {
      if (!role) {
        if (active) setDisplayName(null);
        return;
      }
      try {
        if (role === "USER") {
          const res = await apiClient.get("/users/me");
          if (active) setDisplayName(res.data?.name || null);
        } else if (role === "ADMIN") {
          const res = await apiClient.get("/admin/me");
          if (active) setDisplayName(res.data?.name || null);
        } else if (role === "BANK_MANAGER") {
          const res = await apiClient.get("/manager/bank/me");
          if (active) setDisplayName(res.data?.name || null);
        } else if (role === "LOAN_MANAGER") {
          const res = await apiClient.get("/manager/loan/me");
          if (active) setDisplayName(res.data?.name || null);
        }
      } catch {
        if (active) setDisplayName(null);
      }
    };
    void loadName();
    return () => {
      active = false;
    };
  }, [role]);

  useEffect(() => {
    if (role !== "BANK_MANAGER") {
      setQueryUnreadCount(0);
      return;
    }
    let active = true;
    const refresh = async () => {
      try {
        const data = await QueryService.listManagerNotifications();
        if (active) setQueryUnreadCount(data.total_unread || 0);
      } catch {
        if (active) setQueryUnreadCount(0);
      }
    };
    void refresh();
    const t = window.setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      window.clearInterval(t);
    };
  }, [role]);

  useEffect(() => {
    if (role !== "ADMIN") {
      setAdminEscalationUnreadCount(0);
      return;
    }
    let active = true;
    const refresh = async () => {
      try {
        const data = await AdminService.getNotifications({ unread_only: true, active_only: true, limit: 100 });
        if (active) setAdminEscalationUnreadCount(Array.isArray(data) ? data.length : 0);
      } catch {
        if (active) setAdminEscalationUnreadCount(0);
      }
    };
    void refresh();
    const t = window.setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      window.clearInterval(t);
    };
  }, [role]);

  // ====================================
  // Scroll shadow effect
  // ====================================
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ====================================
  // Logout
  // ====================================
  const handleLogout = () => {
    AuthService.logout();
    setRole(null);
    navigate("/home", { replace: true });
  };

  // ====================================
  // Role Navigation Items
  // ====================================
  const navItems: Record<Role, { label: string; path: string }[]> = {
    ADMIN: [
      { label: "Managers", path: "/admin/managers" },
      { label: "Users", path: "/admin/users" },
      { label: "Escalated Loans", path: "/admin/escalated-loans" },
    ],
    USER: [
      { label: "Dashboard", path: "/user/dashboard" },
      { label: "Loans", path: "/user/loans" },
      { label: "Profile", path: "/user/profile" },
    ],
    LOAN_MANAGER: [
      { label: "Dashboard", path: "/loan-manager/dashboard" },
      { label: "Escalated", path: "/loan-manager/escalated" },
      { label: "History", path: "/loan-manager/history" },
    ],
    BANK_MANAGER: [
      { label: "Dashboard", path: "/bank-manager/dashboard" },
      { label: "Queries", path: "/bank-manager/queries" },
    ],
  };

  const isActive = (path: string) =>
    location.pathname.startsWith(path);

  // Role label mapping for badges
  const getRoleLabel = (roleType: Role): string => {
    const roleLabels: Record<Role, string> = {
      USER: "User",
      ADMIN: "Bank Admin",
      BANK_MANAGER: "Bank Manager",
      LOAN_MANAGER: "Loan Manager",
    };
    return roleLabels[roleType] || roleType;
  };

  const getRoleBgColor = (roleType: Role): string => {
    const roleColors: Record<Role, string> = {
      USER: "bg-blue-600",
      ADMIN: "bg-red-600",
      BANK_MANAGER: "bg-purple-600",
      LOAN_MANAGER: "bg-orange-600",
    };
    return roleColors[roleType] || "bg-gray-600";
  };

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/40 backdrop-blur-xl border-b border-white/30 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="w-full h-20 flex items-center justify-between px-6 lg:px-10">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Monify"
              className="h-12 cursor-pointer"
              onClick={() => navigate("/home")}
            />
            {/* Role Badge */}
            {role && (
              <div className={`${getRoleBgColor(role)} text-white px-3 py-1 rounded-full text-xs font-bold shadow-md`}>
                {displayName ? `${getRoleLabel(role)}: ${displayName}` : getRoleLabel(role)}
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className={`hidden md:flex items-center gap-8 text-md font-medium transition ${
              scrolled ? "text-gray-800" : "text-black"
            }`}
          >
            {!role && (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="hover:text-green-600 transition"
                >
                  Login
                </button>

                <button
                  onClick={() => navigate("/register")}
                  className="bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700 transition"
                >
                  Register
                </button>
              </>
            )}

            {role &&
              navItems[role]?.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`transition ${
                    isActive(item.path)
                      ? "text-green-600 font-semibold"
                      : "hover:text-green-600"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {item.label}
                    {role === "BANK_MANAGER" && item.label === "Queries" && queryUnreadCount > 0 && (
                      <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {queryUnreadCount}
                      </span>
                    )}
                    {role === "ADMIN" && item.label === "Escalated Loans" && adminEscalationUnreadCount > 0 && (
                      <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {adminEscalationUnreadCount}
                      </span>
                    )}
                  </span>
                </Link>
              ))}

            {role && (
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 transition"
              >
                Logout
              </button>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className={`md:hidden text-2xl transition ${
              scrolled ? "text-gray-800" : "text-white"
            }`}
          >
            ☰
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t px-6 py-4 space-y-4">
            {!role && (
              <>
                <button
                  onClick={() => {
                    navigate("/login");
                    setMobileOpen(false);
                  }}
                  className="block w-full text-left"
                >
                  Login
                </button>

                <button
                  onClick={() => {
                    navigate("/register");
                    setMobileOpen(false);
                  }}
                  className="block w-full text-left"
                >
                  Register
                </button>
              </>
            )}

            {role &&
              navItems[role]?.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`block ${
                    isActive(item.path)
                      ? "text-green-600 font-semibold"
                      : ""
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {item.label}
                    {role === "BANK_MANAGER" && item.label === "Queries" && queryUnreadCount > 0 && (
                      <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {queryUnreadCount}
                      </span>
                    )}
                    {role === "ADMIN" && item.label === "Escalated Loans" && adminEscalationUnreadCount > 0 && (
                      <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {adminEscalationUnreadCount}
                      </span>
                    )}
                  </span>
                </Link>
              ))}

            {role && (
              <button
                onClick={handleLogout}
                className="block w-full text-left text-red-600"
              >
                Logout
              </button>
            )}
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
