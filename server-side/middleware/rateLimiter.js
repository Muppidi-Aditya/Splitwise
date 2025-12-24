import redis from '../config/redis.js';

const RATE_LIMIT_WINDOW = 60 * 60;
const MAX_REQUESTS_PER_HOUR = parseInt(process.env.MAX_OTP_REQUESTS_PER_HOUR || '5');

export const checkRateLimit = async (email) => {
    try {
        const key = `rate_limit:otp:${email.toLowerCase()}`;
        
        const currentCount = await redis.get(key);
        const count = currentCount ? parseInt(currentCount) : 0;

        if (count >= MAX_REQUESTS_PER_HOUR) {
            const ttl = await redis.ttl(key);
            return {
                allowed: false,
                remaining: 0,
                resetAt: Date.now() + (ttl * 1000),
                error: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_HOUR} OTP requests per hour. Please try again later.`,
            };
        }

        if (count === 0) {
            await redis.setex(key, RATE_LIMIT_WINDOW, '1');
        } else {
            await redis.incr(key);
        }

        const remaining = MAX_REQUESTS_PER_HOUR - (count + 1);
        const ttl = await redis.ttl(key);

        return {
            allowed: true,
            remaining,
            resetAt: Date.now() + (ttl * 1000),
        };
    } catch (error) {
        console.error('Rate limit check error:', error);
        return {
            allowed: true,
            remaining: MAX_REQUESTS_PER_HOUR,
            resetAt: Date.now() + (RATE_LIMIT_WINDOW * 1000),
        };
    }
};

export const otpRateLimiter = async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Email is required',
        });
    }

    const rateLimitResult = await checkRateLimit(email);

    if (!rateLimitResult.allowed) {
        return res.status(429).json({
            success: false,
            message: rateLimitResult.error,
            resetAt: rateLimitResult.resetAt,
        });
    }

    req.rateLimitInfo = {
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt,
    };

    next();
};

