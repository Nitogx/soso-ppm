'use strict';

const fs = require('fs');
const path = require('path');
const semver = require('semver');
const { loadRegistry, saveRegistry } = require('../config');
const { success, error, info, warn } = require('../utils/logger');
const git = require('../utils/git');

/**
 * Publish package to registry
 */
async function publish(args) {
  const cwd = process.cwd();
  const packageJsonPath = path.join(cwd, 'package.json');

  // Load package.json
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('No package.json found in current directory');
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Validate package.json
  validatePackageJson(packageJson);

  const { name, version } = packageJson;

  info(`Publishing ${name}@${version}...`);

  // Check if Git repository
  const gitDir = path.join(cwd, '.git');
  if (!fs.existsSync(gitDir)) {
    throw new Error('Not a git repository. Initialize with: git init');
  }

  // Check if working directory is clean
  const isClean = await git.isClean(cwd);
  if (!isClean) {
    throw new Error('Working directory is not clean. Commit or stash changes before publishing.');
  }

  // Get git remote URL
  const remoteUrl = await getGitRemoteUrl(cwd);
  if (!remoteUrl) {
    throw new Error('No git remote configured. Add remote with: git remote add origin <url>');
  }

  info(`Git remote: ${remoteUrl}`);

  // Load registry
  const registry = loadRegistry();

  // Check if package exists
  if (!registry.packages[name]) {
    registry.packages[name] = {
      name,
      versions: {}
    };
    info(`Adding new package: ${name}`);
  }

  // Check if version already exists
  if (registry.packages[name].versions[version]) {
    throw new Error(`Version ${version} already published. Update version in package.json.`);
  }

  // Create git tag
  const tag = `v${version}`;
  info(`Creating tag: ${tag}`);
  
  try {
    await git.createTag(tag, `Release ${version}`, cwd);
  } catch (err) {
    throw new Error(`Failed to create tag: ${err.message}`);
  }

  // Push tag to remote
  info('Pushing tag to remote...');
  try {
    await git.pushTags(cwd);
  } catch (err) {
    // Rollback: delete local tag
    await git.execGit(['tag', '-d', tag], { cwd });
    throw new Error(`Failed to push tag: ${err.message}`);
  }

  // Update registry
  registry.packages[name].versions[version] = {
    version,
    gitUrl: remoteUrl,
    tag,
    dependencies: packageJson.dependencies || {},
    publishedAt: new Date().toISOString()
  };

  saveRegistry(registry);

  success(`Published ${name}@${version}`);
  info(`Package available at: ${remoteUrl}#${tag}`);
}

/**
 * Validate package.json
 */
function validatePackageJson(packageJson) {
  // Check required fields
  if (!packageJson.name) {
    throw new Error('package.json missing required field: name');
  }

  if (!packageJson.version) {
    throw new Error('package.json missing required field: version');
  }

  // Validate name
  const nameRegex = /^(@[a-z0-9-]+\/)?[a-z0-9-]+$/;
  if (!nameRegex.test(packageJson.name)) {
    throw new Error(
      'Invalid package name. Use lowercase letters, numbers, and hyphens. ' +
      'Scoped packages: @scope/name'
    );
  }

  // Validate version
  if (!semver.valid(packageJson.version)) {
    throw new Error(`Invalid version: ${packageJson.version}. Must follow semver (e.g., 1.2.3)`);
  }
}

/**
 * Get git remote URL
 */
async function getGitRemoteUrl(cwd) {
  try {
    const output = await git.execGit(['remote', 'get-url', 'origin'], { cwd });
    return output.trim();
  } catch (error) {
    return null;
  }
}

module.exports = { publish };