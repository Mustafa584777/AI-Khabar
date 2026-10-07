'use client';
/* eslint-disable react-hooks/purity */
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { SearchQueryItem } from '@/types/prompt';
import {
  Search,
  Flame,
  Clock,
  Trash2,
  RefreshCw,
  Download,
  ExternalLink,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Calendar,
  Hash,
} from 'lucide-react';

export const SearchHistoryManager = () => {
  const { setSearchQuery, setCurrentView, showToast } = useApp();
  const [queries, setQueries] = useState<SearchQueryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<'most-searched' | 'recent' | 'alphabetical'>('most-searched');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const fetchQueries = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/search-queries?all=true', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.queries)) {
          setQueries(data.queries);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load search queries:', err);
      showToast('Failed to load search queries');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  const handleDeleteQuery = async (queryText: string) => {
    if (isDeleting) return;
    setIsDeleting(queryText);
    try {
      const res = await fetch(`/api/search-queries?query=${encodeURIComponent(queryText)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setQueries((prev) => prev.filter((q) => q.query.toLowerCase() !== queryText.toLowerCase()));
        showToast(`Deleted query: "${queryText}"`);
      } else {
        showToast('Failed to delete query');
      }
    } catch (err) {
      console.error('Error deleting query:', err);
      showToast('Error deleting query');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/search-queries?all=true', {
        method: 'DELETE',
      });
      if (res.ok) {
        setQueries([]);
        setShowClearConfirm(false);
        showToast('All search query history has been cleared.');
      } else {
        showToast('Failed to clear search history');
      }
    } catch (err) {
      console.error('Error clearing queries:', err);
      showToast('Error clearing queries');
    } finally {
      setIsClearing(false);
    }
  };

  const handleTestSearch = (queryText: string) => {
    setSearchQuery(queryText);
    setCurrentView('public');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleExportCSV = () => {
    if (queries.length === 0) {
      showToast('No search data to export');
      return;
    }
    const headers = ['Query', 'Search Count', 'Last Searched Date'];
    const rows = queries.map((q) => [
      `"${q.query.replace(/"/g, '""')}"`,
      q.count,
      `"${new Date(q.lastSearched).toISOString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `user-search-history-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Search queries exported to CSV');
  };

  // Analytics Calculations
  const stats = useMemo(() => {
    const totalQueries = queries.length;
    const totalSearches = queries.reduce((sum, q) => sum + (q.count || 0), 0);
    const maxSearched = queries.reduce((max, q) => ((q.count || 0) > (max.count || 0) ? q : max), queries[0] || { count: 0, query: 'None' });
    const avgSearches = totalQueries > 0 ? (totalSearches / totalQueries).toFixed(1) : '0';
    return { totalQueries, totalSearches, maxSearched, avgSearches };
  }, [queries]);

  // Filtered and Sorted Queries
  const displayedQueries = useMemo(() => {
    let list = [...queries];
    if (filterText.trim()) {
      const ft = filterText.toLowerCase().trim();
      list = list.filter((q) => q.query.toLowerCase().includes(ft));
    }

    if (sortBy === 'most-searched') {
      list.sort((a, b) => (b.count || 0) - (a.count || 0));
    } else if (sortBy === 'recent') {
      list.sort((a, b) => b.lastSearched - a.lastSearched);
    } else if (sortBy === 'alphabetical') {
      list.sort((a, b) => a.query.localeCompare(b.query));
    }

    return list;
  }, [queries, filterText, sortBy]);

  const maxCount = useMemo(() => {
    return Math.max(...queries.map((q) => q.count || 1), 1);
  }, [queries]);

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diffSec = Math.floor((now - timestamp) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto animate-fade-in text-neutral-900 dark:text-white">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-[#E60023] border border-red-200 dark:border-red-900/60 shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                User Search History & Analytics
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Track live search queries made by users across the website with search volumes and timestamps.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={fetchQueries}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95"
            id="refresh-search-history-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#E60023]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95"
            id="export-search-history-btn"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Export CSV</span>
          </button>

          {queries.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95"
              id="clear-search-history-btn"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Unique Queries */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Unique Queries</span>
            <Hash className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
            {stats.totalQueries.toLocaleString()}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Distinct search terms recorded</p>
        </div>

        {/* Card 2: Total Search Volume */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Searches</span>
            <BarChart3 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
            {stats.totalSearches.toLocaleString()}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Total user queries executed</p>
        </div>

        {/* Card 3: Top Searched Query */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">#1 Top Search</span>
            <Flame className="w-4 h-4 text-[#E60023]" />
          </div>
          <div className="text-lg sm:text-xl font-black text-[#E60023] truncate" title={stats.maxSearched.query}>
            {stats.maxSearched.query || '—'}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {stats.maxSearched.count || 0} searches recorded
          </p>
        </div>

        {/* Card 4: Average Searches per Term */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Frequency</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
            {stats.avgSearches}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Searches per unique query</p>
        </div>
      </div>

      {/* Filter and Sorting Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter search queries..."
            className="w-full pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#E60023]/40 transition-all"
            id="search-history-filter-input"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 shrink-0">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#E60023]/40"
            id="search-history-sort-select"
          >
            <option value="most-searched">Most Searched (Highest First)</option>
            <option value="recent">Recently Searched First</option>
            <option value="alphabetical">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Query List Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-16 text-center text-neutral-400 space-y-3">
            <div className="w-8 h-8 border-3 border-[#E60023] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold">Loading search queries...</p>
          </div>
        ) : displayedQueries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  <th className="py-3.5 px-4 sm:px-6 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 sm:px-6">Search Query</th>
                  <th className="py-3.5 px-4 sm:px-6 w-44">Number of Searches</th>
                  <th className="py-3.5 px-4 sm:px-6 w-36">Last Searched</th>
                  <th className="py-3.5 px-4 sm:px-6 w-36 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-xs">
                {displayedQueries.map((item, index) => {
                  const percentage = Math.min(100, Math.round((item.count / maxCount) * 100));
                  const isTopThree = index < 3 && sortBy === 'most-searched';

                  return (
                    <tr
                      key={item.query}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
                    >
                      {/* Rank */}
                      <td className="py-4 px-4 sm:px-6 text-center font-bold">
                        {isTopThree ? (
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black ${
                              index === 0
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : index === 1
                                ? 'bg-neutral-300/30 text-neutral-700 dark:text-neutral-300 border border-neutral-400/30'
                                : 'bg-amber-700/20 text-amber-700 dark:text-amber-300 border border-amber-700/30'
                            }`}
                          >
                            {index + 1}
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">{index + 1}</span>
                        )}
                      </td>

                      {/* Query Text */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-2">
                          <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0 group-hover:text-[#E60023] transition-colors" />
                          <span className="font-bold text-neutral-900 dark:text-white text-sm">
                            {item.query}
                          </span>
                        </div>
                      </td>

                      {/* Number of Searches with visual bar */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700">
                              <Flame className="w-3 h-3 text-[#E60023]" />
                              <span>{item.count} searches</span>
                            </span>
                            <span className="text-[10px] text-neutral-400 font-bold">{percentage}%</span>
                          </div>
                          {/* Relative popularity bar */}
                          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-red-500 to-[#E60023] rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Last Searched */}
                      <td className="py-4 px-4 sm:px-6 text-neutral-500 dark:text-neutral-400">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          <span>{formatTimeAgo(item.lastSearched)}</span>
                        </div>
                      </td>

                      {/* Actions: Test Search & Delete */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTestSearch(item.query)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                            title="Test this search on live site"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuery(item.query)}
                            disabled={isDeleting === item.query}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Delete query from history"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-neutral-500 dark:text-neutral-400 space-y-3">
            <Search className="w-10 h-10 mx-auto opacity-30 text-neutral-400" />
            <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
              No Search Queries Found
            </h3>
            <p className="text-xs max-w-sm mx-auto text-neutral-500">
              {filterText
                ? `No queries matched "${filterText}". Try a different filter keyword.`
                : 'Whenever users search on the site, their queries and search counts will be logged here.'}
            </p>
          </div>
        )}
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/60 flex items-center justify-center border border-red-200 dark:border-red-900/60">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Clear All Search History?
              </h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Are you sure you want to delete all recorded user search queries and counts? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/30 flex items-center gap-1.5"
              >
                {isClearing ? 'Clearing...' : 'Yes, Clear All History'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
