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

  return {
    projectDir,
    packageJson,
    allDeps,
    framework,
    hasTypescript,
    usesAppRouter,
    usesSrcDir,
    envExamplePath,
  };
}
