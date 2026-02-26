import Anthropic from "@anthropic-ai/sdk";

const TEMPLATES = {
  nextjs: "Next.js 14 + Tailwind CSS + Prisma + NextAuth",
  fastapi: "FastAPI + SQLAlchemy + Pydantic + Alembic",
  react: "React + Vite + Tailwind CSS + React Query",
  express: "Express.js + TypeScript + Prisma + JWT auth",
  fullstack: "Next.js (frontend) + FastAPI (backend) + Docker Compose",
  cli: "Node.js CLI tool + Commander + Chalk + Inquirer",
  "chrome-ext": "Chrome Extension + React + Vite + Manifest V3",
};

const SYSTEM_PROMPT = `You are an expert software architect. When given a project description, you analyze it and return a structured JSON project plan.

You MUST return ONLY valid JSON with this exact structure:
{
  "projectName": "kebab-case-name",
  "template": "one of: nextjs, fastapi, react, express, fullstack, cli, chrome-ext",
  "stack": ["array", "of", "technologies"],
  "features": ["key", "features", "to", "implement"],
  "description": "one sentence description",
  "files": ["list", "of", "file", "paths", "to", "create"],
  "envVars": ["ENV_VAR_NAME=description"],
  "dbSchema": [
    { "model": "ModelName", "fields": ["field: type"] }
  ],
  "routes": [
    { "method": "GET", "path": "/api/example", "description": "what it does" }
  ],
  "components": ["ComponentName - what it does"]
}

Choose the template based on:
- Web app with auth/DB → nextjs
- Python API or ML → fastapi  
- Simple frontend → react
- Node API → express
- Full stack different frameworks → fullstack
- Terminal tool → cli
- Browser extension → chrome-ext

Be practical. Only list files you'll actually generate. Include 10-20 key files.`;

export async function analyzeProject(description, apiKey, forcedTemplate = null) {
  const client = new Anthropic({ apiKey });

  const userMessage = forcedTemplate
    ? `Project: "${description}"\n\nForce template: ${forcedTemplate}\n\nCreate the project plan.`
    : `Project: "${description}"\n\nChoose the best template and create the project plan.`;

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content[0].text.trim();

  // Parse JSON - handle markdown code blocks too
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/({[\s\S]*})/);
  const jsonStr = jsonMatch ? jsonMatch[1] : text;

  return JSON.parse(jsonStr);
}

export async function generateFileContent(filePath, projectPlan, apiKey, existingFiles = {}) {
  const client = new Anthropic({ apiKey });

  const context = `
Project: ${projectPlan.description}
Template: ${projectPlan.template} (${TEMPLATES[projectPlan.template]})
Stack: ${projectPlan.stack.join(", ")}
Features: ${projectPlan.features.join(", ")}
DB Models: ${JSON.stringify(projectPlan.dbSchema)}
Routes: ${JSON.stringify(projectPlan.routes)}
Env vars: ${projectPlan.envVars.join(", ")}
`.trim();

  const existingContext = Object.keys(existingFiles).length > 0
    ? `\nAlready created files:\n${Object.entries(existingFiles)
        .slice(-3)
        .map(([f, c]) => `--- ${f} ---\n${c.slice(0, 300)}`)
        .join("\n\n")}`
    : "";

  const prompt = `${context}${existingContext}

Generate the file: ${filePath}

Rules:
- Return ONLY the file content, no explanation, no markdown code blocks
- Make it production-quality, not a placeholder
- Include proper imports, error handling, and TypeScript types where relevant
- For config files (.env.example, .gitignore, etc) make them comprehensive
- For README.md make it professional with badges, installation, usage sections`;

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0].text;
}
