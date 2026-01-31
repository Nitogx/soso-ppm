'use strict';

const chalk = require('chalk');

let debugEnabled = false;

function enableDebug() {
  debugEnabled = true;
}

function log(message) {
  console.log(message);
}

function success(message) {
  console.log(chalk.green('✓') + ' ' + message);
}

function error(message) {
  console.error(chalk.red('✗') + ' ' + message);
}

function warn(message) {
  console.warn(chalk.yellow('⚠') + ' ' + message);
}

function info(message) {
  console.log(chalk.blue('ℹ') + ' ' + message);
}

function debug(message) {
  if (debugEnabled) {
    console.log(chalk.gray('[DEBUG]') + ' ' + message);
  }
}

function section(title) {
  console.log('\n' + chalk.bold(title));
}

module.exports = {
  enableDebug,
  log,
  success,
  error,
  warn,
  info,
  debug,
  section
};