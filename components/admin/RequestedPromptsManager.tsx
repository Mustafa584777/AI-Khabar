import React, { useEffect, useState } from 'react';
import { MessageSquare, CheckCircle, Clock, Search, MoreVertical, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export const RequestedPromptsManager = () => {
  const { showToast, fetchPromptRequests, promptRequests } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPromptRequests();
  }, [fetchPromptRequests]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setIsUpdatingId(id);
    try {
      const res = await fetch('/api/prompt-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', id, status: newStatus })
      });
      if (res.ok) {
        showToast('Request status updated');
        await fetchPromptRequests();
      } else {
        const err = await res.json();
        showToast(`Failed: ${err.error}`);
      }
    } catch (e) {
      showToast('Error updating status');
    } finally {
      setIsUpdatingId(null);
    }
  };

  const filteredRequests = promptRequests.filter(req => 
    (req.requestText && req.requestText.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (req.userEmail && req.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (req.userName && req.userName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            Requested Prompts
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage and fulfill user prompt requests.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by text, name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-950/50 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Request</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                    <MessageSquare className="w-10 h-10 mx-auto text-neutral-400 mb-3" />
                    <p>No requests found.</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {req.userAvatar ? (
                          <img src={req.userAvatar} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                        )}
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-white text-xs">{req.userName || 'Unknown'}</p>
                          <p className="text-[10px] text-neutral-500">{req.userEmail || req.userId || 'No Email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-neutral-700 dark:text-neutral-300 font-medium line-clamp-2 max-w-md">
                        {req.requestText}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                        {req.category || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        req.status === 'completed' 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' 
                          : req.status === 'in_progress'
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700'
                      }`}>
                        {req.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                        {req.status === 'in_progress' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {req.status === 'pending' && <Clock className="w-3 h-3" />}
                        {req.status === 'completed' ? 'Completed' : req.status === 'in_progress' ? 'In Progress' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-500 whitespace-nowrap">
                      {new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isUpdatingId === req.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600 ml-auto" />
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {req.status !== 'in_progress' && (
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'in_progress')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-900/50 transition-colors"
                            >
                              Start
                            </button>
                          )}
                          {req.status !== 'completed' && (
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'completed')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900/50 transition-colors"
                            >
                              Fulfill
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
