import rateLimit from 'express-rate-limit'

/** 1 request per second per IP for AI and resume routes */
export const aiRateLimiter = rateLimit({
  windowMs: 1000,
  max: 1,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
})
