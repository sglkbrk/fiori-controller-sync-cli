/**
 * Core logic for syncing SAP UI5 controller files with their debug counterparts
 * and cleaning Component-preload artifacts.
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

async function* walkControllers(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      const subDir = path.join(dir, entry.name);
      yield* walkControllers(subDir);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('-dbg.js')) {
      yield path.join(dir, entry.name);
    }
  }
}

async function* walkPreload(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      const subDir = path.join(dir, entry.name);
      yield* walkPreload(subDir);
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase() === 'component-preload.js') {
      yield path.join(dir, entry.name);
    }
  }
}

async function findCaseInsensitiveFile(dir, targetLower) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (entry.name.toLowerCase() === targetLower) {
      return path.join(dir, entry.name);
    }
  }
  return null;
}

function buildTargetPaths(dbgPath) {
  const controllerPath = dbgPath.replace(/-dbg\.js$/, '.js');
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

async function cleanComponentPreload(preloadPath, options) {
  const dir = path.dirname(preloadPath);

  if (options.dryRun) {
    console.log(`[DRY-RUN] Would recreate empty: ${preloadPath}`);
  } else {
    await fsp.unlink(preloadPath).catch(() => {});
    await fsp.writeFile(preloadPath, '', 'utf8');
    console.log(`Recreated empty preload: ${preloadPath}`);
  }

  const mapPath =
    (await findCaseInsensitiveFile(dir, 'component-preload.js.map')) ||
    `${preloadPath}.map`;

  if (await pathExists(mapPath)) {
    if (options.dryRun) {
      console.log(`[DRY-RUN] Would delete map: ${mapPath}`);
    } else {
      await fsp.unlink(mapPath);
      console.log(`Deleted preload map: ${mapPath}`);
    }
  }
}

async function run(options) {
  const rootDir = path.resolve(options.rootDir);
  console.log(`Scanning: ${rootDir}`);
  console.log(`Options: dryRun=${options.dryRun} backup=${options.backup}`);

  for await (const dbgPath of walkControllers(rootDir)) {
    try {
      await replaceController(dbgPath, options);
    } catch (error) {
      console.error(`Failed processing ${dbgPath}: ${error.message}`);
    }
  }

  for await (const preloadPath of walkPreload(rootDir)) {
    try {
      await cleanComponentPreload(preloadPath, options);
    } catch (error) {
      console.error(`Failed processing ${preloadPath}: ${error.message}`);
    }
  }

  console.log('Completed controller sync.');
}

module.exports = { run };

