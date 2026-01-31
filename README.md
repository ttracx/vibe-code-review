# 🔍 Vibe Code Review

AI-powered code review for GitHub Pull Requests. Get instant, intelligent feedback on your code changes using OpenAI or Anthropic.

[![GitHub release](https://img.shields.io/github/v/release/ttracx/vibe-code-review)](https://github.com/ttracx/vibe-code-review/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🤖 **Multiple AI Providers** - Choose between OpenAI (GPT-4) or Anthropic (Claude)
- 📝 **Inline Comments** - Posts review comments directly on the lines that need attention
- 🎯 **Configurable Review Levels** - Quick, standard, or comprehensive reviews
- 🌍 **Multi-language Support** - Get reviews in your preferred language
- 🔧 **Customizable** - Add custom instructions, file patterns, and more
- ⚡ **Fast & Efficient** - Reviews only changed files, respects rate limits

## 🚀 Quick Start

Add this workflow to your repository at `.github/workflows/code-review.yml`:

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: AI Code Review
        uses: ttracx/vibe-code-review@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          api_key: ${{ secrets.OPENAI_API_KEY }}
```

## 📖 Usage Examples

### Basic Usage with OpenAI

```yaml
- uses: ttracx/vibe-code-review@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    api_key: ${{ secrets.OPENAI_API_KEY }}
    model: gpt-4o
    review_level: standard
```

### Using Anthropic Claude

```yaml
- uses: ttracx/vibe-code-review@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    provider: anthropic
    api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    model: claude-3-5-sonnet-20241022
```

### Comprehensive Review with Custom Instructions

```yaml
- uses: ttracx/vibe-code-review@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    api_key: ${{ secrets.OPENAI_API_KEY }}
    review_level: comprehensive
    language: english
    custom_prompt: |
      Focus on security best practices.
      Ensure all database queries are parameterized.
      Check for proper error handling.
    fail_on_issues: true
```

### Review Only Specific File Types

```yaml
- uses: ttracx/vibe-code-review@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    api_key: ${{ secrets.OPENAI_API_KEY }}
    include_patterns: '**/*.ts,**/*.tsx'
    exclude_patterns: '**/*.test.ts,**/*.spec.ts,**/dist/**'
    max_files: 20
```

## ⚙️ Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github_token` | GitHub token for API access | Yes | `${{ github.token }}` |
| `provider` | AI provider (`openai` or `anthropic`) | No | `openai` |
| `api_key` | API key for the AI provider | Yes | - |
| `model` | Model to use for review | No | `gpt-4o-mini` / `claude-3-5-sonnet-20241022` |
| `review_level` | Review thoroughness: `quick`, `standard`, `comprehensive` | No | `standard` |
| `include_patterns` | File patterns to include (comma-separated) | No | `**/*.ts,**/*.js,**/*.py,...` |
| `exclude_patterns` | File patterns to exclude (comma-separated) | No | `**/node_modules/**,...` |
| `max_files` | Maximum files to review | No | `10` |
| `language` | Language for review comments | No | `english` |
| `custom_prompt` | Custom instructions for the reviewer | No | - |
| `fail_on_issues` | Fail the action if critical issues are found | No | `false` |

## 📤 Outputs

| Output | Description |
|--------|-------------|
| `review_summary` | Summary of the code review |
| `issues_found` | Number of issues found |
| `files_reviewed` | Number of files reviewed |

## 🎚️ Review Levels

- **Quick**: Fast review focusing only on critical bugs and security issues
- **Standard**: Balanced review covering bugs, security, performance, and code quality
- **Comprehensive**: Thorough review including style, best practices, documentation, and edge cases

## 💰 Pricing

### Free Tier
- **10 reviews/month**
- Standard review level
- Community support

### Pro ($9/month)
- **Unlimited reviews**
- All review levels
- Priority support
- Custom prompts
- Team features (coming soon)

[Get Pro →](https://github.com/sponsors/ttracx)

## 🔐 Security

- API keys are never logged or exposed
- Reviews only access the PR diff, not your entire codebase
- All API calls use HTTPS encryption
- Compliant with GitHub's security best practices

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/ttracx/vibe-code-review.git
cd vibe-code-review

# Install dependencies
npm install

# Build
npm run build

# Test locally with act
act pull_request -e test/event.json -s OPENAI_API_KEY=your-key
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [OpenAI](https://openai.com) for GPT models
- [Anthropic](https://anthropic.com) for Claude models
- [GitHub Actions](https://github.com/features/actions) for the platform

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/ttracx">ttracx</a>
</p>
