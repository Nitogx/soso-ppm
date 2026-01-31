'use strict';

const semver = require('semver');
const { debug } = require('./utils/logger');

/**
 * Resolve dependency tree to flat structure
 * Implements highest-compatible-version strategy
 */
class Resolver {
  constructor(registry) {
    this.registry = registry;
    this.resolved = new Map(); // package name -> resolved version
    this.pending = new Map(); // package name -> requested ranges
  }

  /**
   * Resolve all dependencies from root package
   */
  async resolve(dependencies) {
    if (!dependencies || Object.keys(dependencies).length === 0) {
      return {};
    }

    // First pass: collect all version requirements
    await this.collectRequirements(dependencies);

    // Second pass: resolve conflicts
    this.resolveConflicts();

    return Object.fromEntries(this.resolved);
  }

  /**
   * Recursively collect all dependency requirements
   */
  async collectRequirements(dependencies, visited = new Set()) {
    for (const [name, range] of Object.entries(dependencies)) {
      debug(`Collecting requirement: ${name}@${range}`);

      // Track this requirement
      if (!this.pending.has(name)) {
        this.pending.set(name, []);
      }
      this.pending.get(name).push(range);

      // Avoid infinite loops
      const key = `${name}@${range}`;
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);

      // Get available versions from registry
      const versions = await this.getAvailableVersions(name);
      if (versions.length === 0) {
        throw new Error(`Package not found in registry: ${name}`);
      }

      // Find highest version matching this range
      const version = semver.maxSatisfying(versions, range);
      if (!version) {
        throw new Error(`No version of ${name} satisfies ${range}. Available: ${versions.join(', ')}`);
      }

      // Get package metadata to find its dependencies
      const pkgInfo = await this.getPackageInfo(name, version);
      
      // Recursively collect dependencies
      if (pkgInfo.dependencies) {
        await this.collectRequirements(pkgInfo.dependencies, visited);
      }
    }
  }

  /**
   * Resolve version conflicts
   */
  resolveConflicts() {
    for (const [name, ranges] of this.pending.entries()) {
      debug(`Resolving ${name} with ranges: ${ranges.join(', ')}`);

      // Get all available versions
      const packageData = this.registry.packages[name];
      if (!packageData) {
        throw new Error(`Package not found: ${name}`);
      }

      const versions = Object.keys(packageData.versions);

      // Find highest version that satisfies ALL ranges
      let resolvedVersion = null;
      
      for (const version of versions.sort(semver.rcompare)) {
        const satisfiesAll = ranges.every(range => semver.satisfies(version, range));
        if (satisfiesAll) {
          resolvedVersion = version;
          break;
        }
      }

      if (!resolvedVersion) {
        throw new Error(
          `Cannot resolve ${name}: conflicting version ranges ${ranges.join(', ')}. ` +
          `Available versions: ${versions.join(', ')}`
        );
      }

      this.resolved.set(name, resolvedVersion);
      debug(`Resolved ${name} to ${resolvedVersion}`);
    }
  }

  /**
   * Get available versions for a package
   */
  async getAvailableVersions(name) {
    const packageData = this.registry.packages[name];
    if (!packageData || !packageData.versions) {
      return [];
    }

    return Object.keys(packageData.versions).sort(semver.rcompare);
  }

  /**
   * Get package info for specific version
   */
  async getPackageInfo(name, version) {
    const packageData = this.registry.packages[name];
    if (!packageData || !packageData.versions || !packageData.versions[version]) {
      throw new Error(`Version ${version} not found for package ${name}`);
    }

    return packageData.versions[version];
  }
}

module.exports = { Resolver };