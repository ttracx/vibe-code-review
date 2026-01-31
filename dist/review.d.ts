import { ReviewConfig, ReviewResult } from './types';
export declare class CodeReviewer {
    private github;
    private config;
    private aiProvider;
    constructor(githubToken: string, config: ReviewConfig);
    review(): Promise<ReviewResult>;
    private reviewFile;
    private parseLineNumbers;
    private findClosestLine;
    private generateOverallSummary;
}
