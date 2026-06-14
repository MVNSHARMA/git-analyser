import { useState } from 'react';
import { toast } from 'react-hot-toast';
import reposService from '../../services/repos.service';
import { useRepoStore } from '../../stores/repoStore';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';

interface AddRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (repo: any) => void;
}

export function AddRepoModal({ isOpen, onClose, onSuccess }: AddRepoModalProps) {
  const [githubUrl, setGithubUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { repos, setRepos } = useRepoStore();

  const validateUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') {
        return 'URL must be a github.com repository';
      }
      const paths = parsed.pathname.split('/').filter(Boolean);
      if (paths.length < 2) {
        return 'URL must include owner and repository name (e.g., github.com/owner/repo)';
      }
      return '';
    } catch {
      return 'Invalid URL format';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const urlError = validateUrl(githubUrl);
    if (urlError) {
      setError(urlError);
      return;
    }

    setLoading(true);
    try {
      const newRepo = await reposService.addRepo(githubUrl, displayName || undefined);
      
      // Update global repos store list
      setRepos([...repos, newRepo]);

      toast.success('Repository added — indexing started');
      
      setGithubUrl('');
      setDisplayName('');
      
      if (onSuccess) {
        onSuccess(newRepo);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || 'Failed to add repository';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add GitHub Repository">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="GitHub Repository URL"
          placeholder="https://github.com/owner/repository"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          error={error}
          disabled={loading}
          required
        />
        
        <Input
          label="Display Name (Optional)"
          placeholder="e.g. My Repo"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={loading}
        />

        <div className="flex items-center justify-end gap-3 mt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            Add & Index
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default AddRepoModal;
