import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  User as UserIcon,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  Settings as SettingsIcon,
  ExternalLink
} from 'lucide-react';

import { useAuthStore } from '../stores/authStore';
import { Repository } from '../stores/repoStore';
import usersService from '../services/users.service';
import reposService from '../services/repos.service';
import Button from '../components/shared/Button';
import Input from '../components/shared/Input';
import Avatar from '../components/shared/Avatar';
import Modal from '../components/shared/Modal';
import Spinner from '../components/shared/Spinner';
import ThemeToggle from '../components/shared/ThemeToggle';

export function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, setAuth, clearAuth } = useAuthStore();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Queries
  const { data: repos, isLoading: isReposLoading } = useQuery({
    queryKey: ['settingsRepos'],
    queryFn: reposService.getRepos,
  });

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: usersService.updateProfile,
    onSuccess: (updatedUser) => {
      const token = useAuthStore.getState().accessToken || '';
      setAuth(updatedUser, token);
      toast.success('Profile updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    },
  });

  const deleteRepoMutation = useMutation({
    mutationFn: reposService.deleteRepo,
    onSuccess: () => {
      toast.success('Repository removed successfully');
      queryClient.invalidateQueries({ queryKey: ['settingsRepos'] });
      queryClient.invalidateQueries({ queryKey: ['repos'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete repository');
    },
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim().length < 2) {
      toast.error('Display name must be at least 2 characters');
      return;
    }

    setUpdatingProfile(true);
    try {
      await updateProfileMutation.mutateAsync({
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await usersService.deleteAccount();
      toast.success('Account deleted successfully');
      clearAuth();
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to delete account');
      setDeletingAccount(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-default text-fg-default font-sans overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header Back Link */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center text-sm font-medium text-fg-default hover:underline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-accent-emphasis">
              <SettingsIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Settings</span>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <h1 className="text-4xl font-bold tracking-tight mb-8">User Settings</h1>

        <div className="space-y-8">
          {/* Section 1: Profile Details */}
          <section className="bg-canvas-default border border-muted rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-fg-default">
              <UserIcon className="w-5 h-5 text-accent-emphasis" />
              Profile Information
            </h2>

            <div className="border-t border-muted mb-6" />

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-2">
                <Avatar name={displayName} src={avatarUrl} size="lg" />
                <div className="flex-1 w-full space-y-1 text-fg-default">
                  <h3 className="text-sm font-medium">Profile Avatar</h3>
                  <p className="text-xs text-fg-muted leading-normal">
                    Change your display name below or provide an image link to load a custom avatar.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Display Name"
                  placeholder="e.g. John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={updatingProfile}
                  required
                />

                <Input
                  label="Avatar Image URL"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  disabled={updatingProfile}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={updatingProfile}
                  disabled={updatingProfile}
                  className="px-6 text-sm h-10"
                >
                  Save Profile
                </Button>
              </div>
            </form>
          </section>

          {/* Section 2: Repos List */}
          <section className="bg-canvas-default border border-muted rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-fg-default">
              <Trash2 className="w-5 h-5 text-accent-emphasis" />
              Manage Repositories
            </h2>

            <div className="border-t border-muted mb-6" />

            {isReposLoading ? (
              <div className="py-8 flex justify-center"><Spinner size="sm" /></div>
            ) : !repos || repos.length === 0 ? (
              <p className="text-sm text-fg-muted py-4 text-center">
                No connected repositories.
              </p>
            ) : (
              <div className="space-y-3">
                {repos.map((repo: Repository) => (
                  <div
                    key={repo.id}
                    className="p-4 bg-canvas-subtle border border-muted rounded-md flex items-center justify-between gap-4 text-sm"
                  >
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-fg-default truncate">
                          {repo.display_name}
                        </h4>
                        <a
                          href={`https://github.com/${repo.full_name}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-fg-muted hover:text-accent-emphasis transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <p className="text-xs text-fg-muted truncate mt-1 font-mono">
                        ID: {repo.id}
                      </p>
                    </div>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove ${repo.display_name}? This deletes all related commits and indexes.`)) {
                          deleteRepoMutation.mutate(repo.id);
                        }
                      }}
                      disabled={deleteRepoMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 3: Danger Zone */}
          <section className="border border-danger-fg rounded-lg bg-canvas-default p-6">
            <h2 className="text-lg font-semibold text-danger-fg mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </h2>

            <div className="border-t border-danger-fg/30 mb-6" />

            <p className="text-sm text-fg-muted mb-6 leading-relaxed">
              Deletes your user account permanently. This soft deletes user records, revokes all active auth sessions, and clears all vector embeddings saved in Pinecone namespaces.
            </p>
            <Button
              variant="danger"
              size="md"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-6"
            >
              Delete Account
            </Button>
          </section>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Account Deletion">
        <div className="flex flex-col gap-4 text-center">
          <div className="p-3 bg-danger-fg/10 rounded-full w-fit mx-auto">
            <AlertTriangle className="w-8 h-8 text-danger-fg" />
          </div>
          <h3 className="text-lg font-semibold text-fg-default">Are you absolutely sure?</h3>
          <p className="text-sm text-fg-muted leading-relaxed px-2">
            This action is irreversible. All your connected repositories, AI conversations history, indexing pipelines stats, and account settings data will be lost.
          </p>

          <div className="flex items-center justify-center gap-3 mt-4">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deletingAccount}
              className="h-10 text-sm px-4"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              loading={deletingAccount}
              disabled={deletingAccount}
              className="h-10 text-sm px-4"
            >
              Delete My Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Settings;
