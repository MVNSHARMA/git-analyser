import axios, { AxiosResponse, Method } from 'axios';
import { AuthError, ForbiddenError, NotFoundError, RateLimitError } from '../errors';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
  };
  protected: boolean;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
}

export interface GitHubCommitDetail {
  sha: string;
  commit: {
    message: string;
  };
  stats: {
    additions: number;
    deletions: number;
  };
  files: Array<{
    filename: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
}

export class GitHubApiClient {
  private accessToken?: string;
  public lastRateLimitRemaining?: number;

  constructor(accessToken?: string) {
    this.accessToken = accessToken;
  }

  /**
   * Internal request helper.
   * Checks rate limit headers and wraps API errors in custom application errors.
   */
  private async request<T>(
    method: Method,
    path: string,
    params: Record<string, unknown> = {}
  ): Promise<AxiosResponse<T>> {
    const url = `https://api.github.com${path}`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Git-Analyser-App',
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await axios({
        method,
        url,
        headers,
        [method.toUpperCase() === 'GET' ? 'params' : 'data']: params,
      });

      // Check remaining rate limits
      const remaining = response.headers['x-ratelimit-remaining'];
      if (remaining !== undefined) {
        this.lastRateLimitRemaining = parseInt(remaining, 10);
      }
      if (remaining === '0') {
        throw new RateLimitError('GitHub API rate limit reached');
      }

      return response;
    } catch (err: any) {
      if (err instanceof RateLimitError) {
        throw err;
      }

      if (err.response) {
        const remaining = err.response.headers['x-ratelimit-remaining'];
        if (remaining !== undefined) {
          this.lastRateLimitRemaining = parseInt(remaining, 10);
        }
        if (remaining === '0') {
          throw new RateLimitError('GitHub API rate limit reached');
        }

        const status = err.response.status;
        if (status === 401) {
          throw new AuthError('GITHUB_TOKEN_INVALID', 'Invalid GitHub token');
        } else if (status === 403) {
          throw new ForbiddenError('Access to GitHub repository is forbidden', 'GITHUB_REPO_FORBIDDEN');
        } else if (status === 404) {
          throw new NotFoundError('GitHub repository not found', 'GITHUB_REPO_NOT_FOUND');
        }
      }

      throw err;
    }
  }

  /**
   * Fetch repository metadata by owner and repository name.
   */
  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const res = await this.request<GitHubRepo>('GET', `/repos/${owner}/${repo}`);
    return res.data;
  }

  /**
   * Fetch all branches for a repository, paginating if necessary.
   */
  async getBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    let branches: GitHubBranch[] = [];
    let nextUrl: string | null = `/repos/${owner}/${repo}/branches?per_page=100`;

    while (nextUrl) {
      // Use request helper but pass absolute path if nextUrl starts with HTTP
      const reqPath: string = nextUrl.startsWith('http') ? nextUrl.substring('https://api.github.com'.length) : nextUrl;
      const response: AxiosResponse<GitHubBranch[]> = await this.request<GitHubBranch[]>('GET', reqPath);
      
      branches = branches.concat(response.data);

      const linkHeader: string | undefined = response.headers.link;
      const nextMatch = linkHeader ? linkHeader.match(/<([^>]+)>;\s*rel="next"/) : null;
      nextUrl = nextMatch ? nextMatch[1] : null;
    }

    return branches;
  }

  /**
   * Fetch a single page of commits for a branch.
   */
  async getCommits(owner: string, repo: string, branch: string, page: number, perPage = 100): Promise<GitHubCommit[]> {
    const res = await this.request<GitHubCommit[]>('GET', `/repos/${owner}/${repo}/commits`, {
      sha: branch,
      page,
      per_page: perPage,
    });
    return res.data;
  }

  /**
   * Fetch a detailed commit view containing statistics and file patches.
   */
  async getCommitDetail(owner: string, repo: string, sha: string): Promise<GitHubCommitDetail> {
    const res = await this.request<GitHubCommitDetail>('GET', `/repos/${owner}/${repo}/commits/${sha}`);
    return res.data;
  }

  /**
   * Lookup a user profile by email address (best effort).
   */
  async searchUserByEmail(email: string): Promise<{ login: string; avatar_url: string } | null> {
    try {
      const res = await this.request<{ items: Array<{ login: string; avatar_url: string }> }>('GET', '/search/users', {
        q: `${email} in:email`,
      });

      if (res.data && res.data.items && res.data.items.length > 0) {
        const item = res.data.items[0];
        return {
          login: item.login,
          avatar_url: item.avatar_url,
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}
