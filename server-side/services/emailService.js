import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { storeOTP, generateOTP } from './otpService.js';

dotenv.config();


const createTransporter = () => {
    if (process.env.EMAIL_SERVICE === 'gmail') {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD,
            },
        });
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    });
};

export const sendOTPviaEmail = async (email, otp, name = null) => {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log(`🔐 [DEV MODE] OTP for ${email}: ${otp}`);
            return {
                success: true,
                message: 'OTP logged to console (dev mode)',
            };
        }

        const transporter = createTransporter();

        const subject = 'Your Split Wise OTP';
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .otp-box { background: white; border: 2px solid #C364FA; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
                    .otp-code { font-size: 32px; font-weight: bold; color: #C364FA; letter-spacing: 5px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Split Wise</h1>
                    </div>
                    <div class="content">
                        <h2>${name ? `Hi ${name},` : 'Hello,'}</h2>
                        <p>Your OTP for Split Wise authentication is:</p>
                        <div class="otp-box">
                            <div class="otp-code">${otp}</div>
                        </div>
                        <p>This OTP is valid for <strong>5 minutes</strong>.</p>
                        <p>If you didn't request this OTP, please ignore this email.</p>
                        <div class="footer">
                            <p>This is an automated message. Please do not reply.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        const textContent = `
            Hi ${name || 'there'},
            
            Your OTP for Split Wise authentication is: ${otp}
            
            This OTP is valid for 5 minutes.
            
            If you didn't request this OTP, please ignore this email.
        `;

        const info = await transporter.sendMail({
            from: `"Split Wise" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            text: textContent,
            html: htmlContent,
        });

        console.log(`✅ OTP email sent to ${email}:`, info.messageId);
        return {
            success: true,
            message: 'OTP sent successfully via email',
        };
    } catch (error) {
        console.error('❌ Error sending email:', error);
        
        if (process.env.NODE_ENV === 'development') {
            console.log(`🔐 [DEV MODE] OTP for ${email}: ${otp}`);
            return {
                success: true,
                message: 'OTP logged to console (dev mode)',
            };
        }
        
        return {
            success: false,
            message: 'Failed to send OTP email. Please try again.',
        };
    }
};

export const sendOTP = async (email, name = null) => {
    try {
        const otp = generateOTP();

        const stored = await storeOTP(email, otp, name);
        
        if (!stored) {
            return {
                success: false,
                message: 'Failed to store OTP. Please try again.',
            };
        }

        const emailResult = await sendOTPviaEmail(email, otp, name);

        if (emailResult.success) {
            return {
                success: true,
                message: 'OTP sent successfully to your email',
                ...(process.env.NODE_ENV === 'development' && { otp }),
            };
        } else {
            return {
                success: false,
                message: emailResult.message,
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

export const sendReminderEmail = async (email, name, debts) => {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log(`📧 [DEV MODE] Reminder email for ${email}:`);
            console.log('Debts:', JSON.stringify(debts, null, 2));
            return {
                success: true,
                message: 'Reminder logged to console (dev mode)',
            };
        }

        const transporter = createTransporter();

        let debtListHTML = '';
        let totalDebt = 0;

        debts.forEach((debtInfo, index) => {
            const groupDebts = debtInfo.debts || [];
            const groupTotal = groupDebts.reduce((sum, d) => sum + parseFloat(d.amount), 0);
            totalDebt += Math.abs(debtInfo.balance);

            debtListHTML += `
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 6px;">
                    <h3 style="margin: 0 0 10px 0; color: #856404;">${debtInfo.groupName}</h3>
                    <p style="margin: 5px 0; color: #856404;"><strong>Total owed: ₹${Math.abs(debtInfo.balance).toFixed(2)}</strong></p>
                    <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
                        ${groupDebts.map(d => `<li>You owe <strong>${d.toName || 'User'}</strong> ₹${parseFloat(d.amount).toFixed(2)}</li>`).join('')}
                    </ul>
                </div>
            `;
        });

        const subject = 'Reminder: You Have Pending Dues in Split Wise';
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .total-box { background: white; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
                    .total-amount { font-size: 28px; font-weight: bold; color: #ef4444; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    .cta-button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Split Wise - Payment Reminder</h1>
                    </div>
                    <div class="content">
                        <h2>${name ? `Hi ${name},` : 'Hello,'}</h2>
                        <p>This is a friendly reminder that you have pending dues in the following groups:</p>
                        
                        ${debtListHTML}
                        
                        <div class="total-box">
                            <p style="margin: 0 0 10px 0; color: #666;">Total Amount Due</p>
                            <div class="total-amount">₹${totalDebt.toFixed(2)}</div>
                        </div>
                        
                        <p>Please settle your dues to keep your accounts balanced.</p>
                        
                        <div style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">Visit Dashboard</a>
                        </div>
                        
                        <div class="footer">
                            <p>This is an automated reminder. You will receive this email every 3 days until your dues are settled.</p>
                            <p>If you have already settled, please ignore this email.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        const textContent = `
            Hi ${name || 'there'},
            
            This is a friendly reminder that you have pending dues in Split Wise:
            
            ${debts.map(d => `
            Group: ${d.groupName}
            Total owed: ₹${Math.abs(d.balance).toFixed(2)}
            ${d.debts.map(debt => `- You owe ${debt.toName || 'User'} ₹${parseFloat(debt.amount).toFixed(2)}`).join('\n')}
            `).join('\n\n')}
            
            Total Amount Due: ₹${totalDebt.toFixed(2)}
            
            Please settle your dues to keep your accounts balanced.
            
            Visit: ${process.env.FRONTEND_URL || 'http://localhost:5173'}
        `;

        const info = await transporter.sendMail({
            from: `"Split Wise" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            text: textContent,
            html: htmlContent,
        });

        console.log(`✅ Reminder email sent to ${email}:`, info.messageId);
        return {
            success: true,
            message: 'Reminder email sent successfully',
        };
    } catch (error) {
        console.error('❌ Error sending reminder email:', error);
        return {
            success: false,
            message: 'Failed to send reminder email',
        };
    }
};


