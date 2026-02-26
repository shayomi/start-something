# Contributing to ai-scaffold

Thanks for wanting to contribute! Here's how.

## Development Setup

```bash
git clone https://github.com/yourusername/ai-scaffold
cd ai-scaffold
npm install
```

Test your changes locally:

```bash
# Link the package globally
npm link

# Now use it
ai-scaffold create "a test project"
```

## Adding a New Template

1. Add static config files to `src/generators/static.js` under your template key
2. Add the template to the list in `src/cli.js` (the `templates` command)
3. Update the AI system prompt in `src/ai.js` with when to pick your template
4. Add an entry to the README table

## Project Structure

```
src/
├── cli.js          # Entry point, command definitions
├── index.js        # scaffold() main function
├── ai.js           # All Anthropic API calls
├── config.js       # Config file management (~/.ai-scaffold/config.json)
└── generators/
    ├── index.js    # File generation orchestrator
    └── static.js   # Static file content (no AI needed)
```

## Guidelines

- Keep it simple. The magic is the AI — don't over-engineer the wrapper.
- New templates should have their common config files in `static.js` so they generate instantly.
- All AI prompts go in `src/ai.js`.

## Issues & PRs

Open an issue first for big changes. Small fixes and new templates can go straight to PR.
