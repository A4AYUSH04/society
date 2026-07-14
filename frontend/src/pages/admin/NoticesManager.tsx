import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Notice } from "../../types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  FileText,
  Pin,
  Calendar,
  Trash2,
  Edit,
  Plus,
  X,
  Volume2,
  Clock,
  ShieldAlert
} from "lucide-react";

const noticeSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  is_pinned: z.boolean().default(false),
  is_scheduled: z.boolean().default(false),
  publish_date: z.string().optional().or(z.literal("")),
  expiry_date: z.string().optional().or(z.literal("")),
});

type NoticeSchemaType = z.infer<typeof noticeSchema>;

export const NoticesManager: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register: formRegister,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(noticeSchema),
    defaultValues: {
      is_pinned: false,
      is_scheduled: false,
    }
  });

  const watchIsScheduled = watch("is_scheduled", false);

  const fetchNotices = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/admin/notices");
      setNotices(response.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const openCreateModal = () => {
    setEditingNotice(null);
    reset({
      title: "",
      content: "",
      is_pinned: false,
      is_scheduled: false,
      publish_date: "",
      expiry_date: ""
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (notice: Notice) => {
    setEditingNotice(notice);
    
    // Format dates to YYYY-MM-DDThh:mm for datetime-local input fields
    const formatDt = (isoStr: string | null) => {
      if (!isoStr) return "";
      const d = new Date(isoStr);
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    reset({
      title: notice.title,
      content: notice.content,
      is_pinned: notice.is_pinned,
      is_scheduled: notice.is_scheduled,
      publish_date: formatDt(notice.publish_date),
      expiry_date: formatDt(notice.expiry_date)
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleDeleteNotice = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this notice?")) return;
    try {
      await api.delete(`/notices/${id}`);
      alert("Notice deleted successfully.");
      fetchNotices();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to delete notice.");
    }
  };

  const onSubmit = async (data: NoticeSchemaType) => {
    setErrorMsg(null);
    
    // Format dates back to ISO string or null
    const payload: any = {
      title: data.title,
      content: data.content,
      is_pinned: data.is_pinned,
      is_scheduled: data.is_scheduled,
      publish_date: data.publish_date ? new Date(data.publish_date).toISOString() : null,
      expiry_date: data.expiry_date ? new Date(data.expiry_date).toISOString() : null,
    };

    try {
      if (editingNotice) {
        await api.put(`/notices/${editingNotice.id}`, payload);
        alert("Notice updated successfully!");
      } else {
        await api.post("/notices", payload);
        alert("Notice created and published successfully!");
      }
      setIsModalOpen(false);
      fetchNotices();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.detail || "Failed to save notice. Please verify parameters."
      );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title & create button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2.5 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <Volume2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Notice Board Administration</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Draft, schedule, pin, and publish society announcements.
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md"
        >
          <Plus className="h-5 w-5 mr-1" />
          Post New Notice
        </button>
      </div>

      {/* Main notices grid/list */}
      {isLoading ? (
        <div className="py-24 text-center">
          <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading notice history...</span>
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-12 text-center rounded-3xl border border-gray-100 dark:border-gray-700/50 text-gray-500">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="font-semibold text-base">No announcements in history.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={`bg-white dark:bg-gray-800 p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                notice.is_pinned
                  ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/5 dark:bg-amber-950/5"
                  : "border-gray-100 dark:border-gray-700/50 shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {notice.is_pinned && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                        <Pin className="h-3 w-3 mr-1" /> Pinned
                      </span>
                    )}
                    {notice.is_scheduled && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
                        <Clock className="h-3 w-3 mr-1" /> Scheduled
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">
                    ID #{notice.id}
                  </span>
                </div>
                <h3 className="font-extrabold text-lg text-gray-950 dark:text-white line-clamp-1">{notice.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                  {notice.content}
                </p>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex flex-col text-[10px] text-gray-400 space-y-0.5">
                  <span className="inline-flex items-center">
                    <Calendar className="h-3 w-3 mr-1" /> Pub: {new Date(notice.publish_date).toLocaleDateString()}
                  </span>
                  {notice.expiry_date && (
                    <span className="inline-flex items-center">
                      <Clock className="h-3 w-3 mr-1" /> Exp: {new Date(notice.expiry_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditModal(notice)}
                    className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Edit Notice"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteNotice(notice.id)}
                    className="p-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
                    title="Delete Notice"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 max-w-xl w-full rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">
                {editingNotice ? `Edit Notice Details - ID #${editingNotice.id}` : "Create New Notice"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-1.5 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              {errorMsg && (
                <div className="flex items-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-4 rounded-xl text-red-800 dark:text-red-300 text-sm">
                  <ShieldAlert className="h-5 w-5 mr-3 shrink-0" />
                  {errorMsg}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Notice Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual General Body Meeting Scheduled"
                  {...formRegister("title")}
                  className={`w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                    errors.title ? "border-red-500" : "border-gray-200 dark:border-gray-700"
                  }`}
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-red-500">{String(errors.title.message)}</p>
                )}
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Notice Content
                </label>
                <textarea
                  rows={5}
                  placeholder="Write the details of the announcement here. Markdown structures are supported..."
                  {...formRegister("content")}
                  className={`w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                    errors.content ? "border-red-500" : "border-gray-200 dark:border-gray-700"
                  }`}
                />
                {errors.content && (
                  <p className="mt-1 text-xs text-red-500">{String(errors.content.message)}</p>
                )}
              </div>

              {/* Checkbox settings */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/30">
                <label className="flex items-center space-x-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    {...formRegister("is_pinned")}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Pin Notice to Top</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    {...formRegister("is_scheduled")}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Schedule Publication</span>
                </label>
              </div>

              {/* Date pickers (datetime-local) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 mb-1.5">
                    {watchIsScheduled ? "Publish Date & Time (Required)" : "Publish Date & Time (Optional)"}
                  </label>
                  <input
                    type="datetime-local"
                    {...formRegister("publish_date")}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 mb-1.5">
                    Expiry Date & Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    {...formRegister("expiry_date")}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 font-bold text-sm rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow"
                >
                  {editingNotice ? "Update Announcement" : "Publish Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
