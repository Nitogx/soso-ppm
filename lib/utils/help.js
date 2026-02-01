'use strict';

const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

function printVersion() {
  const pkgPath = path.join(__dirname, '../../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  console.log(`soso v${pkg.version}`);
}

function printHelp() {
  console.log(`
${chalk.bold('SOSO')} - Private Package Manager

${chalk.bold('USAGE')}
  soso <command> [options]

${chalk.bold('COMMANDS')}
  ${chalk.cyan('install')} [package]     Install dependencies (or specific package)
  ${chalk.cyan('publish')}               Publish current package to registry
  ${chalk.cyan('update')} [package]      Update dependencies (or specific package)
  ${chalk.cyan('info')} <package>        Show package information
  ${chalk.cyan('run')} <yourscript.js>         Run JavaScript file with SOSO packages
  ${chalk.cyan('cache clean')}           Clear the package cache
  ${chalk.cyan('version')}               Show version number
  ${chalk.cyan('help')}                  Show this help message

${chalk.bold('OPTIONS')}
  ${chalk.cyan('--debug, -d')}           Enable debug output
  
${chalk.bold('RUN OPTIONS')}
  ${chalk.cyan('-nL, --no-log')}         Run without success log
  ${chalk.cyan('-s, --silent')}          Run completely silent (no output)

${chalk.bold('EXAMPLES')}
  ${chalk.gray('# Install all dependencies')}
  soso install

  ${chalk.gray('# Install specific package')}
  soso install <Package>

  ${chalk.gray('# Publish current package')}
  soso publish

  ${chalk.gray('# Show package info')}
  soso info <Package>

  ${chalk.gray('# Clear cache')}
  soso cache clean

  ${chalk.gray('# Run a script')}
  soso run app.js

  ${chalk.gray('# Run silently')}
  soso run yourscript.js -s

  ${chalk.gray('# Run without success log')}
  soso run yourscript.js -nL
`);
}

module.exports = {
  printVersion,
  printHelp
};