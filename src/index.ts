import * as core from '@actions/core';
import { CodeReviewer } from './review';
import { ReviewConfig, ReviewLevel, AIProvider } from './types';

async function run(): Promise<void> {
  try {
    // Get inputs
    const githubToken = core.getInput('github_token', { required: true });
    const provider = core.getInput('provider') as AIProvider || 'openai';
    const apiKey = core.getInput('api_key', { required: true });
    const model = core.getInput('model') || getDefaultModel(provider);
    const reviewLevel = core.getInput('review_level') as ReviewLevel || 'standard';
    const includePatterns = core.getInput('include_patterns')
      .split(',')
      .map(p => p.trim())
      .filter(p => p);
    const excludePatterns = core.getInput('exclude_patterns')
      .split(',')
      .map(p => p.trim())
      .filter(p => p);
    const maxFiles = parseInt(core.getInput('max_files') || '10', 10);
    const language = core.getInput('language') || 'english';
    const customPrompt = core.getInput('custom_prompt') || '';
    const failOnIssues = core.getInput('fail_on_issues') === 'true';

    // Validate provider
    if (!['openai', 'anthropic'].includes(provider)) {
      throw new Error(`Invalid provider: ${provider}. Must be 'openai' or 'anthropic'`);
    }

    // Validate review level
    if (!['quick', 'standard', 'comprehensive'].includes(reviewLevel)) {
      throw new Error(`Invalid review level: ${reviewLevel}. Must be 'quick', 'standard', or 'comprehensive'`);
    }

    const config: ReviewConfig = {
      provider,
      apiKey,
      model,
      reviewLevel,
      includePatterns,
      excludePatterns,
      maxFiles,
      language,
      customPrompt,
      failOnIssues
    };

    core.info('🚀 Starting Vibe Code Review...');
    core.info(`Provider: ${provider}`);
    core.info(`Model: ${model}`);
    core.info(`Review Level: ${reviewLevel}`);

    const reviewer = new CodeReviewer(githubToken, config);
    const result = await reviewer.review();

    // Set outputs
    core.setOutput('review_summary', result.summary);
    core.setOutput('issues_found', result.issuesFound.toString());
    core.setOutput('files_reviewed', result.filesReviewed.toString());

    // Fail if critical issues found and failOnIssues is enabled
    if (failOnIssues && result.comments.some(c => c.severity === 'critical')) {
      core.setFailed(`Found ${result.comments.filter(c => c.severity === 'critical').length} critical issues`);
    }

    core.info('✅ Code review complete!');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    core.setFailed(`Code review failed: ${message}`);
  }
}

function getDefaultModel(provider: AIProvider): string {
  switch (provider) {
    case 'anthropic':
      return 'claude-3-5-sonnet-20241022';
    case 'openai':
    default:
      return 'gpt-4o-mini';
  }
}

run();
