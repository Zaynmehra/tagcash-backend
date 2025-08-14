const { sendMail } = require('./configEmailSMTP');
const { APP_NAME } = require('../config/constants');
const common = require('./common');

const sendVerificationEmail = async (email) => {
    try {
        const otp = '123456' // await common.generateOtp();
        
        const response = await sendMail({
            from: `"${APP_NAME}" <${process.env.EMAIL_SMTP_USERNAME}>`,
            to: email,
            subject: `Email Verification - ${APP_NAME}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Email Verification</h2>
                    <p>Dear Customer,</p>
                    <p>Your email verification OTP for ${APP_NAME} is:</p>
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #333; font-size: 32px; margin: 0;">${otp}</h1>
                    </div>
                    <p>This OTP is valid for 10 minutes.</p>
                    <p>If you didn't request this verification, please ignore this email.</p>
                    <p>Thank you,<br>${APP_NAME} Team</p>
                </div>
            `
        });
        
        return { otp, status: true };
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new Error('Failed to send verification email');
    }
};

const sendPasswordResetOTPEmail = async (email) => {
    try {
        const otp = await common.generateOtp();
        
        const response = await sendMail({
            from: `"${APP_NAME}" <${process.env.EMAIL_SMTP_USERNAME}>`,
            to: email,
            subject: `Password Reset OTP - ${APP_NAME}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset Request</h2>
                    <p>Dear Customer,</p>
                    <p>You have requested to reset your password for ${APP_NAME}.</p>
                    <p>Your password reset OTP is:</p>
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #333; font-size: 32px; margin: 0;">${otp}</h1>
                    </div>
                    <p>This OTP is valid for 10 minutes.</p>
                    <p>If you didn't request this password reset, please ignore this email.</p>
                    <p>Thank you,<br>${APP_NAME} Team</p>
                </div>
            `
        });
        
        return { otp, status: true };
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw new Error('Failed to send password reset email');
    }
};

const sendWelcomeEmail = async (email, name, password) => {
    try {
        const response = await sendMail({
            from: `"${APP_NAME}" <${process.env.EMAIL_SMTP_USERNAME}>`,
            to: email,
            subject: `Welcome to ${APP_NAME}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Welcome to ${APP_NAME}!</h2>
                    <p>Dear ${name},</p>
                    <p>Your account has been created successfully on ${APP_NAME}.</p>
                    <p>Your login credentials are:</p>
                    <div style="background-color: #f4f4f4; padding: 20px; margin: 20px 0;">
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Password:</strong> ${password}</p>
                    </div>
                    <p>You can reset your password by clicking on the "Forgot Password" link on the login page.</p>
                    <p>If you have any questions, feel free to contact us.</p>
                    <p>Thank you,<br>${APP_NAME} Team</p>
                </div>
            `
        });
        
        return { status: true };
    } catch (error) {
        console.error('Error sending welcome email:', error);
        throw new Error('Failed to send welcome email');
    }
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetOTPEmail,
    sendWelcomeEmail
};