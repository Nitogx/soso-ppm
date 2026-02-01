'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Get platform-specific configuration directory
 */
function getConfigDir() {
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'soso');
  }
  return path.join(os.homedir(), '.soso');
}

/**
 * Get cache directory
 */
function getCacheDir() {
  return path.join(getConfigDir(), 'cache');
}

/**
 * Get registry file path
 */
function getRegistryPath() {
  return path.join(getConfigDir(), 'registry.json');
}

/**
 * Get user config file path (.sosorc)
 */
function getUserConfigPath() {
  return path.join(os.homedir(), '.sosorc');
}

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Initialize configuration directories
 */
function initConfig() {
  ensureDir(getConfigDir());
  ensureDir(getCacheDir());
  
  const registryPath = getRegistryPath();
  if (!fs.existsSync(registryPath)) {
    fs.writeFileSync(registryPath, JSON.stringify({ packages: {} }, null, 2));
  }
}

/**
 * Load registry configuration
 */
function loadRegistry() {
  const registryPath = getRegistryPath();
  if (!fs.existsSync(registryPath)) {
    return { packages: {} };
  }
  
  try {
    const content = fs.readFileSync(registryPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load registry: ${error.message}`);
  }
}

/**
 * Save registry configuration
 */
function saveRegistry(registry) {
  const registryPath = getRegistryPath();
  ensureDir(path.dirname(registryPath));
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

/**
 * Load user configuration (.sosorc)
 */
function loadUserConfig() {
  const configPath = getUserConfigPath();
  if (!fs.existsSync(configPath)) {
    return {};
  }
  
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const config = {};
    
    // Parse simple KEY=VALUE format
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          config[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return config;
  } catch (error) {
    throw new Error(`Failed to load user config: ${error.message}`);
  }
}

module.exports = {
  getConfigDir,
  getCacheDir,
  getRegistryPath,
  getUserConfigPath,
  ensureDir,
  initConfig,
  loadRegistry,
  saveRegistry,
  loadUserConfig
};