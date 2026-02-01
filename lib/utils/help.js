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
  ${chalk.cyan('cache clean')}           Clear the package cache
  ${chalk.cyan('version')}               Show version number
  ${chalk.cyan('help')}                  Show this help message

${chalk.bold('OPTIONS')}
  ${chalk.cyan('--debug, -d')}           Enable debug output

${chalk.bold('EXAMPLES')}
  ${chalk.gray('# Install all dependencies')}
  soso install

  ${chalk.gray('# Install specific package')}
  soso install @soso/utils

  ${chalk.gray('# Publish current package')}
  soso publish

  ${chalk.gray('# Show package info')}
  soso info @soso/logger

  ${chalk.gray('# Clear cache')}
  soso cache clean
`);
}

module.exports = {
  printVersion,
  printHelp
};