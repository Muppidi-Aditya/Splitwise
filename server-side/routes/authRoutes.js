import express from 'express';
import { sendOTP } from '../services/emailService.js';
import { validateOTP } from '../services/otpService.js';
import { loginUser, registerUser, findUserByEmail } from '../services/authService.js';
import { otpRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/send-otp', otpRateLimiter, async (req, res) => {
    try {
        const { email, type, name } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required',
            });
        }

        if (!type || (type !== 'login' && type !== 'register')) {
            return res.status(400).json({
                success: false,
                message: 'Type is required and must be either "login" or "register"',
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format',
            });
        }

        const user = await findUserByEmail(email);

        if (type === 'login') {
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found. Please register first.',
                });
            }
        } else if (type === 'register') {
            if (user) {
                return res.status(409).json({
                    success: false,
                    message: 'User already exists. Please login instead.',
                });
            }
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Name is required for registration',
                });
            }
        }

        const result = await sendOTP(email, name || null);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: result.message,
                ...(process.env.NODE_ENV === 'development' && result.otp && { otp: result.otp }),
                rateLimitInfo: req.rateLimitInfo,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: result.message,
            });
        }
    } catch (error) {
        console.error('Error in send-otp:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});

router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required',
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format',
            });
        }

        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: 'OTP must be 6 digits',
            });
        }

        const validationResult = await validateOTP(email, otp);

        if (!validationResult.valid) {
            return res.status(400).json({
                success: false,
                message: validationResult.error || 'Invalid or expired OTP',
            });
        }

        const { user, token } = await loginUser(email);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            user,
            token,
        });
    } catch (error) {
        console.error('Error in verify-otp:', error);
        
        if (error.message && error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }

        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                message: 'Email already exists',
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error',
        });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { email, otp, name } = req.body;

        if (!email || !otp || !name) {
            return res.status(400).json({
                success: false,
                message: 'Email, OTP, and name are required',
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format',
            });
        }

        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: 'OTP must be 6 digits',
            });
        }

        const validationResult = await validateOTP(email, otp);

        if (!validationResult.valid) {
            return res.status(400).json({
                success: false,
                message: validationResult.error || 'Invalid or expired OTP',
            });
        }

        const { user, token } = await registerUser(email, name);

        return res.status(201).json({
            success: true,
            message: 'Registration successful',
            user,
            token,
        });
    } catch (error) {
        console.error('Error in register:', error);
        
        if (error.message && error.message.includes('already exists')) {
            return res.status(409).json({
                success: false,
                message: error.message,
            });
        }

        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                message: 'Email already exists',
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error',
        });
    }
});

export default router;

