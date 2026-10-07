'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { DashboardOverview } from './DashboardOverview';
import { PostsManager } from './PostsManager';
import { PostEditor } from './PostEditor';
import { CategoriesManager } from './CategoriesManager';
import { SettingsView } from './SettingsView';
import { BackupRestoreView } from './BackupRestoreView';
import { RequestedPromptsManager } from './RequestedPromptsManager';
import { SearchHistoryManager } from './SearchHistoryManager';
import { X } from 'lucide-react';

export const AdminLayout = () => {
  const { adminSubView, editingPostId, isAuthenticated, setShowLoginModal, settings } = useApp();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md bg-neutral-950 p-8 rounded-3xl border border-neutral-800 text-white">
          <h2 className="text-xl font-bold">Authentication Required</h2>
          <p className="text-xs text-neutral-400">
            You must log in to access the WordPress Editorial CMS.
          </p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs shadow-lg shadow-blue-600/30"
          >
            Open Login Dialog
          </button>
        </div>
      </div>
    );
  }

  const renderCurrentSubView = () => {
    switch (adminSubView) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'posts':
        return <PostsManager />;
      case 'new-post':
      case 'edit-post':
        return <PostEditor key={editingPostId || 'new-post'} />;
      case 'categories':
        return <CategoriesManager key={settings.popularTags?.join(',') || 'categories'} />;
      case 'backup-restore':
        return <BackupRestoreView />;
      case 'requested-prompts':
        return <RequestedPromptsManager />;
      case 'search-history':
        return <SearchHistoryManager />;
      case 'settings':
        return <SettingsView key={settings.siteName + (settings.popularTags?.join(',') || '')} />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex flex-row">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AdminSidebar />
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/60 flex">
          <div className="relative w-64">
            <AdminSidebar />
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div
            className="flex-1"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        <AdminHeader onToggleSidebar={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {renderCurrentSubView()}
        </main>
      </div>
    </div>
  );
};
