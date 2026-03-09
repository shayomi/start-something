import fs from 'fs-extra';
import path from 'path';

export async function detectContext(projectDir) {
  const pkgPath = path.join(projectDir, 'package.json');
  let packageJson = {};

  try {
    packageJson = await fs.readJson(pkgPath);
  } catch {
    // already validated before calling this
  }

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies,
  };

  // Framework detection order
  let framework = 'unknown';
  if (allDeps['next']) framework = 'nextjs';
  else if (allDeps['nuxt'] || allDeps['nuxt3']) framework = 'nuxt';
  else if (allDeps['@remix-run/node'] || allDeps['@remix-run/react']) framework = 'remix';
  else if (allDeps['react'] && allDeps['vite']) framework = 'react';
  else if (allDeps['express']) framework = 'express';
  else if (allDeps['fastify']) framework = 'fastify';
  else if (allDeps['koa']) framework = 'koa';
  else if (allDeps['svelte'] || allDeps['@sveltejs/kit']) framework = 'svelte';
  else if (allDeps['vue']) framework = 'vue';

  const hasTypescript =
    'typescript' in allDeps ||
    (await fs.pathExists(path.join(projectDir, 'tsconfig.json')));

  const usesAppRouter = await fs.pathExists(path.join(projectDir, 'app'));

  const usesSrcDir =
    (await fs.pathExists(path.join(projectDir, 'src', 'app'))) ||
    (await fs.pathExists(path.join(projectDir, 'src', 'pages')));

  const envExamplePath = path.join(projectDir, '.env.example');

  // Detect package manager from lockfiles
  const packageManager = await detectPackageManager(projectDir);

  return {
    projectDir,
    packageJson,
    allDeps,
    framework,
    hasTypescript,
    usesAppRouter,
    usesSrcDir,
    envExamplePath,
    packageManager,
  };
}

/**
 * Detect which package manager is in use by checking for lockfiles.
 * Falls back to npm.
 */
export async function detectPackageManager(projectDir) {
  if (await fs.pathExists(path.join(projectDir, 'bun.lockb'))) return 'bun';
  if (await fs.pathExists(path.join(projectDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await fs.pathExists(path.join(projectDir, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

/**
 * Build an install command for the detected package manager.
 *
 * @param {string} packageManager - 'npm' | 'pnpm' | 'yarn' | 'bun'
 * @param {string[]} packages - package names to install
 * @param {{ dev?: boolean }} opts
 * @returns {string}
 */
export function installCmd(packageManager, packages, { dev = false } = {}) {
  const pkgs = packages.join(' ');
  switch (packageManager) {
    case 'pnpm':
      return dev ? `pnpm add -D ${pkgs}` : `pnpm add ${pkgs}`;
    case 'yarn':
      return dev ? `yarn add -D ${pkgs}` : `yarn add ${pkgs}`;
    case 'bun':
      return dev ? `bun add -d ${pkgs}` : `bun add ${pkgs}`;
    default: // npm
      return dev ? `npm install --save-dev ${pkgs}` : `npm install ${pkgs}`;
  }
}

/**
 * Shorthand: build a prod install step object.
 */
export function installStep(packageManager, packages, label) {
  return {
    type: 'exec',
    label: label || `Install ${packages.join(', ')}`,
    command: installCmd(packageManager, packages),
  };
}

/**
 * Shorthand: build a dev install step object.
 */
export function installDevStep(packageManager, packages, label) {
  return {
    type: 'exec',
    label: label || `Install ${packages.join(', ')} (dev)`,
    command: installCmd(packageManager, packages, { dev: true }),
  };
}
