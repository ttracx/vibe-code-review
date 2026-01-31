import OpenAI from 'openai';
import { AIReviewResponse, ReviewLevel } from '../types';

export class OpenAIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.client = new OpenAI({ apiKey });
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

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content) as AIReviewResponse;
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

Respond with a JSON object containing:
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

Analyze the changes and provide your review in JSON format.`;
  }
}
