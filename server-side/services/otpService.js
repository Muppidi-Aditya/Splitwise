import redis from '../config/redis.js';


const OTP_EXPIRY_SECONDS = 5 * 60;
const OTP_LENGTH = 6;

export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const storeOTP = async (email, otp, name = null) => {
    try {
        const key = `otp:login:${email.toLowerCase()}`;
        const value = JSON.stringify({
            otp,
            email: email.toLowerCase(),
            name,
            createdAt: new Date().toISOString(),
            attempts: 0,
        });

        await redis.setex(key, OTP_EXPIRY_SECONDS, value);
        return true;
    } catch (error) {
        console.error('Error storing OTP:', error);
        return false;
    }
};

export const validateOTP = async (email, submittedOTP) => {
    try {
        const key = `otp:login:${email.toLowerCase()}`;
        const storedData = await redis.get(key);

        if (!storedData) {
            return {
                valid: false,
                data: null,
                error: 'OTP expired or not found',
            };
        }

        const data = typeof storedData === 'string' ? JSON.parse(storedData) : storedData;

        if (data.otp !== submittedOTP) {
            data.attempts += 1;
            
            if (data.attempts >= 5) {
                await redis.del(key);
                return {
                    valid: false,
                    data: null,
                    error: 'Too many failed attempts. Please request a new OTP.',
                };
            }

            await redis.setex(key, OTP_EXPIRY_SECONDS, JSON.stringify(data));
            
            return {
                valid: false,
                data: null,
                error: 'Invalid OTP',
            };
        }

        await redis.del(key);

        return {
            valid: true,
            data: {
                email: data.email,
                name: data.name,
            },
            error: null,
        };
    } catch (error) {
        console.error('Error validating OTP:', error);
        return {
            valid: false,
            data: null,
            error: 'Error validating OTP',
        };
    }
};

export const otpExists = async (email) => {
    try {
        const key = `otp:login:${email.toLowerCase()}`;
        const exists = await redis.exists(key);
        return exists === 1;
    } catch (error) {
        console.error('Error checking OTP existence:', error);
        return false;
    }
};

export const getOTPTTL = async (email) => {
    try {
        const key = `otp:login:${email.toLowerCase()}`;
        return await redis.ttl(key);
    } catch (error) {
        console.error('Error getting OTP TTL:', error);
        return -1;
    }
};

