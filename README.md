# 🚀 ai-scaffold

<p align="center">
  <img src="https://img.shields.io/npm/v/ai-scaffold?color=a855f7&style=for-the-badge" alt="npm version">
  <img src="https://img.shields.io/npm/dt/ai-scaffold?color=3b82f6&style=for-the-badge" alt="downloads">
  <img src="https://img.shields.io/github/stars/yourusername/ai-scaffold?color=f59e0b&style=for-the-badge" alt="stars">
  <img src="https://img.shields.io/badge/powered%20by-Claude%20AI-06b6d4?style=for-the-badge" alt="Claude AI">
</p>

<p align="center">
  <strong>Describe your app in plain English. Get a full, production-ready project.</strong>
</p>

<p align="center">
  <img src="https://github.com/yourusername/ai-scaffold/raw/main/demo.gif" alt="demo" width="700">
</p>

---

## ✨ What it does

You type one sentence. You get:

- ✅ Full project structure with all files
- ✅ AI-written components, routes, and logic
- ✅ Database schema & migrations
- ✅ Auth setup
- ✅ `.env.example` with all vars documented
- ✅ Professional `README.md`
- ✅ Dependencies auto-installed
- ✅ Git repo initialized
- ✅ Opens in VS Code

## 🎬 Demo

```bash
$ ai-scaffold create "a SaaS app for freelancers to track invoices and clients"
```

→ Picks **Next.js + Prisma + NextAuth + Tailwind**  
→ Generates 18 files  
→ Installs deps  
→ Opens VS Code  
→ **Ready to run in 30 seconds**

---

## 📦 Installation

```bash
npm install -g ai-scaffold
```

Or use without installing:

```bash
npx ai-scaffold create "your project description"
```

---

## 🔑 Setup

You'll need an [Anthropic API key](https://console.anthropic.com).

```bash
ai-scaffold config
```

Or set it as an environment variable:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🛠️ Usage

### Create a project

```bash
# Interactive - will ask for description
ai-scaffold create

# Direct description
ai-scaffold create "a REST API for a food delivery app with auth"

# Force a specific template
ai-scaffold create "my app" --template fastapi

# Custom output directory
ai-scaffold create "my app" --output ~/projects
```

### List templates

```bash
ai-scaffold templates
```

| Template | Stack |
|----------|-------|
| `nextjs` | Next.js 14 + Tailwind + Prisma + NextAuth |
| `fastapi` | FastAPI + SQLAlchemy + Alembic + Docker |
| `react` | React + Vite + Tailwind + React Query |
| `express` | Express.js + TypeScript + Prisma + JWT |
| `fullstack` | Next.js + FastAPI + Docker Compose |
| `cli` | Node.js + Commander + Chalk + Inquirer |
| `chrome-ext` | Chrome Extension + React + Vite |

### Options

```bash
ai-scaffold create "my app" [options]

Options:
  -o, --output <dir>       Output directory (default: current dir)
  -t, --template <name>    Force a specific template
  --no-install             Skip npm install
  --no-open                Skip opening VS Code
```

---

## 💡 Example prompts

```bash
ai-scaffold create "a Twitter clone with posts, likes, and follows"
ai-scaffold create "a Python ML API that classifies images"
ai-scaffold create "a Notion-like note taking app with markdown support"
ai-scaffold create "a CLI tool that converts CSV files to different formats"
ai-scaffold create "a Chrome extension that summarizes YouTube videos"
ai-scaffold create "a real-time chat app with rooms and file sharing"
```

---

## 🤝 Contributing

PRs welcome! Check out [CONTRIBUTING.md](./CONTRIBUTING.md).

Some ideas:
- Add more templates (Flutter, Rust, Go, Django, Rails)
- Add `ai-scaffold add <feature>` to add features to existing projects
- VS Code extension
- GitHub Actions integration

---

## 📄 License

MIT © [yourusername](https://github.com/yourusername)

---

<p align="center">
  Built with ❤️ and Claude AI
  <br>
  <a href="https://github.com/yourusername/ai-scaffold/issues">Report Bug</a> · 
  <a href="https://github.com/yourusername/ai-scaffold/issues">Request Feature</a>
</p>
