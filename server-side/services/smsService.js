import dotenv from 'dotenv';
import { storeOTP, generateOTP } from './otpService.js';

dotenv.config();


const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'SPLITW';

export const sendOTPviaSMS = async (phoneNumber, otp, name = null) => {
    try {
        const formattedPhone = phoneNumber.startsWith('+') 
            ? phoneNumber.replace('+', '')
            : phoneNumber.startsWith('91') 
                ? phoneNumber 
                : `91${phoneNumber}`;

        const url = 'https:
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authkey': MSG91_AUTH_KEY,
            },
            body: JSON.stringify({
                template_id: process.env.MSG91_TEMPLATE_ID,
                mobile: formattedPhone,
                otp: otp,
                ...(name && { name: name }),
            }),
        });

        const data = await response.json();

        if (data.type === 'success' || response.ok) {
            console.log(`✅ OTP sent to ${phoneNumber}`);
            return {
                success: true,
                message: 'OTP sent successfully',
            };
        } else {
            console.error('❌ MSG91 API error:', data);
            return {
                success: false,
                message: data.message || 'Failed to send OTP',
            };
        }
    } catch (error) {
        console.error('❌ Error sending SMS:', error);
        
        if (process.env.NODE_ENV === 'development') {
            console.log(`🔐 [DEV MODE] OTP for ${phoneNumber}: ${otp}`);
            return {
                success: true,
                message: 'OTP logged to console (dev mode)',
            };
        }
        
        return {
            success: false,
            message: 'Failed to send OTP. Please try again.',
        };
    }
};

export const sendOTP = async (phoneNumber, name = null) => {
    try {
        const otp = generateOTP();

        const stored = await storeOTP(phoneNumber, otp, name);
        
        if (!stored) {
            return {
                success: false,
                message: 'Failed to store OTP. Please try again.',
            };
        }

        const smsResult = await sendOTPviaSMS(phoneNumber, otp, name);

        if (smsResult.success) {
            return {
                success: true,
                message: 'OTP sent successfully',
                ...(process.env.NODE_ENV === 'development' && { otp }),
            };
        } else {
            return {
                success: false,
                message: smsResult.message,
            };
        }
    } catch (error) {
        console.error('Error in sendOTP:', error);
        return {
            success: false,
            message: 'An error occurred. Please try again.',
        };
    }
};

