import { AIReviewResponse, ReviewLevel } from '../types';
export declare class OpenAIProvider {
    private client;
    private model;
    constructor(apiKey: string, model?: string);
    reviewCode(filename: string, patch: string, level: ReviewLevel, language: string, customPrompt: string): Promise<AIReviewResponse>;
    private buildSystemPrompt;
    private buildUserPrompt;
}
//# sourceMappingURL=openai.d.ts.map