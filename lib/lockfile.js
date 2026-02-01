'use strict';

const fs = require('fs');
const path = require('path');
const { debug } = require('./utils/logger');

/**
 * Lockfile manager for deterministic installs
 */
class Lockfile {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.lockfilePath = path.join(projectPath, 'soso-lock.json');
  }

  /**
   * Check if lockfile exists
   */
  exists() {
    return fs.existsSync(this.lockfilePath);
  }

  /**
   * Read lockfile
   */
  read() {
    if (!this.exists()) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.lockfilePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read lockfile: ${error.message}`);
    }
  }

  /**
   * Write lockfile
   */
  write(packages) {
    debug(`Writing lockfile with ${Object.keys(packages).length} packages`);

    const lockfile = {
      lockfileVersion: 1,
      packages: {}
    };

    // Sort packages alphabetically for deterministic output
    const sortedNames = Object.keys(packages).sort();
    
    for (const name of sortedNames) {
      const pkg = packages[name];
      lockfile.packages[name] = {
        version: pkg.version,
        resolved: pkg.resolved,
        integrity: pkg.integrity
      };

      // Include dependencies if present
      if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
        lockfile.packages[name].dependencies = pkg.dependencies;
      }
    }

    const content = JSON.stringify(lockfile, null, 2) + '\n';
    fs.writeFileSync(this.lockfilePath, content);
  }

  /**
   * Validate lockfile integrity
   */
  validate(lockfileData) {
    if (!lockfileData) {
      return false;
    }

    if (lockfileData.lockfileVersion !== 1) {
      throw new Error('Unsupported lockfile version');
    }

    if (!lockfileData.packages || typeof lockfileData.packages !== 'object') {
      throw new Error('Invalid lockfile format: missing packages');
    }

    return true;
  }

  /**
   * Get package from lockfile
   */
  getPackage(lockfileData, name) {
    if (!lockfileData || !lockfileData.packages) {
      return null;
    }
    return lockfileData.packages[name] || null;
  }

  /**
   * Check if lockfile matches current dependencies
   */
  matches(lockfileData, dependencies) {
    if (!lockfileData || !lockfileData.packages) {
      return false;
    }

    const lockfileNames = new Set(Object.keys(lockfileData.packages));
    const currentNames = new Set(Object.keys(dependencies));

    // Quick check: same number of packages
    if (lockfileNames.size !== currentNames.size) {
      return false;
    }

    // Check all dependencies are in lockfile
    for (const name of currentNames) {
      if (!lockfileNames.has(name)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Delete lockfile
   */
  delete() {
    if (this.exists()) {
      fs.unlinkSync(this.lockfilePath);
    }
  }
}

module.exports = { Lockfile };