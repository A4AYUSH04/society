import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/authContext";
import { api } from "../services/api";
import { Notification } from "../types";
import {
  LayoutDashboard,
  Wrench,
  FileText,
  Users,
  LogOut,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  User as UserIcon,
  Shield,
  Activity,
  CheckCircle,
  Eye
} from "lucide-react";

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const response = await api.get("/resident/notifications");
      setNotifications(response.data.slice(0, 5)); // show latest 5
      
      const countRes = await api.get("/resident/notifications/unread-count");
      setUnreadCount(countRes.data.unread_count);
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.post("/resident/notifications/read-all");
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkSingleRead = async (id: number) => {
    try {
      await api.post(`/resident/notifications/${id}/read`);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const menuItems = user?.role.name === "Superadmin"
    ? [
        { label: "Dashboard", path: "/superadmin/dashboard", icon: LayoutDashboard },
        { label: "Complaints", path: "/admin/complaints", icon: Wrench },
        { label: "Notice Board", path: "/admin/notices", icon: FileText },
        { label: "Residents", path: "/admin/residents", icon: Users },
        { label: "Audit Logs", path: "/admin/audit-logs", icon: Activity },
      ]
    : user?.role.name === "Admin"
    ? [
        { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Complaints", path: "/admin/complaints", icon: Wrench },
        { label: "Notice Board", path: "/admin/notices", icon: FileText },
        { label: "Residents", path: "/admin/residents", icon: Users },
        { label: "Audit Logs", path: "/admin/audit-logs", icon: Activity },
      ]
    : [
        { label: "Dashboard", path: "/resident/dashboard", icon: LayoutDashboard },
        { label: "My Complaints", path: "/resident/complaints", icon: Wrench },
        { label: "Notice Board", path: "/resident/notices", icon: FileText },
        { label: "My Profile", path: "/resident/profile", icon: UserIcon },
      ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      
      {/* SIDEBAR FOR DESKTOP */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-r border-gray-200/50 dark:border-gray-800 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col justify-between shadow-xl shadow-slate-100/50 dark:shadow-none`}>
        <div>
          {/* Logo / Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-150/40 dark:border-gray-850">
            <Link to="/" className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-indigo-650 dark:text-indigo-400" />
              <span className="font-extrabold text-xl bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                SocietyCare
              </span>
            </Link>
            <button className="md:hidden text-gray-500 hover:text-gray-700" onClick={() => setIsSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 px-4 space-y-1.5">
            {menuItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 hover:translate-x-1 ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-200/50 dark:shadow-none nav-active-glow"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? "text-white" : "text-gray-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-gray-150/40 dark:border-gray-850 bg-gray-50/50 dark:bg-gray-900/40">
          <div className="flex items-center space-x-3 mb-4 px-2 py-1 bg-white/40 dark:bg-gray-850/20 border border-gray-100 dark:border-gray-800/40 rounded-2xl">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-2.5 rounded-xl text-white shadow-sm">
              <UserIcon className="h-4.5 w-4.5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-extrabold text-gray-900 dark:text-white truncate">{user?.full_name}</p>
              <span className="inline-flex items-center mt-0.5 px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/30">
                {user?.role.name}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center px-4 py-2.5 text-xs font-bold text-red-650 dark:text-red-400 bg-red-50/60 dark:bg-red-950/15 border border-red-100 dark:border-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/30 transition-all duration-150"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="flex-1 flex flex-col overflow-hidden md:pl-64">
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="hidden md:block font-bold text-lg text-gray-800 dark:text-white capitalize">
              {location.pathname.split("/").pop()?.replace("-", " ") || "Dashboard"}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            {/* THEME TOGGLE */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* NOTIFICATIONS ICON WITH DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 block h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold text-center leading-4">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsNotificationOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-40 overflow-hidden transform origin-top-right transition-all">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">Notifications</h4>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                          No recent notifications.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 flex items-start justify-between cursor-pointer ${
                              !notif.is_read ? "bg-indigo-50/20 dark:bg-indigo-900/10" : ""
                            }`}
                            onClick={() => handleMarkSingleRead(notif.id)}
                          >
                            <div className="pr-3">
                              <p className="text-xs font-bold text-gray-900 dark:text-white">{notif.title}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{notif.message}</p>
                              <span className="text-[10px] text-gray-400 block mt-2">
                                {new Date(notif.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {!notif.is_read && (
                              <span className="h-2 w-2 rounded-full bg-indigo-600 mt-1 shrink-0" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* CONTENT CONTAINER */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>

    </div>
  );
};
