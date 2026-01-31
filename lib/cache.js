'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getCacheDir, ensureDir } = require('./config');
const { debug } = require('./utils/logger');

/**
 * Cache manager for package storage
 */
class CacheManager {
  constructor() {
    this.cacheDir = getCacheDir();
    ensureDir(this.cacheDir);
  }

  /**
   * Generate cache key for package
   */
  getCacheKey(name, version) {
    const key = `${name}@${version}`;
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Get cache path for package
   */
  getCachePath(name, version) {
    const key = this.getCacheKey(name, version);
    return path.join(this.cacheDir, key, 'package');
  }

  /**
   * Check if package is cached
   */
  has(name, version) {
    const cachePath = this.getCachePath(name, version);
    const packageJsonPath = path.join(cachePath, 'package.json');
    return fs.existsSync(packageJsonPath);
  }

  /**
   * Get cached package path
   */
  get(name, version) {
    if (!this.has(name, version)) {
      return null;
    }
    return this.getCachePath(name, version);
  }

  /**
   * Add package to cache
   * @param {string} name - Package name
   * @param {string} version - Package version
   * @param {string} sourcePath - Path to package files
   * @returns {string} Cache path
   */
  add(name, version, sourcePath) {
    const cachePath = this.getCachePath(name, version);
    
    debug(`Caching ${name}@${version} to ${cachePath}`);
    
    ensureDir(cachePath);
    
    // Copy all files from source to cache
    this.copyRecursive(sourcePath, cachePath);
    
    return cachePath;
  }

  /**
   * Copy directory recursively
   */
  copyRecursive(src, dest) {
    ensureDir(dest);
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        this.copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Calculate integrity hash for package
   */
  calculateIntegrity(packagePath) {
    const hash = crypto.createHash('sha256');
    this.hashDirectory(packagePath, hash);
    return 'sha256-' + hash.digest('base64');
  }

  /**
   * Hash directory contents recursively
   */
  hashDirectory(dir, hash) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip node_modules
      if (entry.name === 'node_modules') {
        continue;
      }
      
      hash.update(entry.name);
      
      if (entry.isDirectory()) {
        this.hashDirectory(fullPath, hash);
      } else {
        const content = fs.readFileSync(fullPath);
        hash.update(content);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear() {
    debug(`Clearing cache at ${this.cacheDir}`);
    
    if (fs.existsSync(this.cacheDir)) {
      this.removeRecursive(this.cacheDir);
      ensureDir(this.cacheDir);
    }
  }

  /**
   * Remove directory recursively
   */
  removeRecursive(dir) {
    if (!fs.existsSync(dir)) {
      return;
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        this.removeRecursive(fullPath);
      } else {
        fs.unlinkSync(fullPath);
      }
    }
    
    fs.rmdirSync(dir);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = fs.readdirSync(this.cacheDir);
    return {
      packages: entries.length,
      size: this.getDirectorySize(this.cacheDir)
    };
  }

  /**
   * Calculate directory size
   */
  getDirectorySize(dir) {
    let size = 0;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        size += this.getDirectorySize(fullPath);
      } else {
        size += fs.statSync(fullPath).size;
      }
    }
    
    return size;
  }
}

module.exports = { CacheManager };