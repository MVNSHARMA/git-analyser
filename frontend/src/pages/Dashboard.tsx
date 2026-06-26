import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'react-hot-toast';
import {
  Terminal,
  Plus,
  Bell,
  Settings as SettingsIcon,
  LogOut,
  MessageSquare,
  GitCommit,
  GitBranch,
  Users,
  Send,
  AlertTriangle,
  FileCode,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Trash2
} from 'lucide-react';

import { useAuthStore } from '../stores/authStore';
import { useRepoStore, Repository } from '../stores/repoStore';
import reposService from '../services/repos.service';
import chatService, { ChatMessage } from '../services/chat.service';
import commitsService from '../services/commits.service';
import branchesService from '../services/branches.service';
import contributorsService from '../services/contributors.service';
import notificationsService, { Notification } from '../services/notifications.service';
import authService from '../services/auth.service';

import Spinner from '../components/shared/Spinner';
import Button from '../components/shared/Button';
import Input from '../components/shared/Input';
import Avatar from '../components/shared/Avatar';
import Badge from '../components/shared/Badge';
import AddRepoModal from '../components/shared/AddRepoModal';
import IndexingProgress from '../components/shared/IndexingProgress';

export function Dashboard() {
  const { repoId: urlRepoId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { user, clearAuth } = useAuthStore();
  const { repos, setRepos, selectedRepo, setSelectedRepo } = useRepoStore();

  const [activeTab, setActiveTab] = useState<'chat' | 'commits' | 'branches' | 'contributors'>('chat');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Queries
  const { data: fetchedRepos, isLoading: isReposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: reposService.getRepos,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const { data: unreadCountRes } = useQuery({
    queryKey: ['unreadNotificationCount'],
    queryFn: notificationsService.getUnreadCount,
    refetchInterval: 10000,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.getNotifications(),
    enabled: isNotificationsOpen,
  });

  // Sync loaded repos with Zustand store
  useEffect(() => {
    if (fetchedRepos) {
      setRepos(fetchedRepos);
    }
  }, [fetchedRepos, setRepos]);

  // Handle selected repo based on URL
  useEffect(() => {
    if (urlRepoId) {
      const match = repos.find((r) => r.id === urlRepoId);
      if (match) {
        setSelectedRepo(match);
      }
    } else if (repos.length > 0 && !selectedRepo) {
      // Auto-select first repo if none in URL
      setSelectedRepo(repos[0]);
      navigate(`/repo/${repos[0].id}/chat`);
    }
  }, [urlRepoId, repos, selectedRepo, setSelectedRepo, navigate]);

  const handleSelectRepo = (repo: Repository) => {
    setSelectedRepo(repo);
    navigate(`/repo/${repo.id}/chat`);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      clearAuth();
      navigate('/login');
    } catch {
      clearAuth();
      navigate('/login');
    }
  };

  // Reindex Repo Mutation
  const reindexMutation = useMutation({
    mutationFn: reposService.reindexRepo,
    onSuccess: () => {
      toast.success('Reindexing scheduled');
      queryClient.invalidateQueries({ queryKey: ['repos'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to start indexing');
    },
  });

  return (
    <div className="flex h-screen bg-white text-[#111827] overflow-hidden font-sans">
      {/* 1. Left Sidebar */}
      <aside className="w-80 bg-white border-r-[3px] border-[#111827] flex flex-col z-20">
        {/* Logo */}
        <div className="p-6 border-b-[3px] border-[#111827] flex items-center justify-between bg-[#fcfcfc]">
          <div className="flex items-center gap-2">
            <span className="text-xl font-mono font-black select-none flex items-center text-[#111827]">
              <span className="text-[#DD614C] mr-0.5">&gt;_</span>
              <span>Git Analyser</span>
            </span>
          </div>

          {/* Notifications bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-1.5 border-2 border-[#111827] bg-white hover:bg-gray-100 text-[#111827] transition-colors relative brutal-hover"
            >
              <Bell className="w-4 h-4" />
              {unreadCountRes && unreadCountRes.count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#DD614C] text-white border border-[#111827] text-[8px] font-black h-4.5 w-4.5 rounded-none flex items-center justify-center">
                  {unreadCountRes.count}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {isNotificationsOpen && (
              <NotificationsPopover
                notifications={notifications || []}
                refetchCount={() => queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] })}
              />
            )}
          </div>
        </div>

        {/* Repos list */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-[#111827] uppercase tracking-wider font-black px-2">
            <span>Connected Repositories</span>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="p-1 border-2 border-[#111827] hover:bg-gray-100 text-[#111827] transition-all brutal-hover"
              title="Add Repository"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isReposLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : repos.length === 0 ? (
            <div className="text-center py-8 px-4 border-[2px] border-dashed border-[#111827] bg-white">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">No repositories added yet</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-3 text-xs text-[#DD614C] border-[#111827] font-black"
              >
                Add first repo
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {repos.map((repo) => {
                const isSelected = selectedRepo?.id === repo.id;
                const isIndexing = repo.indexing_status === 'indexing';

                return (
                  <div
                    key={repo.id}
                    className={`p-4 border-2 border-[#111827] transition-all cursor-pointer brutal-hover ${
                      isSelected
                        ? 'border-l-[6px] border-l-[#DD614C] bg-[#fffbfb]'
                        : 'bg-white'
                    }`}
                    onClick={() => handleSelectRepo(repo)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="truncate">
                        <h4 className="text-xs font-black truncate text-[#111827] uppercase tracking-wide">
                          {repo.display_name}
                        </h4>
                        <p className="text-[10px] text-gray-500 truncate mt-1 font-bold">
                          {repo.full_name}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reindexMutation.mutate(repo.id);
                        }}
                        disabled={isIndexing || reindexMutation.isPending}
                        className="p-1 border border-[#111827] hover:bg-gray-100 text-[#111827] transition-colors"
                        title="Reindex Repository"
                      >
                        <RefreshCw className={`w-3 h-3 ${isIndexing ? 'animate-spin text-[#DD614C]' : ''}`} />
                      </button>
                    </div>

                    <div className="mt-4">
                      <IndexingProgress repoId={repo.id} showDetails={false} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User Footer */}
        <div className="p-4 border-t-[3px] border-[#111827] bg-[#fcfcfc] flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/settings')}
          >
            <Avatar name={user?.display_name || 'User'} src={user?.avatar_url} size="sm" className="border-2 border-[#111827]" />
            <div className="truncate">
              <h4 className="text-xs font-black group-hover:text-[#DD614C] transition-colors truncate">
                {user?.display_name}
              </h4>
              <p className="text-[10px] text-gray-500 truncate font-bold uppercase tracking-wider mt-0.5">
                {user?.email}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 border border-[#111827] hover:bg-gray-100 text-[#111827] transition-colors brutal-hover"
              title="Settings"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 border border-[#111827] hover:bg-red-50 text-[#DC2626] transition-colors brutal-hover"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-white overflow-hidden relative">
        {!selectedRepo ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
            <div className="p-4 bg-white border-[3px] border-[#111827] text-[#DD614C] mb-6 brutal-hover">
              <Terminal className="w-10 h-10" />
            </div>
            <h2 className="text-4xl font-black uppercase tracking-wide">Get Started</h2>
            <p className="text-sm text-gray-500 max-w-sm mt-3 leading-relaxed font-bold uppercase tracking-wider">
              Add your first repository or select one from the sidebar to begin analyzing commits, branches, and chat.
            </p>
            <Button
              variant="primary"
              className="mt-6 font-black tracking-widest text-xs h-11"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Repository
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header Tabs */}
            <div className="px-6 py-5 border-b-[3px] border-[#111827] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#fdfdfd] z-10">
              <div>
                <h2 className="text-lg font-black text-[#111827] uppercase tracking-wider">
                  {selectedRepo.display_name}
                </h2>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">
                  {selectedRepo.full_name} • Default: {selectedRepo.default_branch}
                </p>
              </div>

              {/* Tabs list with bottom border */}
              <div className="flex gap-2">
                {[
                  { id: 'chat', label: 'Chat', icon: MessageSquare },
                  { id: 'commits', label: 'Commits', icon: GitCommit },
                  { id: 'branches', label: 'Branches', icon: GitBranch },
                  { id: 'contributors', label: 'Contributors', icon: Users },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider border-b-[3px] transition-all duration-100 ${
                        isActive
                          ? 'border-[#DD614C] text-[#DD614C] font-black'
                          : 'border-[#111827] text-[#111827] hover:border-[#DD614C] font-bold'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Tab View wrapper */}
            <div className="flex-1 overflow-hidden relative bg-white">
              {activeTab === 'chat' && <ChatTab repoId={selectedRepo.id} />}
              {activeTab === 'commits' && <CommitsTab repoId={selectedRepo.id} />}
              {activeTab === 'branches' && <BranchesTab repoId={selectedRepo.id} />}
              {activeTab === 'contributors' && <ContributorsTab repoId={selectedRepo.id} />}
            </div>
          </div>
        )}
      </main>

      {/* Add Repo Modal */}
      <AddRepoModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(repo) => handleSelectRepo(repo)}
      />
    </div>
  );
}

// -------------------------------------------------------------
// Sub-components: Notifications Popover
// -------------------------------------------------------------
function NotificationsPopover({
  notifications,
  refetchCount,
}: {
  notifications: Notification[];
  refetchCount: () => void;
}) {
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refetchCount();
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refetchCount();
      toast.success('All notifications marked as read');
    },
  });

  return (
    <div className="absolute right-0 mt-3 w-80 bg-white border-[3px] border-[#111827] shadow-none z-50 animate-fade-in max-h-96 flex flex-col">
      <div className="p-4 border-b-2 border-[#111827] bg-gray-50 flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-wider text-[#111827]">Notifications</h4>
        {notifications.some((n) => !n.read_at) && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="text-[10px] text-[#DD614C] hover:underline font-black uppercase tracking-wider"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y-2 divide-[#111827]">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500 font-bold uppercase tracking-wider">
            No notifications yet.
          </div>
        ) : (
          notifications.map((notif) => {
            const isUnread = !notif.read_at;
            return (
              <div
                key={notif.id}
                className={`p-4 transition-colors flex items-start gap-3 bg-white`}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-[#111827] uppercase tracking-wide truncate">{notif.title}</h5>
                    {isUnread && (
                      <button
                        onClick={() => markReadMutation.mutate(notif.id)}
                        className="text-[9px] text-[#DD614C] hover:underline font-black uppercase tracking-wider"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 mt-1 leading-normal font-medium">
                    {notif.body}
                  </p>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-2.5 block">
                    {new Date(notif.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Sub-components: Chat Tab
// -------------------------------------------------------------
function ChatTab({ repoId }: { repoId: string }) {
  const navigate = useNavigate();
  const { convId: urlConvId } = useParams();
  const queryClient = useQueryClient();

  const [input, setInput] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: conversations, isLoading: isConvsLoading } = useQuery({
    queryKey: ['conversations', repoId],
    queryFn: () => chatService.getConversations(repoId),
    enabled: !!repoId,
  });

  const activeConvId = urlConvId || (conversations && conversations[0]?.id);

  const { data: messages, isLoading: isMessagesLoading } = useQuery({
    queryKey: ['messages', activeConvId],
    queryFn: () => chatService.getMessages(activeConvId!),
    enabled: !!activeConvId,
  });

  // Automatically scroll chat to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  // Mutations
  const createConvMutation = useMutation({
    mutationFn: () => chatService.createConversation(repoId, null),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', repoId] });
      navigate(`/repo/${repoId}/chat/${data.id}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to start conversation');
    },
  });

  const deleteConvMutation = useMutation({
    mutationFn: chatService.deleteConversation,
    onSuccess: () => {
      toast.success('Conversation deleted');
      queryClient.invalidateQueries({ queryKey: ['conversations', repoId] });
      navigate(`/repo/${repoId}/chat`);
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    let targetConvId = activeConvId;

    // 1. Create a conversation if none exists
    if (!targetConvId) {
      try {
        const newConv = await chatService.createConversation(repoId, null);
        targetConvId = newConv.id;
        queryClient.invalidateQueries({ queryKey: ['conversations', repoId] });
        navigate(`/repo/${repoId}/chat/${newConv.id}`);
      } catch (err: any) {
        toast.error('Could not create conversation');
        return;
      }
    }

    const userMsg = input.trim();
    setInput('');
    setStreamingMessage('');
    setIsStreaming(true);

    // Optimistically update UI
    const optimisticUserMsg = {
      id: 'optimistic-user',
      conversation_id: targetConvId,
      role: 'user' as const,
      content: userMsg,
      context_shas: null,
      created_at: new Date().toISOString(),
    };

    queryClient.setQueryData(['messages', targetConvId], (old: any) => {
      return [...(old || []), optimisticUserMsg];
    });

    // 2. Hit SSE stream
    await chatService.streamChat(
      targetConvId,
      userMsg,
      (delta) => {
        setStreamingMessage((prev) => prev + delta);
      },
      () => {
        // stream complete
        setIsStreaming(false);
        setStreamingMessage('');
        queryClient.invalidateQueries({ queryKey: ['messages', targetConvId] });
        queryClient.invalidateQueries({ queryKey: ['conversations', repoId] });
      },
      (err) => {
        console.error(err);
        setIsStreaming(false);
        setStreamingMessage('');
        toast.error(err.message || 'AI streaming error occurred. Try again.');
      }
    );
  };

  return (
    <div className="absolute inset-0 flex">
      {/* Conversation Sidebar (Inside Chat Tab) */}
      <div className="w-64 border-r-2 border-[#111827] flex flex-col bg-white h-full">
        <div className="p-4 border-b-2 border-[#111827] bg-[#fcfcfc]">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => createConvMutation.mutate()}
            disabled={createConvMutation.isPending}
            className="w-full text-xs py-2 bg-white"
          >
            <Plus className="w-3.5 h-3.5 mr-2" /> New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-white">
          {isConvsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : !conversations || conversations.length === 0 ? (
            <div className="text-center text-[10px] text-gray-500 font-bold uppercase tracking-wider py-6">
              No conversations.
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = activeConvId === conv.id;
              return (
                <div
                  key={conv.id}
                  className={`p-2.5 border-2 border-[#111827] text-xs cursor-pointer flex items-center justify-between group transition-colors brutal-hover ${
                    isSelected
                      ? 'bg-[#fffaf9] border-l-[4px] border-l-[#DD614C] text-[#111827] font-black'
                      : 'text-[#111827] bg-white font-bold'
                  }`}
                  onClick={() => navigate(`/repo/${repoId}/chat/${conv.id}`)}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <MessageSquare className="w-3.5 h-3.5 text-[#111827] flex-shrink-0" />
                    <span className="truncate truncate-clip leading-normal">
                      {conv.title || 'Untitled Conversation'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConvMutation.mutate(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 border border-[#111827] hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main chat viewport */}
      <div className="flex-1 flex flex-col h-full bg-[#fcfcfc]">
        {/* Messages list */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {isMessagesLoading && activeConvId && messages === undefined ? (
            <div className="flex items-center justify-center h-full">
              <Spinner />
            </div>
          ) : !activeConvId ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white">
              <MessageSquare className="w-12 h-12 text-[#111827] mb-4" />
              <h4 className="text-lg font-black uppercase tracking-wide">Start a Conversation</h4>
              <p className="text-xs text-gray-500 mt-2 max-w-xs leading-normal font-bold uppercase tracking-wider">
                Ask about commit diffs, lines changes, repository files, or active contributors.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages?.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {streamingMessage && (
                <MessageBubble
                  message={{
                    id: 'streaming',
                    conversation_id: activeConvId,
                    role: 'assistant',
                    content: streamingMessage,
                    context_shas: null,
                    created_at: new Date().toISOString(),
                  }}
                />
              )}
              {isStreaming && !streamingMessage && (
                <div className="flex gap-4 p-5 bg-[#fffaf9] border-2 border-[#DD614C] max-w-2xl">
                  <Avatar name="Git Analyser" size="sm" className="border border-[#111827]" />
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 bg-[#DD614C] rounded-none animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2.5 w-2.5 bg-[#DD614C] rounded-none animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2.5 w-2.5 bg-[#DD614C] rounded-none animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input box */}
        <div className="p-4 border-t-[3px] border-[#111827] bg-[#fcfcfc]">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-center">
            <input
              type="text"
              placeholder="Ask a question about the repository..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isStreaming}
              className="w-full pl-4 pr-12 py-3 bg-white border-2 border-[#111827] text-xs text-[#111827] placeholder-gray-500 outline-none focus:border-[3px] focus:border-[#DD614C] transition-all font-sans"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="absolute right-3 p-1.5 bg-[#DD614C] border-2 border-[#111827] text-white transition-all brutal-hover"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Partial<ChatMessage> }) {
  const isUser = message.role === 'user';

  const handleFeedback = async (val: 'like' | 'dislike') => {
    if (!message.id || message.id === 'streaming' || message.id === 'optimistic-user') return;
    try {
      await chatService.submitFeedback(message.id, val);
      toast.success('Feedback recorded!');
    } catch {
      toast.error('Failed to submit feedback');
    }
  };

  return (
    <div
      className={`flex gap-4 p-5 max-w-3xl border-2 transition-all ${
        isUser
          ? 'bg-white border-[#111827] ml-auto'
          : 'bg-[#fffaf9] border-[#DD614C]'
      }`}
    >
      <Avatar
        name={isUser ? 'User' : 'Git Analyser'}
        size="sm"
        className={`border-2 ${isUser ? 'order-last border-[#111827]' : 'order-first border-[#DD614C]'}`}
      />
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">
            {isUser ? 'You' : 'Git Analyser'}
          </span>
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
            {message.created_at && new Date(message.created_at).toLocaleTimeString()}
          </span>
        </div>

        {/* Message body */}
        <div className="text-sm leading-relaxed text-[#111827] prose prose-invert font-sans font-medium">
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ...props }) {
                  const isInline = !className && !String(children).includes('\n');
                  return isInline ? (
                    <code className="bg-[#DD614C] bg-opacity-10 text-[#DD614C] px-1.5 py-0.5 rounded-none font-mono text-xs font-bold" {...props}>
                      {children}
                    </code>
                  ) : (
                    <pre className="bg-[#fcfcfc] p-4 rounded-none overflow-x-auto border-2 border-[#111827] text-xs font-mono my-2 scrollbar-thin text-[#111827]">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  );
                },
              }}
            >
              {message.content || ''}
            </ReactMarkdown>
          )}
        </div>

        {/* Feedback triggers for assistant */}
        {!isUser && message.id && message.id !== 'streaming' && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t-2 border-[#DD614C]/30">
            <button
              onClick={() => handleFeedback('like')}
              className="p-1 border border-[#111827] bg-white hover:bg-gray-100 text-[#111827] transition-colors brutal-hover"
              title="Helpful"
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleFeedback('dislike')}
              className="p-1 border border-[#111827] bg-white hover:bg-red-50 text-[#DC2626] transition-colors brutal-hover"
              title="Not helpful"
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Sub-components: Commits Tab
// -------------------------------------------------------------
function CommitsTab({ repoId }: { repoId: string }) {
  const [search, setSearch] = useState('');
  const [author, setAuthor] = useState('');
  const [branch, setBranch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch branches for dropdown filter
  const { data: branches } = useQuery({
    queryKey: ['branches', repoId],
    queryFn: () => branchesService.getBranches(repoId),
  });

  const filters = {
    search: search.trim() || undefined,
    author: author.trim() || undefined,
    branch: branch || undefined,
    from: from || undefined,
    to: to || undefined,
    limit,
    offset: (page - 1) * limit,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['commits', repoId, filters],
    queryFn: () => commitsService.getCommits(repoId, filters),
    enabled: !!repoId,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="absolute inset-0 p-6 flex flex-col h-full bg-white overflow-y-auto">
      {/* Filters Form */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6 bg-white border-[3px] border-[#111827] p-4 brutal-hover">
        <Input
          placeholder="Search messages..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="mb-0 py-2"
        />

        <Input
          placeholder="Author..."
          value={author}
          onChange={(e) => {
            setAuthor(e.target.value);
            setPage(1);
          }}
          className="mb-0 py-2"
        />

        <div className="flex flex-col justify-end mb-4">
          <select
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              setPage(1);
            }}
            className="w-full px-4 py-2.5 bg-white border-2 border-[#111827] text-xs text-[#111827] placeholder-gray-500 focus:outline-none focus:border-[3px] focus:border-[#DD614C] transition-all font-sans"
          >
            <option value="">All Branches</option>
            {branches?.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 items-end mb-4">
          <input
            type="date"
            placeholder="From"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="w-1/2 px-2 py-2 bg-white border-2 border-[#111827] text-xs text-[#111827] focus:outline-none"
          />
          <input
            type="date"
            placeholder="To"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="w-1/2 px-2 py-2 bg-white border-2 border-[#111827] text-xs text-[#111827] focus:outline-none"
          />
        </div>

        <div className="flex items-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setAuthor('');
              setBranch('');
              setFrom('');
              setTo('');
              setPage(1);
            }}
            className="w-full text-xs py-2 border-2 border-[#111827]"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Commit Table viewport */}
      <div className="flex-1 overflow-x-auto min-h-0 bg-white border-2 border-[#111827]">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : !data || data.commits.length === 0 ? (
          <div className="text-center py-20 text-xs text-gray-500 font-bold uppercase tracking-wider">
            No commits matching filter parameters found.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs border-2 border-[#111827]">
            <thead>
              <tr className="border-b-2 border-[#111827] bg-gray-50 uppercase text-[10px] font-black text-[#111827]">
                <th className="p-3 border-r border-[#111827]">SHA</th>
                <th className="p-3 border-r border-[#111827]">Author</th>
                <th className="p-3 border-r border-[#111827]">Message</th>
                <th className="p-3 border-r border-[#111827]">Date</th>
                <th className="p-3 text-right">Additions/Deletions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111827] text-[#111827]">
              {data.commits.map((commit, idx) => (
                <tr key={commit.id} className={`${idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'} hover:bg-[#fffbfb] transition-colors`}>
                  <td className="p-3 border-r border-[#111827] font-mono font-bold text-[#DD614C]">
                    {commit.short_sha}
                  </td>
                  <td className="p-3 border-r border-[#111827]">
                    <div className="font-black text-[#111827]">{commit.author_name}</div>
                    <div className="text-[10px] text-gray-500 font-bold">{commit.author_email}</div>
                  </td>
                  <td className="p-3 border-r border-[#111827] font-medium leading-relaxed max-w-sm truncate">
                    {commit.message_subject}
                  </td>
                  <td className="p-3 border-r border-[#111827] font-medium">
                    {new Date(commit.committed_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right font-black">
                    <span className="text-[#16A34A]">+{commit.additions || 0}</span>
                    {' / '}
                    <span className="text-[#DC2626]">-{commit.deletions || 0}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">
            Page {page} of {totalPages} ({data?.total} total commits)
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-xs"
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Sub-components: Branches Tab
// -------------------------------------------------------------
function BranchesTab({ repoId }: { repoId: string }) {
  const [baseBranch, setBaseBranch] = useState('');
  const [headBranch, setHeadBranch] = useState('');
  const [comparison, setComparison] = useState<any>(null);
  const [comparing, setComparing] = useState(false);

  const { data: branches, isLoading: isBranchesLoading } = useQuery({
    queryKey: ['branches', repoId],
    queryFn: () => branchesService.getBranches(repoId),
  });

  const handleCompare = async () => {
    if (!baseBranch || !headBranch) {
      toast.error('Please select both base and head branches');
      return;
    }
    setComparing(true);
    try {
      const data = await branchesService.compareBranches(repoId, baseBranch, headBranch);
      setComparison(data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to compare branches');
    } finally {
      setComparing(false);
    }
  };

  const riskBadgeVariants = {
    low: 'success' as const,
    medium: 'warning' as const,
    high: 'error' as const,
  };

  return (
    <div className="absolute inset-0 p-6 flex flex-col h-full bg-white overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Branch listing column */}
        <div className="bg-white border-[3px] border-[#111827] p-5 flex flex-col h-fit brutal-hover">
          <h3 className="text-xs font-black uppercase tracking-wider mb-4 text-[#111827]">Repository Branches</h3>
          {isBranchesLoading ? (
            <div className="py-8 flex justify-center"><Spinner size="sm" /></div>
          ) : (
            <div className="space-y-3">
              {branches?.map((b) => (
                <div key={b.id} className="p-3 bg-white border border-[#111827] flex items-center justify-between text-xs font-bold">
                  <div className="truncate">
                    <div className="font-extrabold text-[#111827] flex items-center gap-2">
                      <GitBranch className="w-3.5 h-3.5 text-[#DD614C]" />
                      {b.name}
                      {b.is_default && <Badge variant="info">default</Badge>}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate font-mono mt-1 font-bold">
                      SHA: {b.head_sha}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Branch Comparison selector column */}
        <div className="bg-white border-[3px] border-[#111827] p-5 md:col-span-2 flex flex-col brutal-hover">
          <h3 className="text-xs font-black uppercase tracking-wider mb-4 text-[#111827]">Compare Branch Conflicts</h3>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="w-full sm:w-1/2">
              <label className="text-[10px] font-black text-[#111827] uppercase tracking-widest block mb-2">Base Branch</label>
              <select
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border-2 border-[#111827] text-xs text-[#111827] focus:outline-none focus:border-[3px] focus:border-[#DD614C] transition-all font-sans"
              >
                <option value="">Select Base</option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-1/2">
              <label className="text-[10px] font-black text-[#111827] uppercase tracking-widest block mb-2">Head Branch</label>
              <select
                value={headBranch}
                onChange={(e) => setHeadBranch(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border-2 border-[#111827] text-xs text-[#111827] focus:outline-none focus:border-[3px] focus:border-[#DD614C] transition-all font-sans"
              >
                <option value="">Select Head</option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            onClick={handleCompare}
            loading={comparing}
            disabled={comparing || !baseBranch || !headBranch}
            className="w-full py-2.5 text-xs font-black tracking-widest h-11"
          >
            Run Conflict Analysis
          </Button>

          {/* Comparison results */}
          {comparison && (
            <div className="mt-8 border-t-2 border-[#111827] pt-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-6">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">Commits Ahead</span>
                    <span className="text-xl font-black text-[#16A34A] mt-1 block">+{comparison.commitsAhead}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">Commits Behind</span>
                    <span className="text-xl font-black text-[#DC2626] mt-1 block">-{comparison.commitsBehind}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Conflict Risk:</span>
                  <Badge variant={riskBadgeVariants[comparison.conflictRisk as keyof typeof riskBadgeVariants] || 'default'} className="px-3 py-1 text-xs">
                    {comparison.conflictRisk}
                  </Badge>
                </div>
              </div>

              {/* Conflict files */}
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#111827] mb-3">
                  <AlertTriangle className={`w-4 h-4 ${comparison.potentialConflictFiles.length > 0 ? 'text-[#D97706]' : 'text-[#16A34A]'}`} />
                  Potential Conflict Files ({comparison.potentialConflictFiles.length})
                </div>

                {comparison.potentialConflictFiles.length === 0 ? (
                  <div className="p-4 border-2 border-[#16A34A] text-[#16A34A] bg-white text-[10px] font-bold uppercase tracking-wider">
                    No files are modified in both branches. Merging should be safe and conflict-free.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {comparison.potentialConflictFiles.map((file: string) => (
                      <div key={file} className="p-3 bg-white border border-[#111827] flex items-center gap-3 text-xs font-semibold text-[#111827]">
                        <FileCode className="w-4 h-4 text-[#DD614C]" />
                        <span className="font-mono">{file}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Sub-components: Contributors Tab
// -------------------------------------------------------------
function ContributorsTab({ repoId }: { repoId: string }) {
  const [selectedContributor, setSelectedContributor] = useState<any>(null);

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['contributorStats', repoId],
    queryFn: () => contributorsService.getContributorStats(repoId),
    enabled: !!repoId,
  });

  return (
    <div className="absolute inset-0 p-6 flex flex-col h-full bg-white overflow-y-auto">
      {isStatsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : !stats || stats.length === 0 ? (
        <div className="text-center py-20 text-xs text-gray-500 font-bold uppercase tracking-wider">
          No contributors found for this repository.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedContributor(c)}
              className="p-5 bg-white border-[3px] border-[#111827] brutal-hover cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-start gap-4">
                <Avatar name={c.display_name} src={c.avatar_url} size="md" className="border border-[#111827]" />
                <div className="truncate">
                  <h4 className="text-xs font-black text-[#111827] uppercase tracking-wide truncate">
                    {c.display_name}
                  </h4>
                  {c.github_username && (
                    <p className="text-[10px] text-[#DD614C] truncate font-mono mt-1 font-bold">
                      @{c.github_username}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t-2 border-[#111827] text-center">
                <div>
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Commits</span>
                  <span className="text-xs font-black text-[#111827] block mt-1">{c.total_commits}</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Additions</span>
                  <span className="text-xs font-black text-[#16A34A] block mt-1">+{c.total_insertions}</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Deletions</span>
                  <span className="text-xs font-black text-[#DC2626] block mt-1">-{c.total_deletions}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Active 7d: <span className="text-[#111827] font-black">{c.commits_last_7_days}</span></span>
                <span>Active 30d: <span className="text-[#111827] font-black">{c.commits_last_30_days}</span></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contributor Commits Modal popover */}
      {selectedContributor && (
        <ContributorCommitsModal
          repoId={repoId}
          contributor={selectedContributor}
          onClose={() => setSelectedContributor(null)}
        />
      )}
    </div>
  );
}

function ContributorCommitsModal({
  repoId,
  contributor,
  onClose,
}: {
  repoId: string;
  contributor: any;
  onClose: () => void;
}) {
  const { data: commits, isLoading } = useQuery({
    queryKey: ['contributorCommits', repoId, contributor.id],
    queryFn: () => contributorsService.getContributorCommits(repoId, contributor.id, 25, 0),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-xl bg-white border-[3px] border-[#111827] rounded-none shadow-none p-6 z-10 animate-fade-in flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between border-b-2 border-[#111827] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <Avatar name={contributor.display_name} src={contributor.avatar_url} size="sm" className="border border-[#111827]" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#111827]">{contributor.display_name} Commits</h3>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Recent activity list</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#111827] text-xs border-2 border-[#111827] px-3 py-1.5 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors brutal-hover"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="sm" />
            </div>
          ) : !commits || commits.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-500 font-bold uppercase tracking-wider">
              No recent commits found.
            </div>
          ) : (
            commits.map((c) => (
              <div key={c.id} className="p-3 bg-white border border-[#111827] flex items-start justify-between gap-4 font-bold text-xs">
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#DD614C] font-black">{c.short_sha}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      {new Date(c.committed_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h5 className="text-xs text-[#111827] truncate mt-1 leading-normal font-medium">
                    {c.message_subject}
                  </h5>
                </div>
                <div className="text-right text-[10px] font-black">
                  <span className="text-[#16A34A]">+{c.additions || 0}</span>
                  {' / '}
                  <span className="text-[#DC2626]">-{c.deletions || 0}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
export default Dashboard;
