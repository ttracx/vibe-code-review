export type ReviewLevel = 'quick' | 'standard' | 'comprehensive';
export type AIProvider = 'openai' | 'anthropic';

export interface ReviewConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  reviewLevel: ReviewLevel;
  includePatterns: string[];
  excludePatterns: string[];
  maxFiles: number;
  language: string;
  customPrompt: string;
  failOnIssues: boolean;
}

export interface FileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface ReviewComment {
  path: string;
  line: number;
  body: string;
  side: 'LEFT' | 'RIGHT';
  severity: 'critical' | 'warning' | 'suggestion' | 'info';
}

export interface ReviewResult {
  summary: string;
  comments: ReviewComment[];
  issuesFound: number;
  filesReviewed: number;
}

export interface AIReviewResponse {
  summary: string;
  comments: Array<{
    line: number;
    severity: 'critical' | 'warning' | 'suggestion' | 'info';
    message: string;
  }>;
}
