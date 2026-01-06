#!/usr/bin/env node

/**
 * CLI entry for fiori-controller-sync.
 * Scans a project for *-dbg.controller.js files and syncs them into *.controller.js.
 */

const path = require('path');
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
  try {
    await run(options);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
})();

