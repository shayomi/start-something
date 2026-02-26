# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run the CLI locally
node src/cli.js create "your project description"

# Link for local development testing
npm link

# Run as installed CLI
ai-scaffold create "your project description"
ai-scaffold config
ai-scaffold templates
```

There is no build step, test suite, or linter configured.

## Architecture

**ai-scaffold** is a CLI tool that generates complete project scaffolds from natural language descriptions using Claude AI.

### Pipeline

```
CLI input → AI project analysis → user confirmation → file generation → dep install → git init → VS Code
```

### Core Modules

- **`src/cli.js`** — Commander.js CLI entry point; defines `create`, `config`, and `templates` commands
- **`src/index.js`** — Orchestrates the full scaffold workflow via the `scaffold()` function
- **`src/ai.js`** — Two functions:
  - `analyzeProject()` — Sends description to Claude, receives a structured JSON plan (template, files list, DB models, routes, features)
  - `generateFileContent()` — Sends file path + project context to Claude, receives file contents; passes the last 3 generated files as context for consistency
- **`src/config.js`** — Reads/writes user config at `~/.ai-scaffold/config.json`; falls back to `ANTHROPIC_API_KEY` env var
- **`src/generators/index.js`** — Merges AI-generated files with static files, writes them to disk, creates `.scaffold.json` manifest
- **`src/generators/static.js`** — Returns pre-built config file contents (`.gitignore`, `tsconfig.json`, `next.config.js`, `vite.config.ts`, etc.) to skip unnecessary API calls

### Templates

Seven built-in templates selected automatically by AI based on the description: `nextjs`, `fastapi`, `react`, `express`, `fullstack`, `cli`, `chrome-ext`. Template selection logic is in the system prompt inside `src/ai.js`.

### Key Design Decisions

- **ES Modules**: `"type": "module"` in `package.json` — use `import`/`export`, not `require()`
- **AI model**: Uses `claude-opus-4-6` for both analysis and file generation
- **Static fast path**: Common config files in `generators/static.js` bypass AI to save tokens/time
- **Token limits**: Analysis capped at 2000 tokens; per-file generation capped at 3000 tokens
- **No templates folder**: The `src/templates/` directory is empty; template logic lives in the AI system prompt and `generators/static.js`
