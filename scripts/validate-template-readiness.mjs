import { access, readFile, readdir, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const failures = [];
const lfsPointerMarker = [
  "version https://git-lfs.github.com",
  "spec/v1",
].join("/");

const requiredFiles = [
  "README.md",
  "compose.yaml",
  ".env.example",
  ".gitignore",
  "setup.command",
  "setup-windows.cmd",
  "diagnose.command",
  "diagnose-windows.cmd",
  "backup.command",
  "backup-windows.cmd",
  "reset.command",
  "reset-windows.cmd",
  "docs/GITHUB_DESKTOP.md",
  "docs/INSTRUCTOR_CHECKLIST.md",
  "docs/TEMPLATE_RELEASE.md",
  "docs/WORKFLOW_DEVELOPMENT.md",
  "docs/LOCAL_OPERATIONS.md",
  "docs/TROUBLESHOOTING.md",
  "docs/images/01-n8n-owner-setup.png",
  "docs/images/02-n8n-learner-checklist.png",
  "docs/images/03-chat-confirmation.png",
  "examples/finished-solo-project-assistant/README.md",
  "examples/finished-solo-project-assistant/agent.config.js",
  "examples/finished-solo-project-assistant/PROJECT_ASSISTANT_SKILL.md",
  "n8n/workflows/01-start-here-learner-checklist.json",
  "scripts/diagnose.sh",
  "scripts/normalise-workflow-exports.mjs",
  "scripts/windows/diagnose.ps1",
  "scripts/test-phase6.sh",
];

const executableFiles = [
  "setup.command",
  "diagnose.command",
  "backup.command",
  "reset.command",
  "scripts/setup.sh",
  "scripts/diagnose.sh",
  "scripts/test-phase6.sh",
];

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(directory, ignoredNames = new Set()) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignoredNames.has(entry.name)) {
      continue;
    }
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path, ignoredNames)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

for (const file of requiredFiles) {
  check(await exists(join(projectRoot, file)), `Missing template file: ${file}`);
}

for (const file of executableFiles) {
  const path = join(projectRoot, file);
  if (await exists(path)) {
    const details = await stat(path);
    check(
      (details.mode & 0o111) !== 0,
      `${file} must remain executable for macOS and technical contributors`,
    );
  }
}

for (const image of [
  "docs/images/01-n8n-owner-setup.png",
  "docs/images/02-n8n-learner-checklist.png",
  "docs/images/03-chat-confirmation.png",
]) {
  const path = join(projectRoot, image);
  if (await exists(path)) {
    check((await stat(path)).size >= 20_000, `${image} is not a real screenshot`);
  }
}

const readme = await readFile(join(projectRoot, "README.md"), "utf8");
for (const requiredText of [
  "Use this template",
  "GitHub Desktop",
  "setup.command",
  "setup-windows.cmd",
  "import-workflows.command",
  "diagnose.command",
  "diagnose-windows.cmd",
  "CONFIRM XXXXXXXX",
  "backup.command",
  "reset.command",
  "without installing Node.js, npm, or n8n",
]) {
  check(readme.includes(requiredText), `README must mention "${requiredText}"`);
}

const setupShell = await readFile(join(projectRoot, "scripts/setup.sh"), "utf8");
const setupWindows = await readFile(
  join(projectRoot, "scripts/windows/setup.ps1"),
  "utf8",
);
check(
  setupShell.includes("phase6LearnerChecklist") &&
    setupShell.includes("scripts/import-workflows.sh"),
  "macOS setup must automatically import only when the reviewed workflow marker is missing",
);
check(
  setupWindows.includes("phase6LearnerChecklist") &&
    setupWindows.includes("import-workflows.ps1"),
  "Windows setup must automatically import only when the reviewed workflow marker is missing",
);

for (const diagnostic of [
  "scripts/diagnose.sh",
  "scripts/windows/diagnose.ps1",
]) {
  const source = await readFile(join(projectRoot, diagnostic), "utf8");
  check(!source.includes("--decrypted"), `${diagnostic} must never decrypt credentials`);
  check(
    source.includes("phase3StartHere") &&
      source.includes("phase6LearnerChecklist") &&
      source.includes("Anthropic"),
    `${diagnostic} must inspect the checklist, main workflow, and Anthropic selection`,
  );
}

const gitignore = await readFile(join(projectRoot, ".gitignore"), "utf8");
for (const ignored of [".env", "backups/*", "n8n/exports/"]) {
  check(gitignore.includes(ignored), `.gitignore must protect ${ignored}`);
}

const markdownRoots = [
  join(projectRoot, "README.md"),
  ...(await collectFiles(join(projectRoot, "docs"))).filter(
    (path) => extname(path) === ".md",
  ),
  ...(await collectFiles(join(projectRoot, "n8n"))).filter(
    (path) => extname(path) === ".md",
  ),
  ...(await collectFiles(join(projectRoot, "examples"))).filter(
    (path) => extname(path) === ".md",
  ),
];

const markdownLinkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
for (const markdownPath of markdownRoots) {
  const source = await readFile(markdownPath, "utf8");
  for (const match of source.matchAll(markdownLinkPattern)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    if (
      rawTarget.startsWith("#") ||
      /^[a-z][a-z0-9+.-]*:/i.test(rawTarget)
    ) {
      continue;
    }
    const fileTarget = rawTarget.split("#", 1)[0];
    if (!fileTarget) {
      continue;
    }
    const resolved = resolve(dirname(markdownPath), fileTarget);
    check(
      await exists(resolved),
      `${relative(projectRoot, markdownPath)} links to missing ${rawTarget}`,
    );
  }
}

const projectFiles = await collectFiles(
  projectRoot,
  new Set([
    ".git",
    ".env",
    "backups",
    "node_modules",
    "dist",
    "coverage",
    "exports",
  ]),
);
for (const path of projectFiles) {
  const extension = extname(path).toLowerCase();
  if (
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".gz", ".ico"].includes(
      extension,
    )
  ) {
    continue;
  }
  const source = await readFile(path, "utf8");
  check(
    !source.includes(lfsPointerMarker),
    `${relative(projectRoot, path)} is a Git LFS pointer; templates cannot include LFS files`,
  );
  if (
    relative(projectRoot, path) !== "scripts/validate-workflows.mjs" &&
    relative(projectRoot, path) !==
      "scripts/validate-template-readiness.mjs"
  ) {
    check(
      !/sk-ant-api03-[a-zA-Z0-9_-]{20,}/.test(source),
      `${relative(projectRoot, path)} appears to contain an Anthropic API key`,
    );
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  throw new Error(`Template readiness failed with ${failures.length} issue(s)`);
}

console.log(
  `Template readiness passed: ${requiredFiles.length} required artifacts and ${markdownRoots.length} Markdown files checked.`,
);
