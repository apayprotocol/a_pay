'use client';

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  ExternalLink,
  MessageSquare,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Tag,
  ThumbsUp,
  X,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NetworkId } from '@/config/contracts';
import type { CommunityCategory, CommunityReply, CommunityThread } from '@/lib/community-store';

interface CommunityTabProps {
  walletAddress: string | null;
  isFounder?: boolean;
  onConnect?: () => void;
  activeNetwork?: NetworkId;
}

const CATEGORIES: ('All' | CommunityCategory)[] = [
  'All',
  'Integration',
  'Smart Contracts',
  'AI Agents & MCP',
  'Bug & Issues',
  'General',
];

const CATEGORY_COLORS: Record<string, string> = {
  Integration: 'bg-blue-500/10 text-blue-600 dark:text-sky-400 border-blue-500/30',
  'Smart Contracts':
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  'AI Agents & MCP': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
  'Bug & Issues': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
  General: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
};

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function truncateAddress(addr: string): string {
  if (!addr?.startsWith('0x')) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function CommunityTab({
  walletAddress,
  isFounder = false,
  onConnect,
  activeNetwork = 'base-sepolia',
}: CommunityTabProps) {
  const [threads, setThreads] = useState<CommunityThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | CommunityCategory>('All');
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});

  // New thread modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<CommunityCategory>('Integration');
  const [newContent, setNewContent] = useState('');
  const [isSubmittingThread, setIsSubmittingThread] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reply inputs keyed by threadId
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [submittingReplyFor, setSubmittingReplyFor] = useState<string | null>(null);

  // Fetch threads from backend
  const loadThreads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') {
        params.set('category', selectedCategory);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      const res = await fetch(`/api/community?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.threads) {
          setThreads(data.threads);
        }
      }
    } catch (err) {
      console.warn('Failed to load community discussions:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadThreads();
  };

  const toggleExpand = (threadId: string) => {
    setExpandedThreads((prev) => ({
      ...prev,
      [threadId]: !prev[threadId],
    }));
  };

  // Like / Upvote handler
  const handleToggleLike = async (threadId: string, replyId?: string) => {
    const userWallet =
      walletAddress ||
      '0xguest_' + (typeof window !== 'undefined' ? window.location.hostname : 'client');

    // Optimistic UI update
    setThreads((prevThreads) =>
      prevThreads.map((t) => {
        if (t.id !== threadId) return t;
        if (replyId) {
          const updatedReplies = t.replies.map((r) => {
            if (r.id !== replyId) return r;
            const hasLiked = r.likedBy.includes(userWallet.toLowerCase());
            return {
              ...r,
              likes: hasLiked ? Math.max(0, r.likes - 1) : r.likes + 1,
              likedBy: hasLiked
                ? r.likedBy.filter((w) => w !== userWallet.toLowerCase())
                : [...r.likedBy, userWallet.toLowerCase()],
            };
          });
          return { ...t, replies: updatedReplies };
        }
        const hasLiked = t.likedBy.includes(userWallet.toLowerCase());
        return {
          ...t,
          likes: hasLiked ? Math.max(0, t.likes - 1) : t.likes + 1,
          likedBy: hasLiked
            ? t.likedBy.filter((w) => w !== userWallet.toLowerCase())
            : [...t.likedBy, userWallet.toLowerCase()],
        };
      }),
    );

    try {
      await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_like',
          threadId,
          replyId,
          wallet: userWallet,
        }),
      });
    } catch {
      // Revert if failed
      loadThreads();
    }
  };

  // Submit new thread
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (newTitle.trim().length < 5) {
      setFormError('Title must be at least 5 characters.');
      return;
    }
    if (newContent.trim().length < 10) {
      setFormError('Question content must be at least 10 characters.');
      return;
    }

    const effectiveWallet = walletAddress || '0xdev_' + Math.random().toString(36).slice(2, 8);

    setIsSubmittingThread(true);
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_thread',
          title: newTitle,
          content: newContent,
          category: newCategory,
          authorWallet: effectiveWallet,
          authorName: isFounder ? 'A-Pay Founder' : undefined,
          network: activeNetwork,
        }),
      });

      if (res.ok) {
        setNewTitle('');
        setNewContent('');
        setIsModalOpen(false);
        await loadThreads();
      } else {
        const data = await res.json();
        setFormError(data.error || 'Failed to post thread.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Network error creating thread.');
    } finally {
      setIsSubmittingThread(false);
    }
  };

  // Submit reply
  const handleAddReply = async (threadId: string) => {
    const text = replyInputs[threadId]?.trim();
    if (!text || text.length < 2) return;

    const effectiveWallet = walletAddress || '0xdev_' + Math.random().toString(36).slice(2, 8);

    setSubmittingReplyFor(threadId);
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_reply',
          threadId,
          content: text,
          authorWallet: effectiveWallet,
          authorName: isFounder ? 'A-Pay Core Team' : undefined,
          isSolution: isFounder,
        }),
      });

      if (res.ok) {
        setReplyInputs((prev) => ({ ...prev, [threadId]: '' }));
        // Expand the thread so user sees their new reply
        setExpandedThreads((prev) => ({ ...prev, [threadId]: true }));
        await loadThreads();
      }
    } catch (err) {
      console.error('Failed to post reply:', err);
    } finally {
      setSubmittingReplyFor(null);
    }
  };

  // Solved counter stats
  const solvedCount = useMemo(() => threads.filter((t) => t.solved).length, [threads]);
  const totalReplies = useMemo(
    () => threads.reduce((acc, t) => acc + (t.repliesCount || 0), 0),
    [threads],
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Hero & Community Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl soft-shadow border border-slate-200/80 dark:border-slate-800/80 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-500/10 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-sky-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              Developer Ecosystem & Support
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-spatial text-slate-900 dark:text-white tracking-tight">
              Community Support & Solutions Hub
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Ask integration questions, report issues, and collaborate with protocol engineers and
              the community. All solutions are saved permanently so future developers can easily
              find answers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-xs font-mono text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Refresh discussions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 hover:opacity-90 text-white text-xs font-bold font-mono shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ask Question / Post Issue</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 font-mono text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60">
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">Total Discussions</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {threads.length}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60">
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">Verified Solutions</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {solvedCount}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60">
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">Community Answers</div>
            <div className="text-lg font-bold text-blue-600 dark:text-sky-400 mt-0.5">
              {totalReplies}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60">
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">Sorting Rule</div>
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Latest on Top</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar & Category Filters */}
      <div className="glass-panel p-4 rounded-3xl soft-shadow border border-slate-200/80 dark:border-slate-800/80 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search past questions, code snippets, error codes, solutions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Threads List (MANDATORY: Recent on Top) */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="glass-panel p-12 rounded-3xl text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 dark:text-sky-400" />
            <p className="text-xs font-mono text-slate-500">Loading community discussions...</p>
          </div>
        ) : threads.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl text-center space-y-3 border border-slate-200/80 dark:border-slate-800/80">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-spatial">
              No discussions found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No questions matched your search query or filter. Be the first to ask!
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-semibold"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Ask a Question</span>
            </button>
          </div>
        ) : (
          threads.map((thread) => {
            const isExpanded = Boolean(expandedThreads[thread.id]);
            const userHasLiked = walletAddress
              ? thread.likedBy.includes(walletAddress.toLowerCase())
              : false;

            return (
              <div
                key={thread.id}
                className="glass-panel p-5 sm:p-6 rounded-3xl soft-shadow border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/40 transition-all space-y-4"
              >
                {/* Thread Header Meta */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                        CATEGORY_COLORS[thread.category] ||
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {thread.category}
                    </span>

                    {thread.solved && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Solved</span>
                      </span>
                    )}

                    <span className="text-slate-400 dark:text-slate-600">•</span>

                    {/* Author Badge */}
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      {thread.isFounder ? (
                        <span className="inline-flex items-center gap-1 text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                          <ShieldCheck className="w-3 h-3" />
                          <span>A-Pay Founder</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          {thread.authorName || truncateAddress(thread.authorWallet)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Relative Timestamp */}
                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatRelativeTime(thread.updatedAt || thread.createdAt)}</span>
                  </div>
                </div>

                {/* Title & Body */}
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-spatial tracking-tight">
                    {thread.title}
                  </h3>
                  <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                    {thread.content}
                  </div>
                </div>

                {/* Actions: Likes & Expand Replies */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleLike(thread.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                        userHasLiked
                          ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-500/40 text-blue-600 dark:text-sky-400 font-bold'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 dark:hover:text-sky-400'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{thread.likes} Upvotes</span>
                    </button>

                    <button
                      onClick={() => toggleExpand(thread.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{thread.repliesCount || 0} Replies</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3 ml-0.5" />
                      ) : (
                        <ChevronDown className="w-3 h-3 ml-0.5" />
                      )}
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    ID: {thread.id.slice(0, 14)}
                  </span>
                </div>

                {/* Expanded Thread Replies & Solution Section */}
                {isExpanded && (
                  <div className="space-y-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-5 sm:p-6 rounded-b-3xl">
                    <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                      <span>Developer Answers & Solutions ({thread.replies.length}):</span>
                    </div>

                    {/* Replies List */}
                    {thread.replies.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-500 text-center font-mono">
                        No solutions posted yet. Know the answer? Post below!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {thread.replies.map((reply) => {
                          const replyHasLiked = walletAddress
                            ? reply.likedBy.includes(walletAddress.toLowerCase())
                            : false;

                          return (
                            <div
                              key={reply.id}
                              className={`p-4 rounded-2xl text-xs space-y-2 border transition-all ${
                                reply.isSolution
                                  ? 'bg-emerald-500/5 border-emerald-500/30'
                                  : 'bg-white/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <div className="flex items-center gap-2">
                                  {reply.isFounder ? (
                                    <span className="inline-flex items-center gap-1 text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                                      <ShieldCheck className="w-3 h-3" />
                                      <span>Core Team Solution</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-700 dark:text-slate-300 font-semibold">
                                      {reply.authorName || truncateAddress(reply.authorWallet)}
                                    </span>
                                  )}
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-400">
                                    {formatRelativeTime(reply.createdAt)}
                                  </span>
                                </div>

                                <button
                                  onClick={() => handleToggleLike(thread.id, reply.id)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] cursor-pointer ${
                                    replyHasLiked
                                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-sky-400 border-blue-500/40 font-bold'
                                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                  }`}
                                >
                                  <ThumbsUp className="w-2.5 h-2.5" />
                                  <span>{reply.likes}</span>
                                </button>
                              </div>

                              <div className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                                {reply.content}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Quick Reply Form */}
                    <div className="pt-2">
                      <div className="flex items-center gap-2">
                        <textarea
                          placeholder={
                            walletAddress
                              ? 'Write your solution or reply (Markdown code snippets supported)...'
                              : 'Write your solution or reply (connect wallet to display verified badge)...'
                          }
                          value={replyInputs[thread.id] || ''}
                          onChange={(e) =>
                            setReplyInputs((prev) => ({
                              ...prev,
                              [thread.id]: e.target.value,
                            }))
                          }
                          rows={2}
                          className="flex-1 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-none transition-colors"
                        />
                        <button
                          onClick={() => handleAddReply(thread.id)}
                          disabled={
                            submittingReplyFor === thread.id ||
                            !(replyInputs[thread.id] || '').trim()
                          }
                          className="px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-stretch"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Reply</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* New Question / Issue Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-xl rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 soft-shadow space-y-5 bg-white dark:bg-slate-950 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-sky-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-spatial">
                  Ask Question / Post Developer Issue
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateThread} className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-semibold block">
                  Category:
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as CommunityCategory)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Integration">
                    Integration (Next.js, FastAPI, Express, Cloudflare)
                  </option>
                  <option value="Smart Contracts">
                    Smart Contracts (APayRouter, Escrow, Staking)
                  </option>
                  <option value="AI Agents & MCP">
                    AI Agents & MCP (LangChain, Claude, Cursor, CrewAI)
                  </option>
                  <option value="Bug & Issues">
                    Bug & Issues (Replay nonces, HTTP 402, rate limits)
                  </option>
                  <option value="General">General (Protocol tokenomics, ecosystem)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-semibold block">
                  Title:
                </label>
                <input
                  type="text"
                  placeholder="e.g. How to verify EIP-712 payment authorization in Python?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-semibold block">
                  Detailed Description & Code Snippet:
                </label>
                <textarea
                  placeholder="Describe the issue, paste relevant code, error logs, or request instructions..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={5}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <div className="font-bold text-blue-600 dark:text-sky-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Author Identification</span>
                </div>
                <div>
                  {walletAddress ? (
                    <span>
                      Posting as verified wallet:{' '}
                      <code className="font-bold text-slate-900 dark:text-white">
                        {truncateAddress(walletAddress)}
                      </code>
                    </span>
                  ) : (
                    <span>
                      No wallet connected. You can post as a guest developer or{' '}
                      <button
                        type="button"
                        onClick={onConnect}
                        className="text-blue-600 underline font-bold"
                      >
                        connect wallet
                      </button>{' '}
                      for verified developer badge.
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingThread}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold transition-colors cursor-pointer"
                >
                  {isSubmittingThread ? 'Posting...' : 'Publish Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
