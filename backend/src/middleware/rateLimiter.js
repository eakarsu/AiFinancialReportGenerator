const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

/**
 * AI endpoint rate limiter: 20 requests per hour.
 * Key = user ID (from req.user set by authMiddleware) or IP fallback
 * (using IPv6-safe ipKeyGenerator helper).
 */
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many AI requests. You are limited to 20 requests per hour. Please try again later.',
    retryAfter: '1 hour',
  },
  keyGenerator: (req, res) => {
    if (req.user?.id) return `user:${req.user.id}`;
    return ipKeyGenerator(req, res);
  },
});

module.exports = { aiRateLimiter };
