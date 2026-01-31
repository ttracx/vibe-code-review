import { FileChange, ReviewComment } from './types';
export declare class GitHubClient {
    private octokit;
    private context;
    constructor(token: string);
    get pullNumber(): number;
    get repo(): {
        owner: string;
        repo: string;
    };
    getChangedFiles(includePatterns: string[], excludePatterns: string[], maxFiles: number): Promise<FileChange[]>;
    postReviewComments(comments: ReviewComment[], summary: string): Promise<void>;
    postComment(body: string): Promise<void>;
    private formatComment;
    private formatSummary;
}
