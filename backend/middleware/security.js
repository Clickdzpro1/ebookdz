const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"]
    }
  }
});

const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { success: false, message },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = createRateLimit(15 * 60 * 1000, 5, 'Too many authentication attempts, please try again later');
const generalLimiter = createRateLimit(15 * 60 * 1000, 100, 'Too many requests, please try again later');
const uploadLimiter = createRateLimit(60 * 60 * 1000, 10, 'Too many uploads, please try again later');
const paymentLimiter = createRateLimit(60 * 60 * 1000, 20, 'Too many payment requests, please try again later');

module.exports = { securityHeaders, authLimiter, generalLimiter, uploadLimiter, paymentLimiter };