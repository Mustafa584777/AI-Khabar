'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Flame, Calendar, ArrowUpDown, Trash2, RefreshCw, Globe, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { SearchQueryItem } from '@/types/prompt';

export const SearchHistoryManager = () => {
  const { showToast, setSearchQuery, setCurrentView } = useApp();
  const [queries, setQueries] = useState<SearchQueryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'count' | 'recent' | 'alphabetical'>('count');

  const fetchQueries = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/search-queries?limit=all');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.queries)) {
          setQueries(data.queries);
        }
      }
    } catch (e) {
      console.error('Failed to fetch search queries history:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/search-queries?limit=all');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && Array.isArray(data.queries)) {
            setQueries(data.queries);
          }
        }
      } catch (e) {
        console.error('Failed to fetch search queries history:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTestSearch = (queryText: string) => {
    setSearchQuery(queryText);
    setCurrentView('public');
    showToast(`Testing search query: "${queryText}"`);
  };

  const filteredQueries = queries.filter(q =>
    q.query.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedQueries = [...filteredQueries].sort((a, b) => {
    if (sortBy === 'count') {
      return b.count - a.count;
    } else if (sortBy === 'recent') {
      return (b.lastSearched || 0) - (a.lastSearched || 0);
    } else {
      return a.query.localeCompare(b.query);
    }
  });

  const totalSearches = queries.reduce((sum, q) => sum + (q.count || 0), 0);
  const uniqueQueriesCount = queries.length;

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white">
              User Search History & Analytics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
              {uniqueQueriesCount} Queries
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time tracking of all search queries performed across the site by users and visitors with search frequency counts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchQueries}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-xs font-bold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Search Volume</p>
            <h3 className="text-3xl font-extrabold text-neutral-900 dark:text-white mt-1">{totalSearches.toLocaleString()}</h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Total queries executed site-wide</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Unique Search Terms</p>
            <h3 className="text-3xl font-extrabold text-neutral-900 dark:text-white mt-1">{uniqueQueriesCount}</h3>
            <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-1">Distinct search keywords logged</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Search className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter search queries..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-500 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort by:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="count">Most Searched Count</option>
            <option value="recent">Most Recent</option>
            <option value="alphabetical">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Queries Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-neutral-400 text-xs">
            Loading search history...
          </div>
        ) : sortedQueries.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 text-xs space-y-2">
            <Search className="w-8 h-8 mx-auto opacity-40" />
            <p>No search queries found matching your filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  <th className="py-3 px-4">Rank & Query</th>
                  <th className="py-3 px-4">Search Count</th>
                  <th className="py-3 px-4">Last Searched</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                {sortedQueries.map((item, index) => {
                  const dateStr = item.lastSearched
                    ? new Date(item.lastSearched).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Recently';

                  return (
                    <tr
                      key={item.id || item.query}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {item.query}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                          <Flame className="w-3 h-3 text-amber-500" />
                          {item.count} {item.count === 1 ? 'search' : 'searches'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-500 dark:text-neutral-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 opacity-60" />
                          {dateStr}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleTestSearch(item.query)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white text-xs font-semibold transition-colors"
                          title="Test search query live on site"
                        >
                          Test Search
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
