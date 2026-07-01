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
import ThemeToggle from '../components/shared/ThemeToggle';

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
    <div className="flex h-screen bg-canvas-default text-fg-default overflow-hidden font-sans">
      {/* 1. Left Sidebar */}
      <aside className="w-80 bg-canvas-default border-r border-muted flex flex-col z-20">
        {/* Logo */}
        <div className="p-6 border-b border-muted flex items-center justify-between bg-canvas-default">
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono font-semibold select-none flex items-center text-fg-default">
              <span className="text-accent-emphasis mr-0.5">&gt;_</span>
              <span>Git Analyser</span>
            </span>
          </div>

          {/* Notifications bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-1.5 border border-muted rounded-md bg-canvas-default hover:bg-canvas-subtle text-fg-default transition-colors relative surface-hover"
            >
              <Bell className="w-4 h-4" />
              {unreadCountRes && unreadCountRes.count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-accent-emphasis text-fg-onAccent text-[8px] font-semibold h-4.5 w-4.5 rounded-full flex items-center justify-center">
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
          <div className="flex items-center justify-between text-xs text-fg-muted font-medium px-2">
            <span>Connected Repositories</span>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="p-1 border border-muted rounded-md hover:bg-canvas-subtle text-fg-default transition-all surface-hover"
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
            <div className="text-center py-8 px-4 border border-dashed border-muted rounded-md bg-canvas-default">
              <p className="text-xs text-fg-muted font-medium">No repositories added yet</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-3 text-xs text-accent-emphasis"
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
                    className={`p-4 border rounded-md transition-all cursor-pointer surface-hover ${
                      isSelected
                        ? 'border-l-4 border-l-accent-emphasis border-muted bg-canvas-default'
                        : 'border-muted bg-canvas-default'
                    }`}
                    onClick={() => handleSelectRepo(repo)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="truncate">
                        <h4 className="text-xs font-semibold truncate text-fg-default">
                          {repo.display_name}
                        </h4>
                        <p className="text-[10px] text-fg-muted truncate mt-1 font-medium">
                          {repo.full_name}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reindexMutation.mutate(repo.id);
                        }}
                        disabled={isIndexing || reindexMutation.isPending}
                        className="p-1 border border-muted rounded-md hover:bg-canvas-subtle text-fg-default transition-colors"
                        title="Reindex Repository"
                      >
                        <RefreshCw className={`w-3 h-3 ${isIndexing ? 'animate-spin text-accent-emphasis' : ''}`} />
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
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-canvas-default overflow-hidden relative">
        {/* Profile menu — always visible, top-right, regardless of repo-selection state */}
        <div className="absolute top-4 right-6 z-30">
          <ProfileMenu user={user} onLogout={handleLogout} />
        </div>

        {!selectedRepo ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-canvas-default">
            <div className="p-4 bg-canvas-subtle border border-muted rounded-lg text-accent-emphasis mb-6">
              <Terminal className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-semibold">Get Started</h2>
            <p className="text-sm text-fg-muted max-w-sm mt-3 leading-relaxed">
              Add your first repository or select one from the sidebar to begin analyzing commits, branches, and chat.
            </p>
            <Button
              variant="primary"
              className="mt-6 text-sm h-11"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Repository
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header Tabs */}
            <div className="pl-6 pr-44 py-5 border-b border-muted flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-canvas-subtle z-10">
              <div>
                <h2 className="text-lg font-semibold text-fg-default">
                  {selectedRepo.display_name}
                </h2>
                <p className="text-xs text-fg-muted font-medium mt-1">
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
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md border-b-2 transition-all duration-100 ${
                        isActive
                          ? 'border-accent-emphasis text-accent-emphasis font-semibold'
                          : 'border-transparent text-fg-muted hover:text-fg-default hover:border-muted'
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
            <div className="flex-1 overflow-hidden relative bg-canvas-default">
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
    <div className="absolute right-0 mt-3 w-80 bg-canvas-default border border-muted rounded-lg shadow-elevation-large z-50 animate-fade-in max-h-96 flex flex-col">
      <div className="p-4 border-b border-muted bg-canvas-subtle flex items-center justify-between">
        <h4 className="text-xs font-semibold text-fg-default">Notifications</h4>
        {notifications.some((n) => !n.read_at) && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="text-[10px] text-accent-emphasis hover:underline font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-muted">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-fg-muted font-medium">
            No notifications yet.
          </div>
        ) : (
          notifications.map((notif) => {
            const isUnread = !notif.read_at;
            return (
              <div
                key={notif.id}
                className={`p-4 transition-colors flex items-start gap-3 bg-canvas-default`}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-semibold text-fg-default truncate">{notif.title}</h5>
                    {isUnread && (
                      <button
                        onClick={() => markReadMutation.mutate(notif.id)}
                        className="text-[9px] text-accent-emphasis hover:underline font-medium"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-fg-muted mt-1 leading-normal font-medium">
                    {notif.body}
                  </p>
                  <span className="text-[9px] text-fg-subtle font-medium mt-2.5 block">
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
// Sub-components: Profile Menu
// -------------------------------------------------------------
function ProfileMenu({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const goToSettings = () => {
    setIsOpen(false);
    navigate('/settings');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-md text-fg-default transition-colors"
      >
        <Avatar name={user?.display_name || 'User'} src={user?.avatar_url} size="sm" />
        <span className="text-xs font-medium truncate max-w-[120px]">{user?.display_name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-canvas-default border border-muted rounded-lg shadow-elevation-large z-50 animate-fade-in overflow-hidden">
          {/* Account */}
          <button
            onClick={goToSettings}
            className="w-full flex items-center gap-3 p-3 hover:bg-canvas-subtle transition-colors text-left border-b border-muted"
          >
            <Avatar name={user?.display_name || 'User'} src={user?.avatar_url} size="sm" />
            <div className="truncate">
              <h4 className="text-xs font-semibold text-fg-default truncate">{user?.display_name}</h4>
              <p className="text-[10px] text-fg-muted truncate">{user?.email}</p>
            </div>
          </button>

          {/* Theme */}
          <div className="flex items-center justify-between px-3 py-2.5 hover:bg-canvas-subtle transition-colors">
            <span className="text-xs text-fg-default font-medium">Theme</span>
            <ThemeToggle className="w-7 h-7" />
          </div>

          {/* Settings */}
          <button
            onClick={goToSettings}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-fg-default hover:bg-canvas-subtle transition-colors text-left"
          >
            <SettingsIcon className="w-3.5 h-3.5" /> Settings
          </button>

          {/* Sign Out */}
          <button
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-danger-fg hover:bg-danger-fg/10 transition-colors text-left border-t border-muted"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      )}
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
      <div className="w-64 border-r border-muted flex flex-col bg-canvas-default h-full">
        <div className="p-4 border-b border-muted bg-canvas-default">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => createConvMutation.mutate()}
            disabled={createConvMutation.isPending}
            className="w-full text-xs py-2"
          >
            <Plus className="w-3.5 h-3.5 mr-2" /> New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-canvas-default">
          {isConvsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : !conversations || conversations.length === 0 ? (
            <div className="text-center text-[10px] text-fg-muted font-medium py-6">
              No conversations.
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = activeConvId === conv.id;
              return (
                <div
                  key={conv.id}
                  className={`p-2.5 border rounded-md text-xs cursor-pointer flex items-center justify-between group transition-colors surface-hover ${
                    isSelected
                      ? 'bg-canvas-default border-l-4 border-l-accent-emphasis border-muted text-fg-default font-semibold'
                      : 'text-fg-default bg-canvas-default border-muted font-medium'
                  }`}
                  onClick={() => navigate(`/repo/${repoId}/chat/${conv.id}`)}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <MessageSquare className="w-3.5 h-3.5 text-fg-muted flex-shrink-0" />
                    <span className="truncate truncate-clip leading-normal">
                      {conv.title || 'Untitled Conversation'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConvMutation.mutate(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 border border-muted rounded hover:bg-canvas-subtle text-fg-muted hover:text-danger-fg transition-all"
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
      <div className="flex-1 flex flex-col h-full bg-canvas-default">
        {/* Messages list */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {isMessagesLoading && activeConvId && messages === undefined ? (
            <div className="flex items-center justify-center h-full">
              <Spinner />
            </div>
          ) : !activeConvId ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <MessageSquare className="w-12 h-12 text-fg-muted mb-4" />
              <h4 className="text-lg font-semibold">Start a Conversation</h4>
              <p className="text-xs text-fg-muted mt-2 max-w-xs leading-normal font-medium">
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
                <div className="flex gap-4 p-5 bg-canvas-subtle border border-muted rounded-lg max-w-2xl">
                  <Avatar name="Git Analyser" size="sm" />
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 bg-accent-emphasis rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2.5 w-2.5 bg-accent-emphasis rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2.5 w-2.5 bg-accent-emphasis rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input box */}
        <div className="px-4 pt-4 pb-8 bg-canvas-default">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-center">
            <input
              type="text"
              placeholder="Ask a question about the repository..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isStreaming}
              className="w-full pl-4 pr-12 py-3 bg-canvas-default border border-muted rounded-md text-xs text-fg-default placeholder-fg-subtle outline-none focus:border-accent-faded transition-colors font-sans"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="absolute right-3 p-1.5 bg-accent-emphasis rounded-md text-fg-onAccent transition-all hover:bg-accent-hover disabled:opacity-50"
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
      className={`flex gap-4 p-5 max-w-3xl border rounded-lg transition-all ${
        isUser
          ? 'bg-canvas-subtle border-muted ml-auto'
          : 'bg-canvas-subtle border-muted'
      }`}
    >
      <Avatar
        name={isUser ? 'User' : 'Git Analyser'}
        size="sm"
        className={isUser ? 'order-last' : 'order-first'}
      />
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-fg-muted">
            {isUser ? 'You' : 'Git Analyser'}
          </span>
          <span className="text-[9px] text-fg-subtle font-medium">
            {message.created_at && new Date(message.created_at).toLocaleTimeString()}
          </span>
        </div>

        {/* Message body */}
        <div className="text-sm leading-relaxed text-fg-default prose font-sans font-medium">
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ...props }) {
                  const isInline = !className && !String(children).includes('\n');
                  return isInline ? (
                    <code className="bg-accent-subtle text-accent-emphasis px-1.5 py-0.5 rounded font-mono text-xs font-medium" {...props}>
                      {children}
                    </code>
                  ) : (
                    <pre className="bg-canvas-default p-4 rounded-md overflow-x-auto border border-muted text-xs font-mono my-2 scrollbar-thin text-fg-default">
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
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-muted">
            <button
              onClick={() => handleFeedback('like')}
              className="p-1 border border-muted rounded hover:bg-canvas-subtle text-fg-default transition-colors surface-hover"
              title="Helpful"
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleFeedback('dislike')}
              className="p-1 border border-muted rounded hover:bg-danger-fg/10 text-danger-fg transition-colors surface-hover"
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
    <div className="absolute inset-0 p-6 flex flex-col h-full bg-canvas-default overflow-y-auto">
      {/* Filters Form */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6 bg-canvas-subtle border border-muted rounded-lg p-4">
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
            className="w-full px-4 py-2.5 bg-canvas-default border border-muted rounded-md text-xs text-fg-default focus:outline-none focus:border-accent-emphasis focus:ring-1 focus:ring-accent-emphasis transition-colors font-sans"
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
            className="w-1/2 px-2 py-2 bg-canvas-default border border-muted rounded-md text-xs text-fg-default focus:outline-none focus:border-accent-emphasis"
          />
          <input
            type="date"
            placeholder="To"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="w-1/2 px-2 py-2 bg-canvas-default border border-muted rounded-md text-xs text-fg-default focus:outline-none focus:border-accent-emphasis"
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
            className="w-full text-xs py-2"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Commit Table viewport */}
      <div className="flex-1 overflow-x-auto min-h-0 bg-canvas-default border border-muted rounded-lg">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : !data || data.commits.length === 0 ? (
          <div className="text-center py-20 text-xs text-fg-muted font-medium">
            No commits matching filter parameters found.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-muted bg-canvas-subtle text-[10px] font-semibold text-fg-muted">
                <th className="p-3 border-r border-muted">SHA</th>
                <th className="p-3 border-r border-muted">Author</th>
                <th className="p-3 border-r border-muted">Message</th>
                <th className="p-3 border-r border-muted">Date</th>
                <th className="p-3 text-right">Additions/Deletions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted text-fg-default">
              {data.commits.map((commit, idx) => (
                <tr key={commit.id} className={`${idx % 2 === 1 ? 'bg-canvas-subtle/40' : 'bg-canvas-default'} hover:bg-canvas-subtle transition-colors`}>
                  <td className="p-3 border-r border-muted font-mono font-medium text-accent-emphasis">
                    {commit.short_sha}
                  </td>
                  <td className="p-3 border-r border-muted">
                    <div className="font-semibold text-fg-default">{commit.author_name}</div>
                    <div className="text-[10px] text-fg-muted font-medium">{commit.author_email}</div>
                  </td>
                  <td className="p-3 border-r border-muted font-medium leading-relaxed max-w-sm truncate">
                    {commit.message_subject}
                  </td>
                  <td className="p-3 border-r border-muted font-medium">
                    {new Date(commit.committed_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    <span className="text-success-fg">+{commit.additions || 0}</span>
                    {' / '}
                    <span className="text-danger-fg">-{commit.deletions || 0}</span>
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
          <span className="text-xs text-fg-muted font-medium">
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
    <div className="absolute inset-0 p-6 flex flex-col h-full bg-canvas-default overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Branch listing column */}
        <div className="bg-canvas-default border border-muted rounded-lg p-5 flex flex-col h-fit">
          <h3 className="text-xs font-semibold mb-4 text-fg-default">Repository Branches</h3>
          {isBranchesLoading ? (
            <div className="py-8 flex justify-center"><Spinner size="sm" /></div>
          ) : (
            <div className="space-y-3">
              {branches?.map((b) => (
                <div key={b.id} className="p-3 bg-canvas-subtle border border-muted rounded-md flex items-center justify-between text-xs font-medium">
                  <div className="truncate">
                    <div className="font-semibold text-fg-default flex items-center gap-2">
                      <GitBranch className="w-3.5 h-3.5 text-accent-emphasis" />
                      {b.name}
                      {b.is_default && <Badge variant="info">default</Badge>}
                    </div>
                    <div className="text-[10px] text-fg-muted truncate font-mono mt-1 font-medium">
                      SHA: {b.head_sha}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Branch Comparison selector column */}
        <div className="bg-canvas-default border border-muted rounded-lg p-5 md:col-span-2 flex flex-col">
          <h3 className="text-xs font-semibold mb-4 text-fg-default">Compare Branch Conflicts</h3>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="w-full sm:w-1/2">
              <label className="text-[10px] font-medium text-fg-default block mb-2">Base Branch</label>
              <select
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas-default border border-muted rounded-md text-xs text-fg-default focus:outline-none focus:border-accent-emphasis focus:ring-1 focus:ring-accent-emphasis transition-colors font-sans"
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
              <label className="text-[10px] font-medium text-fg-default block mb-2">Head Branch</label>
              <select
                value={headBranch}
                onChange={(e) => setHeadBranch(e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas-default border border-muted rounded-md text-xs text-fg-default focus:outline-none focus:border-accent-emphasis focus:ring-1 focus:ring-accent-emphasis transition-colors font-sans"
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
            className="w-full py-2.5 text-sm h-11"
          >
            Run Conflict Analysis
          </Button>

          {/* Comparison results */}
          {comparison && (
            <div className="mt-8 border-t border-muted pt-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-6">
                  <div>
                    <span className="text-[10px] text-fg-muted block font-medium">Commits Ahead</span>
                    <span className="text-xl font-semibold text-success-fg mt-1 block">+{comparison.commitsAhead}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-fg-muted block font-medium">Commits Behind</span>
                    <span className="text-xl font-semibold text-danger-fg mt-1 block">-{comparison.commitsBehind}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-fg-muted font-medium">Conflict Risk:</span>
                  <Badge variant={riskBadgeVariants[comparison.conflictRisk as keyof typeof riskBadgeVariants] || 'default'} className="px-3 py-1 text-xs">
                    {comparison.conflictRisk}
                  </Badge>
                </div>
              </div>

              {/* Conflict files */}
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-fg-default mb-3">
                  <AlertTriangle className={`w-4 h-4 ${comparison.potentialConflictFiles.length > 0 ? 'text-attention-fg' : 'text-success-fg'}`} />
                  Potential Conflict Files ({comparison.potentialConflictFiles.length})
                </div>

                {comparison.potentialConflictFiles.length === 0 ? (
                  <div className="p-4 border border-success-fg rounded-md text-success-fg bg-canvas-default text-[10px] font-medium">
                    No files are modified in both branches. Merging should be safe and conflict-free.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {comparison.potentialConflictFiles.map((file: string) => (
                      <div key={file} className="p-3 bg-canvas-subtle border border-muted rounded-md flex items-center gap-3 text-xs font-medium text-fg-default">
                        <FileCode className="w-4 h-4 text-accent-emphasis" />
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
    <div className="absolute inset-0 p-6 flex flex-col h-full bg-canvas-default overflow-y-auto">
      {isStatsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : !stats || stats.length === 0 ? (
        <div className="text-center py-20 text-xs text-fg-muted font-medium">
          No contributors found for this repository.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedContributor(c)}
              className="p-5 bg-canvas-default border border-muted rounded-lg surface-hover cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-start gap-4">
                <Avatar name={c.display_name} src={c.avatar_url} size="md" />
                <div className="truncate">
                  <h4 className="text-xs font-semibold text-fg-default truncate">
                    {c.display_name}
                  </h4>
                  {c.github_username && (
                    <p className="text-[10px] text-accent-emphasis truncate font-mono mt-1 font-medium">
                      @{c.github_username}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-muted text-center">
                <div>
                  <span className="text-[9px] text-fg-muted font-medium">Commits</span>
                  <span className="text-xs font-semibold text-fg-default block mt-1">{c.total_commits}</span>
                </div>
                <div>
                  <span className="text-[9px] text-fg-muted font-medium">Additions</span>
                  <span className="text-xs font-semibold text-success-fg block mt-1">+{c.total_insertions}</span>
                </div>
                <div>
                  <span className="text-[9px] text-fg-muted font-medium">Deletions</span>
                  <span className="text-xs font-semibold text-danger-fg block mt-1">-{c.total_deletions}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 text-[10px] text-fg-muted font-medium flex items-center justify-between">
                <span>Active 7d: <span className="text-fg-default font-semibold">{c.commits_last_7_days}</span></span>
                <span>Active 30d: <span className="text-fg-default font-semibold">{c.commits_last_30_days}</span></span>
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
      <div className="relative w-full max-w-xl bg-canvas-default border border-muted rounded-lg shadow-elevation-large p-6 z-10 animate-fade-in flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between border-b border-muted pb-4 mb-4">
          <div className="flex items-center gap-3">
            <Avatar name={contributor.display_name} src={contributor.avatar_url} size="sm" />
            <div>
              <h3 className="text-xs font-semibold text-fg-default">{contributor.display_name} Commits</h3>
              <p className="text-[9px] text-fg-muted font-medium mt-0.5">Recent activity list</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-fg-default text-xs border border-muted rounded-md px-3 py-1.5 font-medium hover:bg-canvas-subtle transition-colors surface-hover"
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
            <div className="text-center py-12 text-xs text-fg-muted font-medium">
              No recent commits found.
            </div>
          ) : (
            commits.map((c) => (
              <div key={c.id} className="p-3 bg-canvas-subtle border border-muted rounded-md flex items-start justify-between gap-4 font-medium text-xs">
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-accent-emphasis font-semibold">{c.short_sha}</span>
                    <span className="text-[10px] text-fg-subtle font-medium">
                      {new Date(c.committed_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h5 className="text-xs text-fg-default truncate mt-1 leading-normal font-medium">
                    {c.message_subject}
                  </h5>
                </div>
                <div className="text-right text-[10px] font-semibold">
                  <span className="text-success-fg">+{c.additions || 0}</span>
                  {' / '}
                  <span className="text-danger-fg">-{c.deletions || 0}</span>
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
