import Anthropic from '@anthropic-ai/sdk';
import { AIReviewResponse, ReviewLevel } from '../types';

export class AnthropicProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async reviewCode(
    filename: string,
    patch: string,
    level: ReviewLevel,
    language: string,
    customPrompt: string
  ): Promise<AIReviewResponse> {
    const systemPrompt = this.buildSystemPrompt(level, language, customPrompt);
    const userPrompt = this.buildUserPrompt(filename, patch);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2000,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt
    });

    const textBlock = response.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Anthropic');
    }

    // Extract JSON from the response (handle potential markdown code blocks)
    let jsonStr = textBlock.text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    return JSON.parse(jsonStr.trim()) as AIReviewResponse;
  }

  private buildSystemPrompt(level: ReviewLevel, language: string, customPrompt: string): string {
    const levelInstructions = {
      quick: 'Focus only on critical bugs, security issues, and obvious errors. Be brief.',
      standard: 'Review for bugs, security issues, performance problems, and code quality. Provide balanced feedback.',
      comprehensive: 'Perform a thorough review covering bugs, security, performance, code style, best practices, documentation, and potential edge cases.'
    };

    return `You are an expert code reviewer. Your task is to review code changes and provide constructive feedback.

Review Level: ${level.toUpperCase()}
${levelInstructions[level]}

Language: Provide feedback in ${language}.

${customPrompt ? `Additional Instructions: ${customPrompt}` : ''}

You MUST respond with ONLY a JSON object (no markdown, no explanation) containing:
{
  "summary": "A brief summary of the overall code quality and main findings",
  "comments": [
    {
      "line": <line number from the diff where issue is found>,
      "severity": "critical" | "warning" | "suggestion" | "info",
      "message": "Description of the issue and how to fix it"
    }
  ]
}

Guidelines for line numbers:
- Use the line numbers shown in the diff (lines starting with +)
- Only comment on added or modified lines
- Line numbers should correspond to the new file, not the old file

Severity levels:
- critical: Bugs, security vulnerabilities, data loss risks
- warning: Performance issues, potential bugs, bad practices
- suggestion: Style improvements, refactoring opportunities
- info: Educational notes, alternative approaches

Keep feedback actionable and specific. If the code looks good, say so with an empty comments array.`;
  }

  private buildUserPrompt(filename: string, patch: string): string {
    return `Please review the following code changes:

**File:** ${filename}

**Diff:**
\`\`\`diff
${patch}
\`\`\`

Analyze the changes and provide your review in JSON format only.`;
  }
}
