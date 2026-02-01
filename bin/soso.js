#!/usr/bin/env node
'use strict';

const { install } = require('../lib/commands/install');
const { publish } = require('../lib/commands/publish');
const { update } = require('../lib/commands/update');
const { info } = require('../lib/commands/info');
const { clean } = require('../lib/commands/clean');
const { run } = require('../lib/commands/run');
const { printHelp, printVersion } = require('../lib/utils/help');
const { enableDebug } = require('../lib/utils/logger');

const args = process.argv.slice(2);
const command = args[0];

// Check for flags
const debug = args.includes('--debug') || args.includes('-d');
if (debug) {
  enableDebug();
}

async function main() {
  try {
    switch (command) {
      case 'install':
      case 'i':
        await install(args.slice(1));
        break;
      
      case 'publish':
        await publish(args.slice(1));
        break;
      
      case 'update':
        await update(args.slice(1));
        break;
      
      case 'info':
        await info(args.slice(1));
        break;
      
      case 'cache':
        if (args[1] === 'clean') {
          await clean(args.slice(2));
        } else {
          console.error('Unknown cache command. Use: soso cache clean');
          process.exit(1);
        }
        break;
      
      case 'run':
        await run(args.slice(1));
        break;
      
      case 'version':
      case '-v':
      case '--version':
        printVersion();
        break;
      
      case 'help':
      case '-h':
      case '--help':
      case undefined:
        printHelp();
        break;
      
      default:
        console.error(`Unknown command: ${command}`);
        console.error('Run "soso help" for usage information.');
        process.exit(1);
    }
  } catch (error) {
    if (debug) {
      console.error(error);
    } else {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

main();