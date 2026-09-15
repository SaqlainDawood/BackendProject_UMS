// case_check.js
// Scans the whole project for relative imports/requires whose casing
// does NOT exactly match the real file name on disk.
// This is the #1 cause of "works on Windows, breaks on Render/Linux" bugs.
//
// Usage:
//   node case_check.js /path/to/your/project

import fs from "fs";
import path from "path";

const projectRoot = process.argv[2] || ".";
const importRegex = /(?:import\s+[^'"]*from\s+|require\()\s*["'](\.[^"']+)["']/g;

let issues = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".git")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      checkFile(full);
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    let importPath = match[1];
    if (!importPath.startsWith(".")) continue;

    const baseDir = path.dirname(filePath);
    let resolved = path.resolve(baseDir, importPath);

    // Try common extensions if none given
    const candidates = [resolved, resolved + ".js", resolved + "/index.js"];
    let realCasePath = null;

    for (const candidate of candidates) {
      const dir = path.dirname(candidate);
      const base = path.basename(candidate);
      if (!fs.existsSync(dir)) continue;
      const actualNames = fs.readdirSync(dir);
      const exactMatch = actualNames.find((n) => n === base);
      const caseInsensitiveMatch = actualNames.find(
        (n) => n.toLowerCase() === base.toLowerCase()
      );
      if (exactMatch) {
        realCasePath = null; // fine
        break;
      } else if (caseInsensitiveMatch) {
        realCasePath = caseInsensitiveMatch;
        break;
      }
    }

    if (realCasePath) {
      issues++;
      console.log(`❌ CASE MISMATCH in ${filePath}`);
      console.log(`   imported as: "${importPath}"`);
      console.log(`   actual file: "${realCasePath}"\n`);
    }
  }
}

walk(projectRoot);

if (issues === 0) {
  console.log("✅ No case-sensitivity import mismatches found.");
} else {
  console.log(`\nFound ${issues} case-sensitivity issue(s). Fix these before deploying to Render/Linux.`);
}