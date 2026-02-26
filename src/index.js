import inquirer from "inquirer";
import ora from "ora";
import chalk from "chalk";
import path from "path";
import fs from "fs-extra";
import { execSync } from "child_process";
import { analyzeProject } from "./ai.js";
import { generateProject } from "./generators/index.js";
import { getConfig, saveConfig } from "./config.js";

export async function scaffold(description, options = {}) {
  // Step 1: Get description if not provided
  if (!description) {
    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "description",
        message: chalk.cyan("✦ Describe your project:"),
        validate: (input) =>
          input.trim().length > 5 ? true : "Please give a bit more detail",
      },
    ]);
    description = answer.description;
  }

  console.log("");

  // Step 2: Check for API key
  const config = await getConfig();
  if (!config.apiKey) {
    console.log(chalk.yellow("  No API key found. Let's set one up.\n"));
    const answer = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: chalk.cyan("  Enter your Anthropic API key:"),
        validate: (input) =>
          input.trim().length > 0 ? true : "API key cannot be empty",
      },
    ]);
    config.apiKey = answer.apiKey.trim();
    await saveConfig(config);
  }

  // Step 3: AI analyzes the description
  const spinner = ora({
    text: chalk.magenta("  Analyzing your project description..."),
    color: "magenta",
  }).start();

  let projectPlan;
  try {
    projectPlan = await analyzeProject(description, config.apiKey, options.template);
    spinner.succeed(chalk.green("  Project analyzed!"));
  } catch (err) {
    spinner.fail(chalk.red("  Analysis failed: " + err.message));
    process.exit(1);
  }

  console.log("");

  // Step 4: Show the plan and confirm
  console.log(chalk.bold.white("  ╔═══════════════════════════════════╗"));
  console.log(chalk.bold.white("  ║        Your Project Plan          ║"));
  console.log(chalk.bold.white("  ╚═══════════════════════════════════╝\n"));

  console.log(`  ${chalk.cyan("Name:")}       ${chalk.bold(projectPlan.projectName)}`);
  console.log(`  ${chalk.cyan("Template:")}   ${chalk.bold(projectPlan.template)}`);
  console.log(`  ${chalk.cyan("Stack:")}      ${chalk.bold(projectPlan.stack.join(", "))}`);
  console.log(`  ${chalk.cyan("Features:")}   ${chalk.bold(projectPlan.features.join(", "))}`);
  console.log("");
  console.log(`  ${chalk.gray("What will be created:")}`);
  projectPlan.files.slice(0, 8).forEach((f) => {
    console.log(`    ${chalk.gray("├─")} ${chalk.white(f)}`);
  });
  if (projectPlan.files.length > 8) {
    console.log(`    ${chalk.gray("└─")} ${chalk.gray(`...and ${projectPlan.files.length - 8} more files`)}`);
  }
  console.log("");

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: chalk.cyan("  Build this project?"),
      default: true,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow("\n  Cancelled. Run again anytime!\n"));
    process.exit(0);
  }

  // Step 5: Determine output directory
  const outputDir = path.resolve(options.output, projectPlan.projectName);

  if (fs.existsSync(outputDir)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: chalk.yellow(`  Directory "${projectPlan.projectName}" already exists. Overwrite?`),
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log(chalk.yellow("\n  Cancelled.\n"));
      process.exit(0);
    }
    await fs.remove(outputDir);
  }

  console.log("");

  // Step 6: Generate all files
  const genSpinner = ora({
    text: chalk.magenta("  Generating project files with AI..."),
    color: "magenta",
  }).start();

  try {
    await generateProject(projectPlan, outputDir, config.apiKey, (progress) => {
      genSpinner.text = chalk.magenta(`  Generating: ${progress}`);
    });
    genSpinner.succeed(chalk.green("  All files generated!"));
  } catch (err) {
    genSpinner.fail(chalk.red("  Generation failed: " + err.message));
    console.error(err);
    process.exit(1);
  }

  // Step 7: Install dependencies
  if (options.install !== false) {
    const installSpinner = ora({
      text: chalk.blue("  Installing dependencies..."),
      color: "blue",
    }).start();

    try {
      const installCmd = projectPlan.template === "fastapi"
        ? `cd "${outputDir}" && python3 -m pip install -r requirements.txt -q`
        : `cd "${outputDir}" && npm install --silent`;

      execSync(installCmd, { stdio: "pipe" });
      installSpinner.succeed(chalk.green("  Dependencies installed!"));
    } catch {
      installSpinner.warn(chalk.yellow("  Could not auto-install. Run npm install manually."));
    }
  }

  // Step 8: Init git repo
  try {
    execSync(`cd "${outputDir}" && git init && git add . && git commit -m "Initial commit from ai-scaffold"`, {
      stdio: "pipe",
    });
    console.log(`  ${chalk.green("✓")} Git repo initialized`);
  } catch {
    // git not available or failed silently
  }

  // Step 9: Success output
  console.log("");
  console.log(chalk.bold.green("  ✅ Project created successfully!\n"));
  console.log(`  ${chalk.white("Location:")} ${chalk.cyan(outputDir)}`);
  console.log("");
  console.log(chalk.bold.white("  Next steps:"));
  console.log(`  ${chalk.gray("$")} ${chalk.cyan(`cd ${projectPlan.projectName}`)}`);

  if (projectPlan.template === "fastapi") {
    console.log(`  ${chalk.gray("$")} ${chalk.cyan("python3 -m uvicorn main:app --reload")}`);
  } else {
    console.log(`  ${chalk.gray("$")} ${chalk.cyan("npm run dev")}`);
  }

  console.log("");

  // Step 10: Open in VS Code
  if (options.open !== false) {
    try {
      execSync(`code "${outputDir}"`, { stdio: "pipe" });
      console.log(`  ${chalk.green("✓")} Opened in VS Code\n`);
    } catch {
      // VS Code not in PATH
    }
  }
}
