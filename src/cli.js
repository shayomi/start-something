#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import figlet from "figlet";
import gradient from "gradient-string";
import boxen from "boxen";
import { scaffold } from "./index.js";
import { configure } from "./config.js";

const cool = gradient(["#a855f7", "#3b82f6", "#06b6d4"]);

console.log(
  cool(
    figlet.textSync("ai-scaffold", {
      font: "Standard",
      horizontalLayout: "fitted",
    })
  )
);

console.log(
  boxen(
    chalk.white("Describe your app. Get a full project. No setup required."),
    {
      padding: { left: 2, right: 2, top: 0, bottom: 0 },
      borderStyle: "round",
      borderColor: "magenta",
    }
  )
);

console.log("");

program
  .name("ai-scaffold")
  .description("AI-powered project scaffolding CLI")
  .version("1.0.0");

program
  .command("create [description]")
  .alias("c")
  .description("Create a new project from a description")
  .option("-o, --output <dir>", "Output directory", ".")
  .option("-t, --template <template>", "Force a specific template (nextjs, fastapi, react, express, fullstack)")
  .option("--no-install", "Skip dependency installation")
  .option("--no-open", "Skip opening in VS Code")
  .action(async (description, options) => {
    await scaffold(description, options);
  });

program
  .command("config")
  .description("Configure your AI API key and preferences")
  .action(async () => {
    await configure();
  });

program
  .command("templates")
  .description("List all available project templates")
  .action(() => {
    const templates = [
      { name: "nextjs", desc: "Next.js 14 + Tailwind + Prisma + Auth" },
      { name: "fastapi", desc: "FastAPI + SQLAlchemy + Alembic + Docker" },
      { name: "react", desc: "React + Vite + Tailwind + React Query" },
      { name: "express", desc: "Express.js + TypeScript + Prisma + JWT" },
      { name: "fullstack", desc: "Next.js frontend + FastAPI backend + Docker Compose" },
      { name: "cli", desc: "Node.js CLI tool with Commander + Chalk" },
      { name: "chrome-ext", desc: "Chrome Extension with React + Vite" },
    ];

    console.log(chalk.bold.magenta("\n  Available Templates:\n"));
    templates.forEach((t) => {
      console.log(
        `  ${chalk.cyan("●")} ${chalk.bold(t.name.padEnd(15))} ${chalk.gray(t.desc)}`
      );
    });
    console.log("");
  });

program.parse();
