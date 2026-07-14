import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Complaint, Category } from "../../types";
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  AlertCircle,
  Eye,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  FileSpreadsheet,
  FileText,
  X
} from "lucide-react";

export const ComplaintsTable: React.FC = () => {
  // Query state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [overdueFilter, setOverdueFilter] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  
  // Data state
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Single detail modal state
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [updateStatus, setUpdateStatus] = useState("");
  const [updatePriority, setUpdatePriority] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  // Bulk actions state
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkPriority, setBulkPriority] = useState("");

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      let url = `/admin/complaints?page=${page}&page_size=${pageSize}&sort_by=${sortBy}&sort_order=${sortOrder}`;
      if (search) url += `&search=${search}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (priorityFilter) url += `&priority=${priorityFilter}`;
      if (categoryFilter) url += `&category_id=${categoryFilter}`;
      if (overdueFilter !== null) url += `&is_overdue=${overdueFilter}`;

      const response = await api.get(url);
      setComplaints(response.data.items);
      setTotalItems(response.data.total);
      setTotalPages(response.data.total_pages);
    } catch (e) {
      console.error("Failed to fetch complaints", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    setSelectedIds([]); // clear selection on page/filter change
  }, [page, sortBy, sortOrder, statusFilter, priorityFilter, categoryFilter, overdueFilter]);

  // Load categories once
  useEffect(() => {
    api.get("/categories?active_only=false").then(res => setCategories(res.data));
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchComplaints();
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // Selection triggers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(complaints.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Exports triggers
  const triggerCsvExport = () => {
    let url = `${api.defaults.baseURL}/admin/export/csv?`;
    if (statusFilter) url += `status=${statusFilter}&`;
    if (priorityFilter) url += `priority=${priorityFilter}&`;
    if (categoryFilter) url += `category_id=${categoryFilter}&`;
    if (overdueFilter !== null) url += `is_overdue=${overdueFilter}&`;

    // Download CSV
    api.get(url, { responseType: "blob" }).then(res => {
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(new Blob([res.data]));
      link.setAttribute("download", `complaints_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    });
  };

  const triggerExcelExport = () => {
    let url = `${api.defaults.baseURL}/admin/export/excel?`;
    if (statusFilter) url += `status=${statusFilter}&`;
    if (priorityFilter) url += `priority=${priorityFilter}&`;
    if (categoryFilter) url += `category_id=${categoryFilter}&`;
    if (overdueFilter !== null) url += `is_overdue=${overdueFilter}&`;

    api.get(url, { responseType: "blob" }).then(res => {
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(new Blob([res.data]));
      link.setAttribute("download", `complaints_report_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    });
  };

  // Open single detail modal
  const openDetailModal = async (complaint: Complaint) => {
    try {
      const res = await api.get(`/complaints/${complaint.id}`);
      setSelectedComplaint(res.data);
      setUpdateStatus(res.data.status);
      setUpdatePriority(res.data.priority);
      setAdminNote("");
      setModalError(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Save single detail update
  const handleSingleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setModalError(null);

    try {
      // 1. Status update if changed
      if (updateStatus !== selectedComplaint.status) {
        await api.put(`/admin/complaints/${selectedComplaint.id}/status`, {
          status: updateStatus,
          note: adminNote || "Updated status by administrator."
        });
      }

      // 2. Priority update if changed
      if (updatePriority !== selectedComplaint.priority) {
        await api.put(`/admin/complaints/${selectedComplaint.id}/priority`, {
          priority: updatePriority
        });
      }

      // Reload
      fetchComplaints();
      // Re-fetch details to show updated timeline
      const detailRes = await api.get(`/complaints/${selectedComplaint.id}`);
      setSelectedComplaint(detailRes.data);
      setAdminNote("");
      alert("Complaint updated successfully!");
    } catch (err: any) {
      setModalError(err.response?.data?.detail || "Failed to update complaint.");
    }
  };

  // Bulk operations triggers
  const handleBulkStatusUpdate = async () => {
    if (selectedIds.length === 0 || !bulkStatus) return;
    if (!window.confirm(`Update status of ${selectedIds.length} complaints to '${bulkStatus}'?`)) return;

    try {
      await api.post("/admin/complaints/bulk-status", {
        complaint_ids: selectedIds,
        new_status: bulkStatus,
        note: "Bulk status update by administrator."
      });
      alert("Bulk status updated successfully!");
      setBulkStatus("");
      setSelectedIds([]);
      fetchComplaints();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to apply bulk status.");
    }
  };

  const handleBulkPriorityUpdate = async () => {
    if (selectedIds.length === 0 || !bulkPriority) return;
    if (!window.confirm(`Update priority of ${selectedIds.length} complaints to '${bulkPriority}'?`)) return;

    try {
      await api.post("/admin/complaints/bulk-priority", {
        complaint_ids: selectedIds,
        new_priority: bulkPriority
      });
      alert("Bulk priority updated successfully!");
      setBulkPriority("");
      setSelectedIds([]);
      fetchComplaints();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to apply bulk priority.");
    }
  };

  const downloadSinglePDF = (id: number) => {
    api.get(`/complaints/${id}/pdf`, { responseType: "blob" }).then((res) => {
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(new Blob([res.data]));
      link.setAttribute("download", `complaint_report_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Title with CSV/Excel export buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Complaints Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track and process all complaints across building blocks.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={triggerCsvExport}
            className="inline-flex items-center px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="h-4.5 w-4.5 mr-1.5 text-emerald-600" />
            Export CSV
          </button>
          <button
            onClick={triggerExcelExport}
            className="inline-flex items-center px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="h-4.5 w-4.5 mr-1.5 text-indigo-600" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Advanced search and filter panel */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, Resident, Category, Title, Location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {/* Status filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting for Resident">Waiting for Resident</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Emergency">Emergency</option>
            </select>
          </div>

          {/* Category filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Overdue filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Overdue Status</label>
            <select
              value={overdueFilter === null ? "" : overdueFilter ? "true" : "false"}
              onChange={(e) => {
                const val = e.target.value;
                setOverdueFilter(val === "" ? null : val === "true");
                setPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none"
            >
              <option value="">All Complaints</option>
              <option value="true">Overdue Only</option>
              <option value="false">Non Overdue Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk actions bar if selection exists */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-fade-in shadow-inner">
          <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
            Selected {selectedIds.length} complaints for bulk actions:
          </span>
          <div className="flex flex-wrap items-center gap-3">
            {/* Status bulk update */}
            <div className="flex items-center space-x-2">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300"
              >
                <option value="">Bulk Status...</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Waiting for Resident">Waiting for Resident</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
                <option value="Rejected">Rejected</option>
              </select>
              <button
                onClick={handleBulkStatusUpdate}
                disabled={!bulkStatus}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                Apply Status
              </button>
            </div>

            {/* Priority bulk update */}
            <div className="flex items-center space-x-2">
              <select
                value={bulkPriority}
                onChange={(e) => setBulkPriority(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300"
              >
                <option value="">Bulk Priority...</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">Emergency</option>
              </select>
              <button
                onClick={handleBulkPriorityUpdate}
                disabled={!bulkPriority}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                Apply Priority
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Table view */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700/60">
                <th className="py-4 px-6 w-10">
                  <input
                    type="checkbox"
                    checked={complaints.length > 0 && selectedIds.length === complaints.length}
                    onChange={handleSelectAll}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="py-4 px-6 cursor-pointer" onClick={() => handleSort("id")}>
                  ID <ArrowUpDown className="inline h-3.5 w-3.5 ml-1" />
                </th>
                <th className="py-4 px-6">Title</th>
                <th className="py-4 px-6 cursor-pointer" onClick={() => handleSort("category_id")}>
                  Category <ArrowUpDown className="inline h-3.5 w-3.5 ml-1" />
                </th>
                <th className="py-4 px-6">Resident</th>
                <th className="py-4 px-6">Location</th>
                <th className="py-4 px-6 cursor-pointer" onClick={() => handleSort("status")}>
                  Status <ArrowUpDown className="inline h-3.5 w-3.5 ml-1" />
                </th>
                <th className="py-4 px-6 cursor-pointer" onClick={() => handleSort("priority")}>
                  Priority <ArrowUpDown className="inline h-3.5 w-3.5 ml-1" />
                </th>
                <th className="py-4 px-6 cursor-pointer" onClick={() => handleSort("created_at")}>
                  Date <ArrowUpDown className="inline h-3.5 w-3.5 ml-1" />
                </th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>Loading complaints...</span>
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    No complaints match current filter selections.
                  </td>
                </tr>
              ) : (
                complaints.map((comp) => (
                  <tr
                    key={comp.id}
                    className={`hover:bg-gray-50/50 dark:hover:bg-gray-700/10 transition-colors ${
                      comp.is_overdue ? "bg-red-50/5 dark:bg-red-950/5" : ""
                    }`}
                  >
                    <td className="py-4 px-6">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(comp.id)}
                        onChange={() => handleSelectOne(comp.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-4 px-6 text-xs font-bold text-gray-400">#{comp.id}</td>
                    <td className="py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">
                      {comp.title}
                    </td>
                    <td className="py-4 px-6 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {comp.category.name}
                    </td>
                    <td className="py-4 px-6 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {comp.resident.user.full_name}
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                      {comp.location}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        comp.status === "Resolved" || comp.status === "Closed" ? "bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400" :
                        comp.status === "Open" ? "bg-sky-100 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400" :
                        "bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400"
                      }`}>
                        {comp.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        comp.priority === "Emergency" ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 animate-pulse" :
                        comp.priority === "High" ? "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400" :
                        comp.priority === "Medium" ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400" :
                        "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400"
                      }`}>
                        {comp.priority}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-400 font-medium">
                      {new Date(comp.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => openDetailModal(comp)}
                        className="inline-flex items-center p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="View & Edit Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => downloadSinglePDF(comp.id)}
                        className="inline-flex items-center p-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                        title="Download PDF"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
          <span>
            Showing <b>{complaints.length}</b> of <b>{totalItems}</b> complaints.
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-bold text-gray-750 dark:text-white">Page {page} of {totalPages || 1}</span>
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

      {/* DETAIL MODAL DRAWER */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 max-w-4xl w-full rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">
                Complaint Processing - ID #{selectedComplaint.id}
              </h3>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-1.5 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {modalError && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-800 text-sm">
                  {modalError}
                </div>
              )}

              {/* Main detail stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <h4 className="font-bold text-xl text-gray-950 dark:text-white">{selectedComplaint.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{selectedComplaint.description}</p>
                  
                  <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-2xl grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-gray-400 font-bold">CATEGORY</p>
                      <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{selectedComplaint.category.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-bold">LOCATION / FLAT</p>
                      <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{selectedComplaint.location}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-bold">RESIDENT NAME</p>
                      <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{selectedComplaint.resident.user.full_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-bold">CONTACT NUMBER</p>
                      <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{selectedComplaint.resident.contact_number}</p>
                    </div>
                  </div>
                </div>

                {/* Photo attachment preview */}
                <div>
                  <h5 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Complaint Image</h5>
                  {selectedComplaint.photos.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700/50 h-36 flex flex-col items-center justify-center text-gray-400">
                      <span className="text-xs">No reference image</span>
                    </div>
                  ) : (
                    <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <img
                        src={`${api.defaults.baseURL?.replace("/api/v1", "")}${selectedComplaint.photos[0].file_path}`}
                        alt="Reference file"
                        className="w-full object-cover max-h-36"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Form inputs for action status & note */}
              <form onSubmit={handleSingleUpdate} className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-6">
                <h4 className="font-bold text-sm text-gray-950 dark:text-white">Admin Operations Panel</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 mb-1.5">Update Workflow Status</label>
                    <select
                      value={updateStatus}
                      onChange={(e) => setUpdateStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none"
                    >
                      <option value="Open">Open</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Waiting for Resident">Waiting for Resident</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 mb-1.5">Assign Priority Level</label>
                    <select
                      value={updatePriority}
                      onChange={(e) => setUpdatePriority(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 mb-1.5">Public / Internal Action Note</label>
                  <textarea
                    rows={2}
                    placeholder="Provide details about the technician assignment or closure reason (e.g. Electrician assigned to inspect. Will complete by Friday)..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow"
                  >
                    Save Changes
                  </button>
                </div>
              </form>

              {/* Logs/Timeline preview */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                <h4 className="font-bold text-sm text-gray-950 dark:text-white mb-4">Audit Workflow History</h4>
                <div className="space-y-3 pl-3 border-l border-gray-200 dark:border-gray-700 text-xs">
                  {selectedComplaint.histories.map((hist) => (
                    <div key={hist.id} className="space-y-0.5">
                      <div className="flex justify-between text-gray-400">
                        <span><b>{hist.actor_role}</b> ({new Date(hist.timestamp).toLocaleString()})</span>
                        <span>{hist.old_status || "N/A"} &rarr; {hist.new_status}</span>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 font-semibold">{hist.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
