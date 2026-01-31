'use strict';

const fs = require('fs');
const path = require('path');
const semver = require('semver');
const { loadRegistry } = require('../config');
const { install } = require('./install');
const { success, info, warn } = require('../utils/logger');

/**
 * Update dependencies
 */
async function update(args) {
  const cwd = process.cwd();
  const packageJsonPath = path.join(cwd, 'package.json');

  // Load package.json
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('No package.json found in current directory');
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = packageJson.dependencies || {};

  if (Object.keys(dependencies).length === 0) {
    info('No dependencies to update');
    return;
  }

  // Determine what to update
  let specificPackage = null;
  if (args.length > 0 && !args[0].startsWith('-')) {
    specificPackage = args[0];
  }

  const registry = loadRegistry();
  let updated = false;

  if (specificPackage) {
    // Update specific package
    if (!dependencies[specificPackage]) {
      throw new Error(`Package ${specificPackage} not found in dependencies`);
    }

    info(`Checking for updates to ${specificPackage}...`);
    const newVersion = await findLatestVersion(specificPackage, dependencies[specificPackage], registry);
    
    if (newVersion) {
      dependencies[specificPackage] = `^${newVersion}`;
      info(`Updated ${specificPackage} to ^${newVersion}`);
      updated = true;
    } else {
      info(`${specificPackage} is already at latest version`);
    }
  } else {
    // Update all packages
    info('Checking for updates...');
    
    for (const [name, range] of Object.entries(dependencies)) {
      const newVersion = await findLatestVersion(name, range, registry);
      
      if (newVersion) {
        dependencies[name] = `^${newVersion}`;
        info(`Updated ${name} to ^${newVersion}`);
        updated = true;
      }
    }
  }

  if (updated) {
    // Save updated package.json
    packageJson.dependencies = dependencies;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

    // Reinstall
    info('Reinstalling dependencies...');
    await install([]);
    
    success('Dependencies updated');
  } else {
    success('All dependencies are up to date');
  }
}

/**
 * Find latest version satisfying range
 */
async function findLatestVersion(name, range, registry) {
  const packageData = registry.packages[name];
  if (!packageData) {
    warn(`Package ${name} not found in registry`);
    return null;
  }

  const versions = Object.keys(packageData.versions).sort(semver.rcompare);
  
  // Find latest version matching range
  const currentVersion = semver.maxSatisfying(versions, range);
  
  // Find absolute latest version
  const latestVersion = versions[0];

  // Only update if there's a newer version
  if (currentVersion && semver.gt(latestVersion, currentVersion)) {
    return latestVersion;
  }

  return null;
}

module.exports = { update };