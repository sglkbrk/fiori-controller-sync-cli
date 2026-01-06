/**
 * Core logic for syncing SAP UI5 controller files with their debug counterparts.
 * - Finds *-dbg.controller.js files
 * - Replaces the paired *.controller.js content
 * - Optionally creates backups
 * - Removes debug and map files
 */

const fs = require('fs');
const path = require('path');

const { COPYFILE_EXCL } = fs.constants;
const fsp = fs.promises;

const SKIP_DIRS = new Set(['node_modules', '.git', '.idea', '.vscode']);

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function* walk(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      const subDir = path.join(dir, entry.name);
      yield* walk(subDir);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('-dbg.controller.js')) {
      yield path.join(dir, entry.name);
    }
  }
}

function buildTargetPaths(dbgPath) {
  const parsed = path.parse(dbgPath);
  const baseName = parsed.name.replace(/-dbg$/, '');
  const controllerPath = path.join(parsed.dir, `${baseName}.controller.js`);
  const mapPath = `${controllerPath}.map`;
  return { controllerPath, mapPath };
}

async function backupFile(targetPath, dryRun) {
  const backupPath = `${targetPath}.bak`;
  if (dryRun) {
    console.log(`[DRY-RUN] Would create backup: ${backupPath}`);
    return;
  }
  const exists = await pathExists(backupPath);
  if (exists) {
    console.log(`Backup already exists, skipping: ${backupPath}`);
    return;
  }
  await fsp.copyFile(targetPath, backupPath, COPYFILE_EXCL);
  console.log(`Backup created: ${backupPath}`);
}

async function replaceController(dbgPath, options) {
  const { controllerPath, mapPath } = buildTargetPaths(dbgPath);
  const controllerExists = await pathExists(controllerPath);
  if (!controllerExists) {
    console.warn(`Skipping (no target controller): ${controllerPath}`);
    return;
  }

  const dbgContent = await fsp.readFile(dbgPath, 'utf8');

  if (options.backup) {
    await backupFile(controllerPath, options.dryRun);
  }

  if (options.dryRun) {
    console.log(`[DRY-RUN] Would overwrite: ${controllerPath}`);
  } else {
    await fsp.writeFile(controllerPath, dbgContent, 'utf8');
    console.log(`Updated: ${controllerPath}`);
  }

  if (options.dryRun) {
    console.log(`[DRY-RUN] Would delete: ${dbgPath}`);
  } else {
    await fsp.unlink(dbgPath);
    console.log(`Deleted debug file: ${dbgPath}`);
  }

  const mapExists = await pathExists(mapPath);
  if (mapExists) {
    if (options.dryRun) {
      console.log(`[DRY-RUN] Would delete map: ${mapPath}`);
    } else {
      await fsp.unlink(mapPath);
      console.log(`Deleted map file: ${mapPath}`);
    }
  }
}

async function run(options) {
  const rootDir = path.resolve(options.rootDir);
  console.log(`Scanning: ${rootDir}`);
  console.log(`Options: dryRun=${options.dryRun} backup=${options.backup}`);

  for await (const dbgPath of walk(rootDir)) {
    try {
      await replaceController(dbgPath, options);
    } catch (error) {
      console.error(`Failed processing ${dbgPath}: ${error.message}`);
    }
  }

  console.log('Completed controller sync.');
}

module.exports = { run };

