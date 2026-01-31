import * as core from '@actions/core';
import { GitHubClient } from './github';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { ReviewConfig, ReviewResult, ReviewComment, FileChange, AIReviewResponse } from './types';

export class CodeReviewer {
  private github: GitHubClient;
  private config: ReviewConfig;
  private aiProvider: OpenAIProvider | AnthropicProvider;

  constructor(githubToken: string, config: ReviewConfig) {
    this.github = new GitHubClient(githubToken);
    this.config = config;

    if (config.provider === 'anthropic') {
      this.aiProvider = new AnthropicProvider(config.apiKey, config.model);
    } else {
      this.aiProvider = new OpenAIProvider(config.apiKey, config.model);
    }
  }

  async review(): Promise<ReviewResult> {
    core.info(`Starting code review with ${this.config.provider} (${this.config.model})`);
    core.info(`Review level: ${this.config.reviewLevel}`);

    // Get changed files
    const files = await this.github.getChangedFiles(
      this.config.includePatterns,
      this.config.excludePatterns,
      this.config.maxFiles
    );

    if (files.length === 0) {
      core.info('No files to review after filtering');
      return {
        summary: 'No reviewable files found in this PR.',
        comments: [],
        issuesFound: 0,
        filesReviewed: 0
      };
    }

    // Review each file
    const allComments: ReviewComment[] = [];
    const summaries: string[] = [];

    for (const file of files) {
      if (!file.patch) continue;

      core.info(`Reviewing ${file.filename}...`);
      
      try {
        const result = await this.reviewFile(file);
        
        if (result.comments.length > 0) {
          allComments.push(...result.comments.map(c => ({
            ...c,
            path: file.filename
          })));
        }
        
        summaries.push(`**${file.filename}:** ${result.summary}`);
      } catch (error) {
        core.warning(`Failed to review ${file.filename}: ${error}`);
        summaries.push(`**${file.filename}:** ⚠️ Review failed`);
      }
    }

    // Generate overall summary
    const overallSummary = this.generateOverallSummary(summaries, allComments);

    // Post review comments
    if (allComments.length > 0 || summaries.length > 0) {
      await this.github.postReviewComments(allComments, overallSummary);
    }

    const result: ReviewResult = {
      summary: overallSummary,
      comments: allComments,
      issuesFound: allComments.length,
      filesReviewed: files.length
    };

    core.info(`Review complete: ${result.issuesFound} issues found in ${result.filesReviewed} files`);
    return result;
  }

  private async reviewFile(file: FileChange): Promise<{ summary: string; comments: ReviewComment[] }> {
    const response: AIReviewResponse = await this.aiProvider.reviewCode(
      file.filename,
      file.patch!,
      this.config.reviewLevel,
      this.config.language,
      this.config.customPrompt
    );

    // Parse line numbers from the patch to map comments correctly
    const lineMapping = this.parseLineNumbers(file.patch!);

    const comments: ReviewComment[] = response.comments.map(c => {
      // Find the closest valid line in the diff
      const mappedLine = this.findClosestLine(c.line, lineMapping);
      
      return {
        path: file.filename,
        line: mappedLine,
        body: c.message,
        side: 'RIGHT' as const,
        severity: c.severity
      };
    });

    return {
      summary: response.summary,
      comments
    };
  }

  private parseLineNumbers(patch: string): number[] {
    const lines: number[] = [];
    const patchLines = patch.split('\n');
    let currentLine = 0;

    for (const line of patchLines) {
      // Parse hunk header: @@ -start,count +start,count @@
      const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunkMatch) {
        currentLine = parseInt(hunkMatch[1], 10);
        continue;
      }

      if (line.startsWith('+') && !line.startsWith('+++')) {
        lines.push(currentLine);
        currentLine++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        // Deleted line, don't increment
      } else {
        currentLine++;
      }
    }

    return lines;
  }

  private findClosestLine(targetLine: number, validLines: number[]): number {
    if (validLines.length === 0) return targetLine;
    
    // If the target line is in valid lines, use it
    if (validLines.includes(targetLine)) return targetLine;
    
    // Find the closest valid line
    let closest = validLines[0];
    let minDiff = Math.abs(targetLine - closest);

    for (const line of validLines) {
      const diff = Math.abs(targetLine - line);
      if (diff < minDiff) {
        minDiff = diff;
        closest = line;
      }
    }

    return closest;
  }

  private generateOverallSummary(fileSummaries: string[], comments: ReviewComment[]): string {
    const criticalCount = comments.filter(c => c.severity === 'critical').length;
    const warningCount = comments.filter(c => c.severity === 'warning').length;
    const suggestionCount = comments.filter(c => c.severity === 'suggestion').length;
    const infoCount = comments.filter(c => c.severity === 'info').length;

    let summary = `### Review Summary\n\n`;
    
    if (comments.length === 0) {
      summary += `✅ **No issues found!** The code looks good.\n\n`;
    } else {
      summary += `| Severity | Count |\n|----------|-------|\n`;
      if (criticalCount > 0) summary += `| 🚨 Critical | ${criticalCount} |\n`;
      if (warningCount > 0) summary += `| ⚠️ Warning | ${warningCount} |\n`;
      if (suggestionCount > 0) summary += `| 💡 Suggestion | ${suggestionCount} |\n`;
      if (infoCount > 0) summary += `| ℹ️ Info | ${infoCount} |\n`;
      summary += `\n`;
    }

    summary += `### Files Reviewed\n\n`;
    summary += fileSummaries.join('\n\n');

    return summary;
  }
}
