'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { loadRegistry, ensureDir } = require('../config');
const { Resolver } = require('../resolver');
const { CacheManager } = require('../cache');
const { Lockfile } = require('../lockfile');
const { success, error, info, debug } = require('../utils/logger');
const chalk = require('chalk');
const git = require('../utils/git');
const os = require('os');

/**
 * Install dependencies
 */
async function install(args) {
  const cwd = process.cwd();
  const packageJsonPath = path.join(cwd, 'package.json');

  // Load package.json
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('No package.json found in current directory');
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Determine what to install
  let specificPackage = null;
  if (args.length > 0 && !args[0].startsWith('-')) {
    specificPackage = args[0];
  }

  if (specificPackage) {
    info(`Installing ${specificPackage}...`);
    // Add to dependencies if not present
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    if (!packageJson.dependencies[specificPackage]) {
      packageJson.dependencies[specificPackage] = '*';
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    }
  } else {
    info('Installing dependencies...');
  }

  const dependencies = packageJson.dependencies || {};

  if (Object.keys(dependencies).length === 0) {
    success('No dependencies to install');
    return;
  }

  // Load registry and initialize components
  const registry = loadRegistry();
  const cache = new CacheManager();
  const lockfile = new Lockfile(cwd);

  // Separate SOSO and npm packages
  const sosoPackages = {};
  const npmPackages = {};

  for (const [name, range] of Object.entries(dependencies)) {
    if (registry.packages[name]) {
      sosoPackages[name] = range;
    } else {
      npmPackages[name] = range;
    }
  }

  // Install SOSO packages
  if (Object.keys(sosoPackages).length > 0) {
    info('Resolving SOSO dependency tree...');
    const resolver = new Resolver(registry);
    const resolved = await resolver.resolve(sosoPackages);

    debug(`Resolved ${Object.keys(resolved).length} SOSO packages`);

    // Prepare node_modules
    const nodeModulesPath = path.join(cwd, 'node_modules');
    ensureDir(nodeModulesPath);

    // Install packages
    const installed = {};
    
    for (const [name, version] of Object.entries(resolved)) {
      await installPackage(name, version, nodeModulesPath, cache, registry, installed);
    }

    // Write lockfile
    lockfile.write(installed);

    success(`Installed ${Object.keys(installed).length} SOSO packages`);
  }

  // Install npm packages
  if (Object.keys(npmPackages).length > 0) {
    info(`Found ${Object.keys(npmPackages).length} packages not in SOSO registry, trying npm...`);
    
    for (const [name, range] of Object.entries(npmPackages)) {
      await installFromNpm(name, range, cwd);
    }
  }
}

/**
 * Install a single package
 */
async function installPackage(name, version, nodeModulesPath, cache, registry, installed) {
  info(`Installing ${name}@${version}...`);

  // Check cache first
  let sourcePath = cache.get(name, version);
  
  if (sourcePath) {
    debug(`Using cached ${name}@${version}`);
  } else {
    // Fetch from registry
    sourcePath = await fetchPackage(name, version, registry, cache);
  }

  // Install to node_modules
  const targetPath = getPackageInstallPath(name, nodeModulesPath);
  ensureDir(path.dirname(targetPath));
  
  // Copy from cache to node_modules
  copyDirectory(sourcePath, targetPath);

  // Calculate integrity
  const integrity = cache.calculateIntegrity(sourcePath);

  // Get package info from registry
  const packageData = registry.packages[name];
  const versionData = packageData.versions[version];

  // Track installed package
  installed[name] = {
    version,
    resolved: versionData.gitUrl,
    integrity,
    dependencies: versionData.dependencies || {}
  };

  debug(`Installed ${name}@${version} to ${targetPath}`);
}

/**
 * Fetch package from registry
 */
async function fetchPackage(name, version, registry, cache) {
  const packageData = registry.packages[name];
  if (!packageData) {
    throw new Error(`Package not found in registry: ${name}`);
  }

  const versionData = packageData.versions[version];
  if (!versionData) {
    throw new Error(`Version ${version} not found for ${name}`);
  }

  const gitUrl = versionData.gitUrl;
  const tag = `v${version}`;

  debug(`Fetching ${name}@${version} from ${gitUrl}`);

  // Create temporary directory for cloning
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soso-'));
  
  try {
    // Shallow clone at specific tag
    await git.clone(gitUrl, tempDir, { shallow: true, branch: tag });

    // Add to cache
    const cachePath = cache.add(name, version, tempDir);

    return cachePath;
  } finally {
    // Clean up temp directory
    removeDirectory(tempDir);
  }
}

/**
 * Get installation path for package
 */
function getPackageInstallPath(name, nodeModulesPath) {
  if (name.startsWith('@')) {
    // Scoped package: @scope/name -> node_modules/@scope/name
    const parts = name.split('/');
    return path.join(nodeModulesPath, parts[0], parts[1]);
  }
  return path.join(nodeModulesPath, name);
}

/**
 * Copy directory recursively
 */
function copyDirectory(src, dest) {
  ensureDir(dest);
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    // Skip .git directory
    if (entry.name === '.git') {
      continue;
    }
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Remove directory recursively
 */
function removeDirectory(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      removeDirectory(fullPath);
    } else {
      fs.unlinkSync(fullPath);
    }
  }
  
  fs.rmdirSync(dir);
}

/**
 * Install package from npm as fallback
 */
async function installFromNpm(packageName, versionRange, cwd) {
  return new Promise((resolve, reject) => {
    info(`Trying npm for ${packageName}...`);
    
    const npmInstall = spawn('npm', ['install', `${packageName}@${versionRange}`, '--save'], {
      cwd: cwd,
      stdio: 'pipe',
      shell: true
    });

    let stderr = '';
    
    npmInstall.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    npmInstall.on('close', (code) => {
      if (code !== 0) {
        // npm failed - show error in red
        console.error(chalk.red(`✗ The package ${packageName} has not been found neither in npm repos or soso registries`));
        reject(new Error(`Package ${packageName} not found`));
      } else {
        success(`Installed ${packageName} from npm`);
        resolve();
      }
    });

    npmInstall.on('error', (err) => {
      console.error(chalk.red(`✗ The package ${packageName} has not been found neither in npm repos or soso registries`));
      reject(new Error(`npm install failed: ${err.message}`));
    });
  });
}

module.exports = { install };