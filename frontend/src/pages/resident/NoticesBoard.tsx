import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Notice } from "../../types";
import { Bell, Calendar, Pin, CheckCircle2, Volume2, User as UserIcon } from "lucide-react";

export const NoticesBoard: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotices = async () => {
    try {
      const response = await api.get("/notices");
      setNotices(response.data);
    } catch (e) {
      console.error("Failed to load notices", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleMarkAsRead = async (noticeId: number, isAlreadyRead: boolean) => {
    if (isAlreadyRead) return;
    try {
      await api.post(`/notices/${noticeId}/read`);
      // Update local state
      setNotices(prev =>
        prev.map(n => n.id === noticeId ? { ...n, is_read: true } : n)
      );
    } catch (e) {
      console.error("Failed to mark notice as read", e);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2.5 rounded-2xl text-indigo-600 dark:text-indigo-400">
          <Volume2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-950 dark:text-white">Society Notice Board</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Keep track of building announcements, meetings, and updates.
          </p>
        </div>
      </div>

      {notices.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-700/50 text-gray-500">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="font-semibold text-base">No announcements posted yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {notices.map((notice) => (
            <div
              key={notice.id}
              onClick={() => handleMarkAsRead(notice.id, notice.is_read)}
              className={`bg-white dark:bg-gray-800 p-6 rounded-3xl border transition-all relative ${
                notice.is_pinned
                  ? "border-amber-200 dark:border-amber-900/50 shadow-md shadow-amber-50/20 dark:shadow-none bg-amber-50/10 dark:bg-amber-950/5"
                  : "border-gray-100 dark:border-gray-700/50 shadow-sm hover:border-gray-200 dark:hover:border-gray-600"
              }`}
            >
              {/* Badges/Indicators */}
              <div className="flex items-center space-x-2 mb-3">
                {notice.is_pinned && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                    <Pin className="h-3 w-3 mr-1" />
                    Pinned
                  </span>
                )}
                {!notice.is_read ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 animate-pulse">
                    New Announcement
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Read
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="text-xl font-extrabold text-gray-950 dark:text-white leading-tight">
                {notice.title}
              </h2>

              {/* Author & Date metadata */}
              <div className="flex flex-wrap items-center text-xs text-gray-400 gap-4 mt-3 pb-4 border-b border-gray-100 dark:border-gray-700/50">
                <span className="inline-flex items-center">
                  <UserIcon className="h-3.5 w-3.5 mr-1" /> Posted by {notice.author.full_name} ({notice.author.role.name})
                </span>
                <span className="inline-flex items-center">
                  <Calendar className="h-3.5 w-3.5 mr-1" /> {new Date(notice.publish_date).toLocaleString()}
                </span>
              </div>

              {/* Notice Content (Markdown/newline supported) */}
              <div className="mt-4 text-gray-700 dark:text-gray-300 text-base leading-relaxed whitespace-pre-wrap">
                {notice.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
