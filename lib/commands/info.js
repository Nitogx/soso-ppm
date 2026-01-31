'use strict';

const chalk = require('chalk');
const { loadRegistry } = require('../config');
const { error } = require('../utils/logger');

/**
 * Show package information
 */
async function info(args) {
  if (args.length === 0 || args[0].startsWith('-')) {
    throw new Error('Package name required. Usage: soso info <package>');
  }

  const packageName = args[0];
  const registry = loadRegistry();

  const packageData = registry.packages[packageName];
  
  if (!packageData) {
    error(`Package not found: ${packageName}`);
    console.log('\nAvailable packages:');
    const packages = Object.keys(registry.packages).sort();
    if (packages.length === 0) {
      console.log('  (none)');
    } else {
      packages.forEach(name => console.log(`  ${name}`));
    }
    process.exit(1);
  }

  // Display package information
  console.log();
  console.log(chalk.bold.cyan(packageData.name));
  console.log();

  const versions = Object.keys(packageData.versions).sort((a, b) => {
    const semver = require('semver');
    return semver.rcompare(a, b);
  });

  console.log(chalk.bold('Versions:'));
  for (const version of versions) {
    const versionData = packageData.versions[version];
    const isLatest = version === versions[0];
    const tag = isLatest ? chalk.green(' (latest)') : '';
    
    console.log(`  ${chalk.yellow(version)}${tag}`);
    console.log(`    ${chalk.gray('Git:')} ${versionData.gitUrl}#${versionData.tag}`);
    
    if (versionData.publishedAt) {
      const date = new Date(versionData.publishedAt).toLocaleString();
      console.log(`    ${chalk.gray('Published:')} ${date}`);
    }
    
    if (versionData.dependencies && Object.keys(versionData.dependencies).length > 0) {
      console.log(`    ${chalk.gray('Dependencies:')}`);
      for (const [depName, depRange] of Object.entries(versionData.dependencies)) {
        console.log(`      ${depName}: ${depRange}`);
      }
    }
    
    console.log();
  }
}

module.exports = { info };