import React, { useState, useEffect } from 'react';
import { StorageService } from '@/lib/storage';
import { MessageSquare, CheckCircle, Clock, Search, Trash2 } from 'lucide-react';

const formatTimeAgo = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + " year" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + " month" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + " day" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + " hour" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + " minute" + (interval > 1 ? "s" : "") + " ago";
  return Math.floor(seconds) + " seconds ago";
};

export const RequestedPromptsManager = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setRequests(StorageService.getPromptRequests());
  }, []);

  const handleStatusChange = (id: string, newStatus: string) => {
    const updated = requests.map((req) => 
      req.id === id ? { ...req, status: newStatus } : req
    );
    setRequests(updated);
    StorageService.setPromptRequests(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this prompt request?')) {
      const updated = requests.filter((req) => req.id !== id);
      setRequests(updated);
      StorageService.setPromptRequests(updated);
    }
  };

  const filteredRequests = requests.filter((req) =>
    req.requestText.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#E60023]" />
            <span>Requested Prompts</span>
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage custom prompt requests submitted by users.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-100 dark:bg-neutral-800 border-none text-sm rounded-lg py-2 pl-9 pr-4 focus:ring-2 focus:ring-[#E60023] outline-none text-neutral-900 dark:text-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-50 dark:bg-neutral-950/50 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500">
              <tr>
                <th className="px-6 py-3 font-semibold">User</th>
                <th className="px-6 py-3 font-semibold">Request</th>
                <th className="px-6 py-3 font-semibold">Category</th>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={req.userAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-white">{req.userName}</p>
                          <p className="text-xs text-neutral-500">ID: {req.userId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-normal min-w-[250px] max-w-[400px]">
                      <p className="text-neutral-700 dark:text-neutral-300 line-clamp-2">{req.requestText}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        {req.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {formatTimeAgo(req.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      {req.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 px-2 py-1 rounded-full text-xs font-bold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 px-2 py-1 rounded-full text-xs font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {req.status === 'pending' ? (
                          <button
                            onClick={() => handleStatusChange(req.id, 'completed')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 text-xs font-bold transition-colors"
                          >
                            Mark Completed
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(req.id, 'pending')}
                            className="px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-xs font-bold transition-colors"
                          >
                            Mark Pending
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(req.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                    No requested prompts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
