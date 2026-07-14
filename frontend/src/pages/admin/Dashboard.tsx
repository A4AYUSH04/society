import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Wrench, ShieldAlert, CheckCircle, Clock, Volume2, TrendingUp, AlertTriangle, Users } from "lucide-react";
import { Link } from "react-router-dom";

interface AdminStats {
  total_complaints: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  overdue_count: number;
  complaints_per_month: Record<string, number>;
  recent_activity: any[];
  top_categories: { category: string; count: number }[];
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [residentsCount, setResidentsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const statsRes = await api.get("/dashboard/admin-stats");
      setStats(statsRes.data);

      const resList = await api.get("/admin/residents");
      setResidentsCount(resList.data.length);
    } catch (e) {
      console.error("Failed to load admin stats", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading || !stats) {
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

  // Get status counts with fallbacks
  const statusCounts = {
    Open: stats.by_status["Open"] || 0,
    Assigned: stats.by_status["Assigned"] || 0,
    "In Progress": stats.by_status["In Progress"] || 0,
    Resolved: stats.by_status["Resolved"] || 0,
    Closed: stats.by_status["Closed"] || 0,
    Cancelled: stats.by_status["Cancelled"] || 0,
  };

  const priorityCounts = {
    Low: stats.by_priority["Low"] || 0,
    Medium: stats.by_priority["Medium"] || 0,
    High: stats.by_priority["High"] || 0,
    Emergency: stats.by_priority["Emergency"] || 0,
  };

  return (
    <div className="space-y-8">
      {/* Top Welcome Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Admin Command Center</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Live metrics and oversight of your apartment society maintenance operations.</p>
      </div>

      {/* Stats Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Complaints", value: stats.total_complaints, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/20", icon: Wrench },
          { label: "Overdue Complaints", value: stats.overdue_count, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/20", icon: AlertTriangle },
          { label: "Total Registered Residents", value: residentsCount, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/20", icon: Users },
          { label: "Emergency Complaints", value: priorityCounts.Emergency, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/20", icon: ShieldAlert },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{item.label}</p>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-2">{item.value}</p>
              </div>
              <div className={`${item.bg} ${item.color} p-4 rounded-2xl`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main visualization grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Charts and monthly breakdown */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Status Breakdown Progress Bars */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-6">Status Distributions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(statusCounts).map(([status, val]) => {
                const percentage = stats.total_complaints > 0 ? (val / stats.total_complaints) * 100 : 0;
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-gray-700 dark:text-gray-300">{status}</span>
                      <span className="text-gray-900 dark:text-white">{val} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full ${
                          status === "Resolved" || status === "Closed" ? "bg-emerald-500" :
                          status === "Open" ? "bg-sky-500" :
                          status === "Cancelled" ? "bg-red-400" :
                          "bg-amber-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Complaints Trend Chart (CSS Bar Chart) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-6">Volume Trend (Last 6 Months)</h3>
            <div className="flex items-end justify-between h-48 pt-4 border-b border-gray-100 dark:border-gray-700">
              {Object.entries(stats.complaints_per_month).map(([month, val]) => {
                // Find max count to scale bars
                const maxVal = Math.max(...Object.values(stats.complaints_per_month), 1);
                const heightPercent = (val / maxVal) * 80; // keep max at 80% of container height
                return (
                  <div key={month} className="flex flex-col items-center flex-1 space-y-2">
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{val}</div>
                    <div
                      className="w-10 bg-gradient-to-t from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-t-xl transition-all duration-500 hover:opacity-90 cursor-pointer"
                      style={{ height: `${heightPercent}px` }}
                    />
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold truncate max-w-full">
                      {month}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Recent Activity Log */}
        <div className="space-y-8">
          
          {/* Top Complaint Categories list */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Top Categories</h3>
            <div className="space-y-4">
              {stats.top_categories.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No category statistics available.</p>
              ) : (
                stats.top_categories.map((tc, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{tc.category}</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400">
                      {tc.count} complaints
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity feed */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">System Activity Feed</h3>
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 divide-y divide-gray-100 dark:divide-gray-700">
              {stats.recent_activity.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">No recent actions.</p>
              ) : (
                stats.recent_activity.map((act, index) => (
                  <div key={index} className="pt-3 first:pt-0 text-xs">
                    <div className="flex items-center justify-between text-gray-400 mb-1">
                      <span className="font-bold">{act.actor_name} ({act.actor_role})</span>
                      <span>{new Date(act.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-gray-800 dark:text-gray-200">
                      Complaint <Link to={`/admin/complaints`} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">#{act.complaint_id}</Link> status update.
                    </p>
                    <p className="text-gray-500 mt-0.5 line-clamp-1 italic">"{act.note}"</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
