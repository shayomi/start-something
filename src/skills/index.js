import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { detectContext } from './utils.js';

// Lazy-import inquirer to avoid issues in non-TTY environments
async function confirm(message) {
  const { default: inquirer } = await import('inquirer');
  const { proceed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message,
      default: true,
    },
  ]);
  return proceed;
}

// Skill registry — loaded lazily to keep startup fast
async function loadSkills() {
  const [supabase, neon, strapi, shadcn, clerk, oauth] = await Promise.all([
    import('./supabase.js'),
    import('./neon.js'),
    import('./strapi.js'),
    import('./shadcn.js'),
    import('./clerk.js'),
    import('./oauth.js'),
  ]);

  return {
    supabase: supabase.default,
    neon: neon.default,
    strapi: strapi.default,
    shadcn: shadcn.default,
    clerk: clerk.default,
    oauth: oauth.default,
  };
}

export async function listSkills() {
  const registry = await loadSkills();
  return Object.entries(registry).map(([id, skill]) => ({
    id,
    name: skill.name,
    description: skill.description,
    supportedFrameworks: skill.supportedFrameworks,
  }));
}

export async function runSkill(skillName, options = {}) {
  const registry = await loadSkills();
  const skill = registry[skillName.toLowerCase()];

  if (!skill) {
    console.log(chalk.red(`\n  Unknown skill: ${chalk.bold(skillName)}\n`));
    console.log(chalk.bold('  Available skills:\n'));
    const skills = await listSkills();
    skills.forEach(({ id, name, description }) => {
      console.log(`  ${chalk.cyan('●')} ${chalk.bold(id.padEnd(12))} ${chalk.gray(description)}`);
    });
    console.log('');
    process.exit(1);
  }

  // Resolve project directory
  const projectDir = options.dir
    ? path.resolve(options.dir)
    : process.cwd();

  const pkgPath = path.join(projectDir, 'package.json');
  if (!(await fs.pathExists(pkgPath))) {
    console.log(
      chalk.red(`\n  No package.json found in ${chalk.bold(projectDir)}\n`) +
      chalk.gray('  Run this command inside an existing Node.js project.\n')
    );
    process.exit(1);
  }

  // Detect context
  const context = await detectContext(projectDir);

  // Framework compatibility check
  if (
    skill.supportedFrameworks.length > 0 &&
    !skill.supportedFrameworks.includes(context.framework)
  ) {
    console.log(
      chalk.yellow(
        `\n  Warning: ${chalk.bold(skill.name)} is designed for ${skill.supportedFrameworks.join(', ')} ` +
        `but this project appears to be ${chalk.bold(context.framework || 'unknown')}.`
      )
    );
    const shouldContinue = await confirm('Continue anyway?');
    if (!shouldContinue) {
      process.exit(0);
    }
  }

  // Get steps
  const steps = skill.steps(context);

  // Show plan
  console.log(chalk.bold.magenta(`\n  ${skill.name} — Setup Plan\n`));
  steps.forEach((step, i) => {
    const label = step.label || step.command || step.filePath || step.type;
    console.log(`  ${chalk.gray(`${i + 1}.`)} ${label}`);
  });
  console.log('');

  // Confirm
  const proceed = await confirm(`Run ${steps.length} steps for ${skill.name}?`);
  if (!proceed) {
    console.log(chalk.gray('\n  Cancelled.\n'));
    process.exit(0);
  }

  console.log('');

  // Execute steps
  for (const step of steps) {
    await runStep(step, context, skill.name.toLowerCase());
  }

  // Print next steps
  const nextStepsList = skill.nextSteps(context);
  if (nextStepsList.length > 0) {
    console.log(chalk.bold.green('\n  Next steps:\n'));
    nextStepsList.forEach((s, i) => {
      console.log(`  ${chalk.gray(`${i + 1}.`)} ${s}`);
    });
  }

  console.log(
    chalk.gray(`\n  Docs written to ${chalk.white(`docs/${skill.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.md`)}\n`)
  );
}

async function runStep(step, context, skillId) {
  const { projectDir, envExamplePath } = context;
  const label = step.label || step.command || step.filePath || step.type;
  const spinner = ora(label).start();

  try {
    switch (step.type) {
      case 'exec': {
        execSync(step.command, {
          cwd: step.cwd || projectDir,
          stdio: 'pipe',
        });
        break;
      }

      case 'write': {
        const fullPath = path.join(projectDir, step.filePath);
        await fs.outputFile(fullPath, step.content);
        break;
      }

      case 'env': {
        await mergeEnvExample(envExamplePath, step.vars);
        break;
      }

      case 'doc': {
        const docDir = path.join(projectDir, 'docs');
        const docFile = path.join(docDir, `${skillId}.md`);
        await fs.outputFile(docFile, step.content);
        break;
      }

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }

    spinner.succeed(chalk.gray(label));
  } catch (err) {
    spinner.warn(chalk.yellow(`${label} — ${err.message}`));
  }
}

export async function mergeEnvExample(envExamplePath, vars) {
  let existing = '';
  try {
    existing = await fs.readFile(envExamplePath, 'utf8');
  } catch {
    // File doesn't exist yet — start fresh
  }

  const existingKeys = new Set(
    existing
      .split('\n')
      .filter(line => line.includes('='))
      .map(line => line.split('=')[0].trim())
  );

  const newLines = Object.entries(vars)
    .filter(([key]) => !existingKeys.has(key))
    .map(([key, value]) => `${key}=${value}`);

  if (newLines.length === 0) return;

  const separator = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
  const appended = separator + newLines.join('\n') + '\n';
  await fs.appendFile(envExamplePath, appended);
}
