import * as github from '@actions/github';
import * as core from '@actions/core';
import { FileChange, ReviewComment } from './types';

export class GitHubClient {
  private octokit: ReturnType<typeof github.getOctokit>;
  private context: typeof github.context;

  constructor(token: string) {
    this.octokit = github.getOctokit(token);
    this.context = github.context;
  }

  get pullNumber(): number {
    const prNumber = this.context.payload.pull_request?.number;
    if (!prNumber) {
      throw new Error('This action can only be run on pull request events');
    }
    return prNumber;
  }

  get repo(): { owner: string; repo: string } {
    return this.context.repo;
  }

  async getChangedFiles(
    includePatterns: string[],
    excludePatterns: string[],
    maxFiles: number
  ): Promise<FileChange[]> {
    const { owner, repo } = this.repo;
    const prNumber = this.pullNumber;

    const { data: files } = await this.octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100
    });

    const filteredFiles = files
      .filter(file => {
        // Must match at least one include pattern
        const included = includePatterns.some(pattern => 
          minimatch(file.filename, pattern, { dot: true })
        );
        
        // Must not match any exclude pattern
        const excluded = excludePatterns.some(pattern => 
          minimatch(file.filename, pattern, { dot: true })
        );

        return included && !excluded && file.patch;
      })
      .slice(0, maxFiles)
      .map(file => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch
      }));

    core.info(`Found ${filteredFiles.length} files to review (filtered from ${files.length} total)`);
    return filteredFiles;
  }

  async postReviewComments(comments: ReviewComment[], summary: string): Promise<void> {
    const { owner, repo } = this.repo;
    const prNumber = this.pullNumber;

    // Get the latest commit SHA
    const { data: pr } = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    const commitId = pr.head.sha;

    // Format comments for the review
    const reviewComments = comments
      .filter(c => c.line > 0)
      .map(comment => ({
        path: comment.path,
        line: comment.line,
        body: this.formatComment(comment),
        side: comment.side as 'LEFT' | 'RIGHT'
      }));

    // Create a review with all comments
    try {
      await this.octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        commit_id: commitId,
        body: this.formatSummary(summary, comments.length),
        event: 'COMMENT',
        comments: reviewComments
      });

      core.info(`Posted review with ${reviewComments.length} inline comments`);
    } catch (error) {
      // If inline comments fail, post a general comment
      core.warning(`Could not post inline comments, posting summary instead: ${error}`);
      await this.postComment(this.formatSummary(summary, comments.length, comments));
    }
  }

  async postComment(body: string): Promise<void> {
    const { owner, repo } = this.repo;
    const prNumber = this.pullNumber;

    await this.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body
    });
  }

  private formatComment(comment: ReviewComment): string {
    const severityEmoji = {
      critical: '🚨',
      warning: '⚠️',
      suggestion: '💡',
      info: 'ℹ️'
    };

    return `${severityEmoji[comment.severity]} **${comment.severity.toUpperCase()}**

${comment.body}`;
  }

  private formatSummary(summary: string, issueCount: number, comments?: ReviewComment[]): string {
    let body = `## 🔍 Vibe Code Review

${summary}

---
*Found ${issueCount} issue${issueCount !== 1 ? 's' : ''}*
`;

    if (comments && comments.length > 0) {
      body += `\n### Issues Found\n\n`;
      for (const comment of comments) {
        const emoji = { critical: '🚨', warning: '⚠️', suggestion: '💡', info: 'ℹ️' }[comment.severity];
        body += `- ${emoji} **${comment.path}:${comment.line}** - ${comment.body}\n`;
      }
    }

    body += `\n---\n*Powered by [vibe-code-review](https://github.com/ttracx/vibe-code-review)*`;
    return body;
  }
}

// Simple minimatch implementation for patterns
function minimatch(path: string, pattern: string, options?: { dot?: boolean }): boolean {
  // Convert glob pattern to regex
  let regex = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*')
    .replace(/\?/g, '.');
  
  if (options?.dot) {
    regex = regex.replace(/\[\^\/\]\*/g, '[^/]*');
  }
  
  return new RegExp(`^${regex}$`).test(path);
}
