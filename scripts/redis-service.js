/* eslint-disable @typescript-eslint/no-require-imports */
const Redis = require('ioredis');

/**
 * Redis Service for Scripts
 * 
 * Utility service để lưu script results vào Redis
 * Tái sử dụng code thay vì duplicate trong mỗi script
 */

/**
 * Lưu script result vào Redis
 * @param {Object} result - Script result object (có format ScriptResponse)
 * @param {string} redisKey - Redis key (từ AUTOMATION_REDIS_KEY env var)
 * @param {number} ttl - Time to live in seconds (default: 10)
 * @returns {Promise<boolean>} - true nếu thành công, false nếu thất bại
 */
async function saveScriptResult(result, redisKey, ttl = 10) {
  if (!redisKey) {
    // Không có redis key, skip
    return false;
  }

  let redis = null;
  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    await redis.connect();
    await redis.setex(redisKey, ttl, JSON.stringify(result));
    
    console.error(`Đã lưu kết quả vào Redis: ${redisKey}`);
    return true;
  } catch (redisError) {
    console.error('Lỗi khi lưu vào Redis:', redisError.message);
    return false;
  } finally {
    // Always close Redis connection
    if (redis) {
      try {
        await redis.quit();
      } catch {
        // Ignore close errors
      }
    }
  }
}

/**
 * Lưu script result vào Redis (tự động lấy key từ env)
 * @param {Object} result - Script result object (có format ScriptResponse)
 * @param {number} ttl - Time to live in seconds (default: 10)
 * @returns {Promise<boolean>} - true nếu thành công, false nếu thất bại
 */
async function saveResult(result, ttl = 10) {
  const redisKey = process.env.AUTOMATION_REDIS_KEY;
  return saveScriptResult(result, redisKey, ttl);
}

module.exports = {
  saveScriptResult,
  saveResult,
};

