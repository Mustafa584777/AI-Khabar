'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { PromptRequestItem } from '@/types/prompt';
import { Sparkles, Trash2, CheckCircle2, Clock, Mail, User, PlusCircle, ExternalLink } from 'lucide-react';

export const RequestedPromptsManager = () => {
  const { promptRequests, refreshPromptRequests, updatePromptRequestStatus, deletePromptRequest, showToast, setAdminSubView, setEditingPostId } = useApp();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshPromptRequests();
  }, [refreshPromptRequests]);

  const handleFulfillToPrompt = (req: PromptRequestItem) => {
    // Preload session storage with request text to create a new prompt post from this request
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('promptcms_new_post_title', req.requestText.slice(0, 60));
      sessionStorage.setItem('promptcms_new_post_prompt', req.requestText);
      sessionStorage.setItem('promptcms_new_post_category', req.category || 'Photorealistic & Portraits');
      sessionStorage.setItem('promptcms_new_post_is_requested', 'true');
      sessionStorage.setItem('promptcms_new_post_requested_by_name', req.userName || '');
      sessionStorage.setItem('promptcms_new_post_requested_by_email', req.userEmail || '');
      sessionStorage.setItem('promptcms_new_post_requested_prompt_desc', req.requestText || '');
    }
    setEditingPostId(null);
    setAdminSubView('new-post');
    showToast(`Converted request from ${req.userName || 'user'} into new prompt editor!`);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-[#E60023]" />
            <span>User Requested Prompts</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Review custom prompt requests submitted by users, view user emails, and publish them as requested prompt cards.
          </p>
        </div>
        <button
          onClick={() => refreshPromptRequests()}
          className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all flex items-center gap-2 self-start"
        >
          <Clock className="w-4 h-4 text-[#E60023]" />
          <span>Refresh Requests</span>
        </button>
      </div>

      {/* Requests List */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">User / Email</th>
                <th className="py-3.5 px-4 sm:px-6">Requested Prompt Text</th>
                <th className="py-3.5 px-4 sm:px-6">Category / Tool</th>
                <th className="py-3.5 px-4 sm:px-6">Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
              {promptRequests && promptRequests.length > 0 ? (
                promptRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-4 px-4 sm:px-6 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden shrink-0 relative flex items-center justify-center font-bold text-neutral-700 dark:text-neutral-300">
                          {req.userAvatar ? (
                            <Image
                              src={req.userAvatar}
                              alt={req.userName || 'User'}
                              fill
                              sizes="36px"
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-white">{req.userName || 'Community User'}</p>
                          <p className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-[#E60023]" />
                            <span>{req.userEmail || 'No email provided'}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 max-w-md">
                      <p className="text-neutral-800 dark:text-neutral-200 font-mono text-[11px] leading-relaxed bg-neutral-50 dark:bg-neutral-950 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
                        {req.requestText}
                      </p>
                      <span className="text-[10px] text-neutral-400 mt-1 inline-block">
                        Submitted: {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6">
                      <div className="space-y-1">
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800 inline-block">
                          {req.category || 'General'}
                        </span>
                        <p className="text-[10px] text-neutral-400 font-medium">Tool: {req.aiTool || 'Midjourney'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 ${
                          req.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : req.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${req.status === 'completed' ? 'bg-emerald-500' : req.status === 'in_progress' ? 'bg-amber-500' : 'bg-neutral-400'}`} />
                        <span>{req.status.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleFulfillToPrompt(req)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm transition-all"
                          title="Create Prompt Post from Request"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Fulfill / Create</span>
                        </button>
                        <button
                          onClick={() => deletePromptRequest(req.id)}
                          className="p-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 transition-colors"
                          title="Delete Request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-500 dark:text-neutral-400">
                    <Sparkles className="w-8 h-8 mx-auto opacity-30 mb-2" />
                    <p className="font-bold text-sm">No user prompt requests yet</p>
                    <p className="text-xs text-neutral-400 mt-0.5">When users submit custom prompt requests from the homepage, they will appear here.</p>
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
