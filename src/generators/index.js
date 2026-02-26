import fs from "fs-extra";
import path from "path";
import { generateFileContent } from "../ai.js";
import { getStaticFile } from "./static.js";

export async function generateProject(projectPlan, outputDir, apiKey, onProgress) {
  await fs.ensureDir(outputDir);

  const generatedFiles = {};
  const { files } = projectPlan;

  // Always ensure these critical files are included
  const essentialFiles = [".env.example", ".gitignore", "README.md"];
  const allFiles = [...new Set([...files, ...essentialFiles])];

  for (const filePath of allFiles) {
    onProgress(filePath);

    const fullPath = path.join(outputDir, filePath);
    await fs.ensureDir(path.dirname(fullPath));

    // Check if we have a static version (faster, no API call)
    const staticContent = getStaticFile(filePath, projectPlan.template);

    let content;
    if (staticContent) {
      content = staticContent;
    } else {
      // Generate with AI
      content = await generateFileContent(filePath, projectPlan, apiKey, generatedFiles);
    }

    await fs.writeFile(fullPath, content, "utf-8");
    generatedFiles[filePath] = content;
  }

  // Write a scaffold manifest so users know what was generated
  const manifest = {
    generatedAt: new Date().toISOString(),
    tool: "ai-scaffold",
    projectName: projectPlan.projectName,
    template: projectPlan.template,
    stack: projectPlan.stack,
    description: projectPlan.description,
  };

  await fs.writeJson(path.join(outputDir, ".scaffold.json"), manifest, { spaces: 2 });
}
