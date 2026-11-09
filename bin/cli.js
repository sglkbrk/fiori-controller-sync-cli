#!/usr/bin/env node

/**
 * CLI entry for fiori-controller-sync.
 * Scans a project for *-dbg.js files and Component-preload.js, syncing and cleaning artifacts.
 */

const path = require('path');
const readline = require('readline');
const { run } = require('../src/index');

const HELP_TEXT = `
Usage: fiori-controller-sync [options] [path]

Options:
  -d, --dry-run    Show planned changes without modifying files
  -b, --backup     Save a .bak copy of each target controller before replacing
  -h, --help       Show this help message

Arguments:
  path             Optional root directory to scan (defaults to current working directory)

Examples:
  fiori-controller-sync
  fiori-controller-sync --dry-run ./my-fiori-app
  fiori-controller-sync --backup "C:\\projects\\fiori-app"
`;

function askConfirmation(promptText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    backup: false,
    rootDir: process.cwd()
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-d' || arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '-b' || arg === '--backup') {
      options.backup = true;
      continue;
    }
    if (arg === '-h' || arg === '--help') {
      console.log(HELP_TEXT.trim());
      process.exit(0);
    }
    if (!arg.startsWith('-') && options.rootDir === process.cwd()) {
      options.rootDir = path.resolve(arg);
      continue;
    }
    console.error(`Unknown argument: ${arg}`);
    console.log(HELP_TEXT.trim());
    process.exit(1);
  }

  return options;
}

(async () => {
  const options = parseArgs(process.argv.slice(2));
  if (!options.dryRun) {
    console.log('--- Preview (dry-run) ---');
    await run({ ...options, dryRun: true });
    console.log('--- End of preview ---');
    const reply = await askConfirmation(
      `Proceed with changes in "${options.rootDir}"? (y/N): `
    );
    if (reply !== 'y' && reply !== 'yes') {
      console.log('Aborted by user.');
      process.exit(0);
    }
  }
  try {
    await run(options);
    console.log('.... Burak Sağlık ....');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
})();

