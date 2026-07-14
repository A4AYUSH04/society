import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { AuditLog } from "../../types";
import { Activity, ShieldAlert, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/admin/audit-logs?page=${page}&page_size=${pageSize}`);
      setLogs(response.data.items);
      setTotalItems(response.data.total);
      setTotalPages(response.data.total_pages);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Title */}
      <div className="flex items-center space-x-3">
        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2.5 rounded-2xl text-indigo-600 dark:text-indigo-400">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Security Audit Log</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Immutable tracking of administrator and resident system actions.
          </p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700/60">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">User Identity</th>
                <th className="py-4 px-6">Action Tag</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>Loading logs...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    No system log records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/10 transition-colors">
                    <td className="py-4 px-6 text-gray-400 font-medium whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 font-bold text-gray-800 dark:text-gray-200">
                      {log.user_email || "System/Guest"}
                      {log.user_id && <span className="text-[10px] text-gray-400 ml-1">ID:{log.user_id}</span>}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-600 dark:text-gray-300 leading-relaxed max-w-[280px]">
                      {log.description}
                    </td>
                    <td className="py-4 px-6 text-gray-400 font-medium">
                      {log.ip_address || "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
          <span>
            Total logged events: <b>{totalItems}</b>
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-bold text-gray-700 dark:text-white">Page {page} of {totalPages || 1}</span>
            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
