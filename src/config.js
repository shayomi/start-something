import fs from "fs-extra";
import path from "path";
import os from "os";
import inquirer from "inquirer";
import chalk from "chalk";

const CONFIG_DIR = path.join(os.homedir(), ".ai-scaffold");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export async function getConfig() {
  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      return await fs.readJson(CONFIG_FILE);
    }
  } catch {
    // ignore
  }

  // Check env var as fallback
  if (process.env.ANTHROPIC_API_KEY) {
    return { apiKey: process.env.ANTHROPIC_API_KEY };
  }

  return {};
}

export async function saveConfig(config) {
  await fs.ensureDir(CONFIG_DIR);
  await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
}

export async function configure() {
  console.log(chalk.bold.magenta("\n  ⚙️  ai-scaffold Configuration\n"));

  const current = await getConfig();

  const answers = await inquirer.prompt([
    {
      type: "password",
      name: "apiKey",
      message: chalk.cyan("  Anthropic API key (sk-ant-...):"),
      default: current.apiKey ? "***existing***" : undefined,
      validate: (input) => {
        if (input === "***existing***") return true;
        return input.trim().length > 0 ? true : "API key cannot be empty";
      },
    },
    {
      type: "list",
      name: "defaultTemplate",
      message: chalk.cyan("  Default template (can be overridden per project):"),
      choices: ["auto-detect", "nextjs", "fastapi", "react", "express", "fullstack", "cli"],
      default: current.defaultTemplate || "auto-detect",
    },
    {
      type: "confirm",
      name: "autoInstall",
      message: chalk.cyan("  Auto-install dependencies after generation?"),
      default: current.autoInstall !== false,
    },
    {
      type: "confirm",
      name: "autoOpen",
      message: chalk.cyan("  Auto-open in VS Code after generation?"),
      default: current.autoOpen !== false,
    },
  ]);

  const config = {
    apiKey: answers.apiKey === "***existing***" ? current.apiKey : answers.apiKey.trim(),
    defaultTemplate: answers.defaultTemplate,
    autoInstall: answers.autoInstall,
    autoOpen: answers.autoOpen,
  };

  await saveConfig(config);

  console.log(chalk.green("\n  ✅ Configuration saved!\n"));
  console.log(chalk.gray(`  Stored at: ${CONFIG_FILE}\n`));
}
