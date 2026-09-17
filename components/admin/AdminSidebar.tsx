'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  FolderTree,
  Sparkles,
  Settings,
  Globe,
  LogOut,
  Sliders,
  ChevronRight,
  Zap,
  Database,
  Search,
} from 'lucide-react';

export const AdminSidebar = () => {
  const {
    adminSubView,
    setAdminSubView,
    setCurrentView,
    setEditingPostId,
    logout,
    posts,
    promptRequests,
    currentUser,
  } = useApp();

  const draftCount = posts.filter((p) => p.status === 'draft').length;

  interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
    action?: () => void;
  }

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'posts',
      label: 'All Prompts / Articles',
      icon: FileText,
      badge: posts.length,
    },
    {
      id: 'requested-prompts',
      label: 'Requested Prompts',
      icon: Sparkles,
      badge: promptRequests?.length || 0,
    },
    {
      id: 'new-post',
      label: 'Add New Prompt',
      icon: PlusCircle,
      action: () => {
        setEditingPostId(null);
        setAdminSubView('new-post');
      },
    },
    {
      id: 'categories',
      label: 'Categories & Tags',
      icon: FolderTree,
    },
    {
      id: 'search-history',
      label: 'User Search History',
      icon: Search,
      badge: null,
    },
    {
      id: 'backup-restore',
      label: 'Backup & Restore',
      icon: Database,
    },
    {
      id: 'settings',
      label: 'Site Settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-neutral-900 text-neutral-300 flex flex-col shrink-0 border-r border-neutral-800 min-h-screen">
      {/* WordPress Brand Header */}
      <div className="p-4 border-b border-neutral-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 relative bg-blue-600 shadow-md shadow-blue-500/20">
          <Image
            src="/logo.png"
            alt="Trending Copy Paste Photo Prompts"
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">WordPress CMS</h2>
          <span className="text-[11px] text-blue-400 font-medium">Trending Photo Prompts</span>
        </div>
      </div>

      {/* Main Nav Items */}
      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          Content Management
        </div>

        {navItems.map((item) => {
          const isActive = adminSubView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.action) {
                  item.action();
                } else {
                  setAdminSubView(item.id as any);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge !== null && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-blue-800 text-blue-100' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {draftCount > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs flex items-center justify-between">
            <span className="font-semibold">{draftCount} Unpublished Drafts</span>
            <button
              onClick={() => setAdminSubView('posts')}
              className="text-[11px] underline font-bold"
            >
              Review
            </button>
          </div>
        )}
      </div>

      {/* Footer Nav & Site View */}
      <div className="p-3 border-t border-neutral-800 space-y-2">
        <Link
          href="/"
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>View Live Site</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        </Link>

        <div className="pt-2 flex items-center justify-between px-2">
          <div className="text-xs">
            <p className="font-bold text-white leading-none">{currentUser?.name || 'Administrator'}</p>
            <p className="text-[10px] text-neutral-500 mt-0.5">{currentUser?.email || 'admin@trendinggeminiprompts.com'}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
