import 'dotenv/config';
import bcrypt from 'bcrypt';
import { getClient } from './config/db';

async function seed() {
  const client = await getClient();
  
  try {
    console.log('🌱 Starting database seeding...');
    
    // Hash password with cost 12
    const passwordHash = await bcrypt.hash('password123', 12);
    
    await client.query('BEGIN');
    
    // 1. Clean up existing dev user (which cascades to all tables)
    await client.query("DELETE FROM users WHERE email = 'dev@test.com'");
    
    // 2. Create dev user
    const userResult = await client.query(`
      INSERT INTO users (email, password_hash, display_name, role, email_verified)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, ['dev@test.com', passwordHash, 'Dev User', 'user', true]);
    const userId = userResult.rows[0].id;
    
    // 3. Create repository owned by the user
    const repoResult = await client.query(`
      INSERT INTO repositories (
        user_id, github_repo_id, owner, name, full_name, display_name,
        default_branch, is_private, indexing_status, last_indexed_at,
        total_commits_count, total_branches_count
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11)
      RETURNING id
    `, [
      userId,
      123456789,
      'octocat',
      'Hello-World',
      'octocat/Hello-World',
      'Hello World (Demo)',
      'main',
      false,
      'ready',
      25,
      3
    ]);
    const repoId = repoResult.rows[0].id;
    
    // 4. Create three branches
    const branchNames = ['main', 'develop', 'feature/auth'];
    const branchMap: Record<string, string> = {};
    
    for (const name of branchNames) {
      const headSha = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const branchResult = await client.query(`
        INSERT INTO branches (repository_id, name, head_sha, is_default, is_protected)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        repoId,
        name,
        headSha,
        name === 'main',
        name === 'main'
      ]);
      branchMap[name] = branchResult.rows[0].id;
    }
    
    // 5. Create two contributors
    const contributorResult1 = await client.query(`
      INSERT INTO contributors (repository_id, primary_email, display_name, github_username, total_commits)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [repoId, 'alice@example.com', 'Alice Dev', 'alicedev', 15]);
    const aliceId = contributorResult1.rows[0].id;
    
    const contributorResult2 = await client.query(`
      INSERT INTO contributors (repository_id, primary_email, display_name, github_username, total_commits)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [repoId, 'bob@example.com', 'Bob Dev', 'bobdev', 10]);
    const bobId = contributorResult2.rows[0].id;
    
    // 6. Define 25 commits details
    const commitSpecs = [
      { msg: 'initial commit', author: 'alice', daysAgo: 30, branches: ['main', 'develop', 'feature/auth'] },
      { msg: 'docs: update readme with setup instructions', author: 'bob', daysAgo: 29, branches: ['main', 'develop', 'feature/auth'] },
      { msg: 'feat: add user schema and routes', author: 'alice', daysAgo: 28, branches: ['main', 'develop', 'feature/auth'] },
      { msg: 'fix: resolve cors issue in dev environment', author: 'alice', daysAgo: 27, branches: ['main', 'develop', 'feature/auth'] },
      { msg: 'feat: integrate redis for session caching', author: 'bob', daysAgo: 26, branches: ['main', 'develop', 'feature/auth'] },
      
      { msg: 'feat: implement github oauth integration', author: 'alice', daysAgo: 24, branches: ['develop', 'feature/auth'] },
      { msg: 'refactor: optimize DB queries for user authentication', author: 'alice', daysAgo: 23, branches: ['develop', 'feature/auth'] },
      { msg: 'test: add unit tests for auth modules', author: 'bob', daysAgo: 22, branches: ['develop', 'feature/auth'] },
      { msg: 'feat: add repository indexing jobs', author: 'alice', daysAgo: 20, branches: ['develop', 'feature/auth'] },
      { msg: 'fix: handle github API rate limits gracefully', author: 'bob', daysAgo: 19, branches: ['develop', 'feature/auth'] },
      { msg: 'chore: upgrade dependencies', author: 'bob', daysAgo: 18, branches: ['develop', 'feature/auth'] },
      { msg: 'feat: add email verification module', author: 'alice', daysAgo: 16, branches: ['develop', 'feature/auth'] },
      { msg: 'docs: add api documentation', author: 'bob', daysAgo: 15, branches: ['develop', 'feature/auth'] },
      { msg: 'feat: add chat conversations table', author: 'alice', daysAgo: 14, branches: ['develop', 'feature/auth'] },
      { msg: 'feat: implement chat backend with openai', author: 'alice', daysAgo: 12, branches: ['develop', 'feature/auth'] },
      
      { msg: 'fix: resolve null pointer in auth module', author: 'alice', daysAgo: 10, branches: ['feature/auth'] },
      { msg: 'feat: add login endpoint', author: 'bob', daysAgo: 9, branches: ['feature/auth'] },
      { msg: 'perf: add indexing status tracking', author: 'alice', daysAgo: 8, branches: ['feature/auth'] },
      { msg: 'feat: add notifications model', author: 'alice', daysAgo: 7, branches: ['feature/auth'] },
      { msg: 'fix: handle websocket disconnection', author: 'bob', daysAgo: 6, branches: ['feature/auth'] },
      { msg: 'feat: support markdown in chat messages', author: 'alice', daysAgo: 5, branches: ['feature/auth'] },
      { msg: 'refactor: simplify commit branch mapping', author: 'bob', daysAgo: 4, branches: ['feature/auth'] },
      { msg: 'test: integration tests for chat module', author: 'alice', daysAgo: 3, branches: ['feature/auth'] },
      { msg: 'fix: escape html characters in markdown output', author: 'bob', daysAgo: 2, branches: ['feature/auth'] },
      { msg: 'feat: add vector database sync worker', author: 'alice', daysAgo: 1, branches: ['feature/auth'] },
    ];
    
    const now = new Date();
    
    for (let i = 0; i < commitSpecs.length; i++) {
      const spec = commitSpecs[i];
      const sha = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const shortSha = sha.substring(0, 7);
      
      const contributorId = spec.author === 'alice' ? aliceId : bobId;
      const authorName = spec.author === 'alice' ? 'Alice Dev' : 'Bob Dev';
      const authorEmail = spec.author === 'alice' ? 'alice@example.com' : 'bob@example.com';
      
      const committedAt = new Date(now.getTime() - spec.daysAgo * 24 * 60 * 60 * 1000);
      
      // Insert commit
      const commitResult = await client.query(`
        INSERT INTO commits (
          repository_id, contributor_id, sha, short_sha, message, message_subject,
          author_name, author_email, committed_at, additions, deletions, files_changed_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        repoId,
        contributorId,
        sha,
        shortSha,
        spec.msg,
        spec.msg.split('\n')[0],
        authorName,
        authorEmail,
        committedAt,
        Math.floor(Math.random() * 100) + 5,
        Math.floor(Math.random() * 50) + 2,
        Math.floor(Math.random() * 5) + 1
      ]);
      const commitId = commitResult.rows[0].id;
      
      // Link commits to branches
      for (const bName of spec.branches) {
        const branchId = branchMap[bName];
        await client.query(`
          INSERT INTO commit_branches (commit_id, branch_id)
          VALUES ($1, $2)
        `, [commitId, branchId]);
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ Seed complete: 1 user, 1 repo, 3 branches, 2 contributors, 25 commits');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

seed().then(() => {
  process.exit(0);
});
