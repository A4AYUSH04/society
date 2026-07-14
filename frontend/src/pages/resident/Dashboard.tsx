import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import { Complaint, Notice } from "../../types";
import { Wrench, Calendar, FileText, CheckCircle, Clock, Plus, ShieldAlert, ArrowRight } from "lucide-react";
import { useAuth } from "../../store/authContext";

interface StatsType {
  total_complaints: number;
  open_count: number;
  resolved_count: number;
  pending_count: number;
  recent_complaints: Complaint[];
  recent_notices: any[];
}

export const ResidentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsType | null>(null);
  const [isVerified, setIsVerified] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      // 1. Fetch profile to check verification status
      const profileRes = await api.get("/resident/profile");
      setIsVerified(profileRes.data.is_verified);

      // 2. Fetch dashboard stats
      const statsRes = await api.get("/dashboard/resident-stats");
      setStats(statsRes.data);
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-2xl"></div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Hello, {user?.full_name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Here's the summary of your society maintenance activity.
          </p>
        </div>
        {isVerified && (
          <Link
            to="/resident/complaints/new"
            className="inline-flex items-center px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-none hover:shadow-xl transition-all duration-150"
          >
            <Plus className="h-5 w-5 mr-1.5" />
            Raise New Complaint
          </Link>
        )}
      </div>

      {/* Verification warning */}
      {!isVerified && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200 dark:border-amber-900/30 p-6 rounded-3xl flex items-start space-x-4">
          <div className="bg-amber-100 dark:bg-amber-900/40 p-3 rounded-2xl text-amber-600 dark:text-amber-400 shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Account Pending Verification</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-2xl leading-relaxed">
              Your flat details are currently being reviewed by the society administrator. You will be able to raise maintenance complaints once verified. We appreciate your patience.
            </p>
          </div>
        </div>
      )}

      {/* Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Raised", value: stats?.total_complaints || 0, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/20", icon: Wrench },
          { label: "Open Complaints", value: stats?.open_count || 0, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/20", icon: Clock },
          { label: "Pending Resolution", value: stats?.pending_count || 0, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/20", icon: Clock },
          { label: "Resolved Issues", value: stats?.resolved_count || 0, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20", icon: CheckCircle },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COMPLAINTS LIST SECTION */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white">Recent Complaints</h3>
            <Link to="/resident/complaints" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center">
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-sm divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
            {stats?.recent_complaints.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="font-semibold text-sm">No complaints raised yet.</p>
                {isVerified && (
                  <Link to="/resident/complaints/new" className="mt-3 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                    Raise your first complaint
                  </Link>
                )}
              </div>
            ) : (
              stats?.recent_complaints.map((comp) => (
                <div key={comp.id} className="p-6 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 cursor-pointer" onClick={() => navigate(`/resident/complaints/${comp.id}`)}>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-gray-400">#{comp.id}</span>
                      <h4 className="font-bold text-gray-900 dark:text-white text-base">{comp.title}</h4>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {comp.category.name}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        comp.priority === "Emergency" ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400" :
                        comp.priority === "High" ? "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400" :
                        comp.priority === "Medium" ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400" :
                        "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      }`}>
                        {comp.priority}
                      </span>
                      {comp.is_overdue && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 animate-pulse">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 text-xs font-extrabold rounded-full ${
                      comp.status === "Resolved" || comp.status === "Closed" ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" :
                      comp.status === "Open" ? "bg-sky-100 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400" :
                      "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                    }`}>
                      {comp.status}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      {new Date(comp.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* NOTICES BULLETIN BOARD SECTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white">Notice Board</h3>
            <Link to="/resident/notices" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center">
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-sm space-y-4">
            {stats?.recent_notices.length === 0 ? (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="font-semibold text-sm">No announcements posted.</p>
              </div>
            ) : (
              stats?.recent_notices.map((notice) => (
                <div
                  key={notice.id}
                  onClick={() => navigate("/resident/notices")}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    notice.is_pinned 
                      ? "bg-amber-50/40 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30 hover:border-amber-300"
                      : "bg-gray-50/50 dark:bg-gray-700/25 border-gray-100 dark:border-gray-700/60 hover:border-gray-200 dark:hover:border-gray-600"
                  }`}
                >
                  {notice.is_pinned && (
                    <span className="absolute top-3.5 right-4 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400">
                      Pinned
                    </span>
                  )}
                  <h4 className="font-bold text-sm text-gray-950 dark:text-white pr-10 truncate">{notice.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                    {notice.content}
                  </p>
                  <div className="flex items-center text-[10px] text-gray-400 font-medium mt-3">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    {new Date(notice.publish_date).toLocaleDateString()}
                    {!notice.is_read && (
                      <span className="ml-auto inline-block h-2 w-2 rounded-full bg-indigo-600" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
