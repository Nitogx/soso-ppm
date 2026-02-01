'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { success, error, info, debug } = require('../utils/logger');

/**
 * Run a JavaScript file with SOSO packages
 */
async function run(args) {
  // Parse options
  const options = {
    noLog: args.includes('-nL') || args.includes('--no-log'),
    silent: args.includes('-s') || args.includes('--silent')
  };

  // Get the script file (first non-option argument)
  const scriptFile = args.find(arg => !arg.startsWith('-'));

  if (!scriptFile) {
    throw new Error('No script file specified. Usage: soso run <file.js> [options]');
  }

  // Resolve script path
  const scriptPath = path.resolve(process.cwd(), scriptFile);

  // Check if file exists
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script file not found: ${scriptFile}`);
  }

  // Check if it's a .js file
  if (!scriptPath.endsWith('.js')) {
    throw new Error('Script must be a .js file');
  }

  if (!options.silent) {
    info(`Running: ${scriptFile}`);
  }

  // Prepare Node.js arguments
  const nodeArgs = [scriptPath];

  // Add additional arguments (those not consumed by soso run)
  const extraArgs = args.filter(arg => 
    arg !== scriptFile && 
    arg !== '-nL' && 
    arg !== '--no-log' && 
    arg !== '-s' && 
    arg !== '--silent'
  );
  nodeArgs.push(...extraArgs);

  // Spawn Node.js process
  return new Promise((resolve, reject) => {
    const stdio = options.silent ? 'ignore' : 'inherit';
    
    const child = spawn('node', nodeArgs, {
      cwd: process.cwd(),
      stdio: stdio,
      env: {
        ...process.env,
        SOSO_RUN: '1',
        SOSO_NO_LOG: options.noLog ? '1' : '0',
        SOSO_SILENT: options.silent ? '1' : '0'
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to run script: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        if (!options.silent) {
          error(`Script exited with code ${code}`);
        }
        process.exit(code);
      } else {
        if (!options.silent && !options.noLog) {
          success('Script completed successfully');
        }
        resolve();
      }
    });
  });
}

module.exports = { run };