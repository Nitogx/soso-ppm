'use strict';

const { CacheManager } = require('../cache');
const { success, info } = require('../utils/logger');

/**
 * Clean package cache
 */
async function clean(args) {
  const cache = new CacheManager();
  
  info('Clearing package cache...');
  
  const stats = cache.getStats();
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  cache.clear();
  
  success(`Cleared cache (${stats.packages} packages, ${sizeMB} MB)`);
}

module.exports = { clean };