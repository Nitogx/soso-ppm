'use strict';

const { spawn } = require('child_process');
const { debug } = require('./logger');

/**
 * Execute git command with proper Windows support
 */
function execGit(args, options = {}) {
  return new Promise((resolve, reject) => {
    debug(`Executing: git ${args.join(' ')}`);
    
    const git = spawn('git', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      ...options
    });
    
    let stdout = '';
    let stderr = '';
    
    git.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    git.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    git.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Git command failed: ${stderr.trim() || stdout.trim()}`));
      } else {
        resolve(stdout.trim());
      }
    });
    
    git.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('Git is not installed or not in PATH'));
      } else {
        reject(error);
      }
    });
  });
}

/**
 * Clone a git repository
 */
async function clone(url, destination, options = {}) {
  const args = ['clone'];
  
  if (options.shallow) {
    args.push('--depth', '1');
  }
  
  if (options.branch) {
    args.push('--branch', options.branch);
  }
  
  args.push(url, destination);
  
  await execGit(args);
}

/**
 * Fetch tags from remote
 */
async function fetchTags(cwd) {
  await execGit(['fetch', '--tags'], { cwd });
}

/**
 * List all tags
 */
async function listTags(cwd) {
  const output = await execGit(['tag', '-l'], { cwd });
  return output.split('\n').filter(tag => tag.trim());
}

/**
 * Checkout a specific tag
 */
async function checkoutTag(tag, cwd) {
  await execGit(['checkout', tag], { cwd });
}

/**
 * Create an annotated tag
 */
async function createTag(tag, message, cwd) {
  await execGit(['tag', '-a', tag, '-m', message], { cwd });
}

/**
 * Push tags to remote
 */
async function pushTags(cwd) {
  await execGit(['push', '--tags'], { cwd });
}

/**
 * Check if working directory is clean
 */
async function isClean(cwd) {
  const output = await execGit(['status', '--porcelain'], { cwd });
  return output.length === 0;
}

/**
 * Get current commit hash
 */
async function getCurrentCommit(cwd) {
  return await execGit(['rev-parse', 'HEAD'], { cwd });
}

/**
 * Archive repository at specific ref
 */
async function archive(ref, destination, cwd) {
  await execGit(['archive', '--format=tar', `--output=${destination}`, ref], { cwd });
}

module.exports = {
  execGit,
  clone,
  fetchTags,
  listTags,
  checkoutTag,
  createTag,
  pushTags,
  isClean,
  getCurrentCommit,
  archive
};