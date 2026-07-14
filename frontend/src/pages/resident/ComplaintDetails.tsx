import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import { Complaint } from "../../types";
import { ArrowLeft, Download, ShieldAlert, CheckCircle, Clock, Trash, FileText, Ban } from "lucide-react";

export const ComplaintDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchComplaintDetails = async () => {
    try {
      const response = await api.get(`/complaints/${id}`);
      setComplaint(response.data);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.detail || "Failed to load complaint details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaintDetails();
  }, [id]);

  const handleCancelComplaint = async () => {
    if (!window.confirm("Are you sure you want to cancel this complaint?")) return;
    setIsCancelling(true);
    try {
      await api.post(`/complaints/${id}/cancel`);
      fetchComplaintDetails();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to cancel complaint.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!complaint) return;
    const downloadUrl = `${api.defaults.baseURL}/complaints/${complaint.id}/pdf`;
    
    // Trigger browser file download with auth token attached (can open window or fetch)
    api.get(`/complaints/${complaint.id}/pdf`, { responseType: "blob" })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `complaint_report_${complaint.id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
      })
      .catch((e) => console.error("Failed to download PDF", e));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
        <div className="h-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 animate-pulse rounded-3xl"></div>
      </div>
    );
  }

  if (errorMsg || !complaint) {
    return (
      <div className="space-y-4">
        <Link to="/resident/dashboard" className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
        </Link>
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-6 rounded-3xl text-red-800 dark:text-red-300 text-center">
          <ShieldAlert className="h-12 w-12 mx-auto mb-3" />
          <p className="font-bold">{errorMsg || "Complaint not found."}</p>
        </div>
      </div>
    );
  }

  const isCancellable = !["Resolved", "Closed", "Cancelled", "Rejected"].includes(complaint.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back and PDF download header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <Link to="/resident/dashboard" className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
        </Link>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400 font-bold text-sm rounded-xl transition-all"
          >
            <Download className="h-4.5 w-4.5 mr-1.5" />
            Download PDF Report
          </button>
          {isCancellable && (
            <button
              onClick={handleCancelComplaint}
              disabled={isCancelling}
              className="inline-flex items-center px-4 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-400 font-bold text-sm rounded-xl transition-all"
            >
              <Ban className="h-4.5 w-4.5 mr-1.5" />
              Cancel Complaint
            </button>
          )}
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/50 p-8 shadow-sm">
        
        {/* Banner if overdue */}
        {complaint.is_overdue && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-4 rounded-2xl flex items-center text-red-800 dark:text-red-300 text-sm">
            <ShieldAlert className="h-5 w-5 mr-3 shrink-0 animate-pulse" />
            <div>
              <strong>Overdue Notice:</strong> This complaint has exceeded the configured resolution threshold and is marked as overdue.
            </div>
          </div>
        )}

        {/* Basic header info */}
        <div className="border-b border-gray-100 dark:border-gray-700 pb-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-sm font-bold text-gray-400">Complaint ID: #{complaint.id}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              complaint.priority === "Emergency" ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400" :
              complaint.priority === "High" ? "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400" :
              "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}>
              {complaint.priority} Priority
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              complaint.status === "Resolved" || complaint.status === "Closed" ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" :
              "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400"
            }`}>
              {complaint.status}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-950 dark:text-white leading-tight">
            {complaint.title}
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Raised by you on {new Date(complaint.created_at).toLocaleString()}
          </p>
        </div>

        {/* Grid description and attachments */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-6 border-b border-gray-100 dark:border-gray-700">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-sm text-gray-400 dark:text-gray-500 uppercase tracking-wider">Description</h3>
            <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed whitespace-pre-wrap">
              {complaint.description}
            </p>
            <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-2xl grid grid-cols-2 gap-4 text-sm mt-6">
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500">CATEGORY</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{complaint.category.name}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500">LOCATION</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{complaint.location}</p>
              </div>
            </div>
          </div>

          {/* Photo attachment */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-gray-400 dark:text-gray-500 uppercase tracking-wider">Attachments</h3>
            {complaint.photos.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700 h-32 flex flex-col items-center justify-center text-gray-400">
                <FileText className="h-8 w-8 text-gray-300 mb-1" />
                <span className="text-xs font-medium">No photo uploaded</span>
              </div>
            ) : (
              complaint.photos.map((photo) => (
                <div key={photo.id} className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 shadow-inner group relative">
                  <img
                    src={`${api.defaults.baseURL?.replace("/api/v1", "")}${photo.file_path}`}
                    alt="Complaint reference"
                    className="w-full object-cover max-h-48"
                  />
                  <a
                    href={`${api.defaults.baseURL?.replace("/api/v1", "")}${photo.file_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-semibold text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    View Original
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Timeline details */}
        <div className="pt-8">
          <h3 className="font-bold text-xl text-gray-950 dark:text-white mb-6">Live Track Timeline</h3>
          <div className="relative border-l border-gray-200 dark:border-gray-700 ml-3 pl-6 space-y-8">
            {complaint.histories.map((hist, index) => {
              const isStatusChange = hist.old_status !== hist.new_status;
              return (
                <div key={hist.id} className="relative">
                  {/* Circle dot on line */}
                  <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-gray-800 border-2 ${
                    hist.new_status === "Resolved" || hist.new_status === "Closed"
                      ? "border-emerald-500 bg-emerald-50"
                      : hist.new_status === "Cancelled" || hist.new_status === "Rejected"
                      ? "border-red-500 bg-red-50"
                      : "border-indigo-500 bg-indigo-50"
                  }`} />
                  
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between text-xs text-gray-400">
                      <span className="font-bold">
                        {hist.actor_role} ({hist.actor_role === "System" ? "Automated" : "User"})
                      </span>
                      <span>
                        {new Date(hist.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                      {isStatusChange 
                        ? `Status changed from ${hist.old_status || 'Open'} to ${hist.new_status}` 
                        : "Complaint Update"
                      }
                    </p>
                    {hist.note && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100/50 dark:border-gray-700/50 inline-block">
                        {hist.note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
