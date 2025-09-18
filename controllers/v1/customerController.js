const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Customer = require('../../models/v1/Customer')
const {
    sendVerificationEmail,
    sendPasswordResetOTPEmail
} = require("../../utils/sendOtp.js");
const { OAuth2Client } = require('google-auth-library');
const { getInstagramFollowers } = require('../../utils/instaService.js');
const { sendResponse } = require('../../middleware/index.js');
const Challenge = require('../../models/v1/Challenge.js');
const OffersDeals = require('../../models/v1/OffersDeals.js');
const Brand = require('../../models/v1/Brand.js');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);



const verifyGoogleToken = async (idToken, deviceType) => {
    try {

        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: (deviceType === 'A' || deviceType === 'I') ? process.env.MOBILE_GOOGLE_CLIENT_ID : process.env.GOOGLE_CLIENT_ID,
        });
        return ticket.getPayload();
    } catch (error) {
        throw new Error('Invalid Google token');
    }
};

const generateTokens = (customerId) => {

    const accessToken = jwt.sign(
        { customerId, type: 'access' },
        process.env.JWT_SECRET_KEY,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15d' }
    );

    const refreshToken = jwt.sign(
        { customerId, type: 'refresh' },
        process.env.JWT_SECRET_KEY,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return { accessToken, refreshToken };
};

const handleValidationErrors = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    return null;
};

const getDeviceInfo = (req) => {
    const customerAgent = req.headers['customer-agent'] || '';
    const deviceInfo = {
        deviceInfo: customerAgent,
        ipAddress: req.ip || req.connection.remoteAddress,
        location: req.headers['x-forwarded-for'] || 'Unknown'
    };
    return deviceInfo;
};

const customerController = {

    signUp: async (req, res) => {
        try {
            const validationError = handleValidationErrors(req, res);
            if (validationError) return validationError;

            const {
                name,
                email,
                phone,
                password,
                instaId,
                upiId,
                deviceName,
                deviceType,
            } = req.body;

            const existingCustomer = await Customer.findOne({
                $or: [
                    { email: email.toLowerCase() },
                    ...(phone ? [{ phone }] : [])
                ],
                isDeleted: false
            });

            if (existingCustomer && existingCustomer.accountStatus === "pending") {
                const response = await sendVerificationEmail(email);

                existingCustomer.emailVerificationOTP = response.otp;
                existingCustomer.emailVerificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
                if (password) {
                    const hashedPassword = await bcrypt.hash(password, 10);
                    existingCustomer.password = hashedPassword;
                }
                if (phone) existingCustomer.phone = phone;
                if (instaId) existingCustomer.instaId = instaId.trim();
                if (upiId) existingCustomer.upiId = upiId.trim();
                if (deviceName) existingCustomer.deviceName = deviceName;
                if (deviceType) existingCustomer.deviceType = deviceType;

                await existingCustomer.save();

                return res.status(200).json({
                    success: true,
                    message: "Customer already exists but is not verified. A new verification code has been sent to your email.",
                    customerId: existingCustomer._id,
                });
            }

            if (existingCustomer) {
                return res.status(409).json({
                    success: false,
                    message: 'Customer already exists with this email or phone number'
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const customerData = {
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                lastActive: new Date(),
                instaId: instaId.trim(),
                upiId: upiId ? upiId.trim() : undefined,
                isEmailVerified: false,
                accountStatus: "pending"
            };

            if (phone) customerData.phone = phone.trim();
            if (deviceName) customerData.deviceName = deviceName;
            if (deviceType) customerData.deviceType = deviceType;

            const customer = new Customer(customerData);
            const deviceInfo = getDeviceInfo(req);
            customer.loginHistory.push(deviceInfo);

            await customer.save();
            const response = await sendVerificationEmail(email);
            customer.emailVerificationOTP = response.otp;
            customer.emailVerificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
            await customer.save();

            res.status(201).json({
                success: true,
                message: 'Customer registered successfully. Please check your email for OTP verification code.',
                customerId: customer._id
            });

        } catch (error) {
            console.error('Signup error:', error);
            if (error.code === 11000) {
                const field = Object.keys(error.keyValue)[0];
                return res.status(409).json({
                    success: false,
                    message: `Customer with this ${field} already exists`
                });
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error during registration'
            });
        }
    },

    login: async (req, res) => {
        try {
            const validationError = handleValidationErrors(req, res);
            if (validationError) return validationError;

            const {
                emailOrPhone,
                password,
                deviceName,
                deviceType,
                deviceToken
            } = req.body;

            const customer = await Customer.findOne({
                $or: [
                    { email: emailOrPhone.toLowerCase() },
                    { phone: emailOrPhone }
                ],
                isDeleted: false
            }).select('+password');

            if (!customer) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            if (customer.accountStatus !== "active") {
                return res.status(403).json({
                    success: false,
                    message: 'Account is not active. Please verify your email or contact support.'
                });
            }

            if (customer.isLocked) {
                return res.status(423).json({
                    success: false,
                    message: 'Account is locked. Please contact support.'
                });
            }

            const isPasswordValid = await bcrypt.compare(password, customer.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            if (deviceName) customer.deviceName = deviceName;
            if (deviceType) customer.deviceType = deviceType;
            if (deviceToken) customer.deviceToken = deviceToken;

            customer.lastActive = new Date();

            const deviceInfo = getDeviceInfo(req);
            customer.loginHistory.push(deviceInfo);

            if (customer.loginHistory.length > 10) {
                customer.loginHistory = customer.loginHistory.slice(-10);
            }

            const { accessToken, refreshToken } = generateTokens(customer._id);

            customer.refreshToken = refreshToken;
            await customer.save();

            const customerResponse = customer.toJSON();
            delete customerResponse.refreshToken;

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    customer: customerResponse,
                    accessToken,
                    refreshToken
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during login'
            });
        }
    },

    googleSignUp: async (req, res) => {
        try {
            const { idToken, instaId, upiId, phone, deviceName, deviceType, deviceToken } = req.body;
            if (!idToken || !instaId || !phone) {
                return res.status(400).json({
                    success: false,
                    message: 'ID token , instaId and phone are required'
                });
            }
            const googleUser = await verifyGoogleToken(idToken, deviceType);
            if (!googleUser) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid Google token'
                });
            }

            const { email, name, picture, sub: googleId } = googleUser;

            if (!email || !name) {
                return res.status(400).json({
                    success: false,
                    message: 'Required user information not available from Google'
                });
            }

            let customer = await Customer.findOne({
                $or: [
                    { email: email.toLowerCase() },
                    { instaId: instaId.trim() },
                    { phone: phone.trim() },
                ],
                isDeleted: false
            });

            const instaDetails = await getInstagramFollowers(instaId.trim());
            console.log({ instaDetails })
            const customerData = {
                name: name.trim(),
                email: email.toLowerCase().trim(),
                profilePicture: picture || undefined,
                lastActive: new Date(),
                instaId: instaId.trim(),
                upiId: upiId ? upiId.trim() : undefined,
                isEmailVerified: true,
                accountStatus: "active",
                authProvider: "google",
                instaDetails,
            };
            if (phone) customerData.phone = phone.trim();
            if (deviceName) customerData.deviceName = deviceName;
            if (deviceType) customerData.deviceType = deviceType;
            if (deviceToken) customerData.deviceToken = deviceToken;
            customer = new Customer(customerData);
            const deviceInfo = getDeviceInfo(req);
            customer.loginHistory.push(deviceInfo);
            await customer.save();
            // }
            const { accessToken, refreshToken } = generateTokens(customer._id);

            customer.refreshToken = refreshToken;
            await customer.save();

            const customerResponse = customer.toJSON();
            delete customerResponse.refreshToken;
            delete customerResponse.password;

            res.status(200).json({
                success: true,
                message: customer.googleId ? 'Google login successful' : 'Google account linked successfully',
                data: {
                    customer: customerResponse,
                    accessToken,
                    refreshToken
                }
            });

        } catch (error) {
            console.error('Google sign up error:', error);

            if (error.message.includes('Invalid') && error.message.includes('token')) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid Google token'
                });
            }

            if (error.code === 11000) {
                const field = Object.keys(error.keyValue)[0];
                return res.status(409).json({
                    success: false,
                    message: `Customer with this ${field} already exists`
                });
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error during Google authentication'
            });
        }
    },

    googleLogin: async (req, res) => {
        try {
            const { idToken, deviceName, deviceType, deviceToken } = req.body;

            if (!idToken) {
                return res.status(400).json({
                    success: false,
                    message: 'ID token is required'
                });
            }

            const googleUser = await verifyGoogleToken(idToken, deviceType);

            if (!googleUser) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid Google token'
                });
            }

            const { email } = googleUser;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Required user information not available from Google'
                });
            }

            let customer = await Customer.findOne({
                $or: [
                    { email: email.toLowerCase() },
                ],
                isDeleted: false
            });

            if (!customer) {
                return res.status(409).json({
                    success: false,
                    message: "Customer doesn't exists with this email"
                });
            }

            const { accessToken, refreshToken } = generateTokens(customer._id);

            customer.refreshToken = refreshToken;
            await customer.save();

            const customerResponse = customer.toJSON();
            delete customerResponse.refreshToken;
            delete customerResponse.password;

            res.status(200).json({
                success: true,
                message: 'Google login successful',
                data: {
                    customer: customerResponse,
                    accessToken,
                    refreshToken
                }
            });

        } catch (error) {
            console.error('Google sign up error:', error);

            if (error.message.includes('Invalid') && error.message.includes('token')) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid Google token'
                });
            }

            if (error.code === 11000) {
                const field = Object.keys(error.keyValue)[0];
                return res.status(409).json({
                    success: false,
                    message: `Customer with this ${field} already exists`
                });
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error during Google authentication'
            });
        }
    },

    refreshToken: async (req, res) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    message: 'Refresh token is required'
                });
            }

            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

            if (decoded.type !== 'refresh') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token type'
                });
            }

            const customer = await Customer.findOne({
                _id: decoded.customerId,
                refreshToken,
                isDeleted: false,
                isActive: true
            });

            if (!customer) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid refresh token'
                });
            }

            const tokens = generateTokens(customer._id);

            customer.refreshToken = tokens.refreshToken;
            customer.lastActive = new Date();
            await customer.save();

            res.status(200).json({
                success: true,
                message: 'Token refreshed successfully',
                data: tokens
            });

        } catch (error) {
            console.error('Refresh token error:', error);

            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired refresh token'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    },

    logout: async (req, res) => {
        try {
            const customerId = req.customer?.customerId || req.body.customerId;

            if (!customerId) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer ID is required'
                });
            }

            await Customer.findByIdAndUpdate(customerId, {
                $unset: { refreshToken: 1, deviceToken: 1 }
            });

            res.status(200).json({
                success: true,
                message: 'Logged out successfully'
            });

        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during logout'
            });
        }
    },

    verifyEmail: async (req, res) => {
        try {
            const { email, otp } = req.body;

            if (!email || !otp) {
                return res.status(400).json({
                    success: false,
                    message: "Email and verification OTP are required",
                });
            }

            const customer = await Customer.findOne({
                email: email.toLowerCase(),
                isDeleted: false
            });

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: "Customer not found",
                });
            }

            if (customer.isEmailVerified) {
                return res.status(200).json({
                    success: true,
                    message: "Email already verified",
                    isAccountActive: customer.accountStatus === "active",
                });
            }

            if (!customer.emailVerificationOTP) {
                return res.status(400).json({
                    success: false,
                    message: "No OTP found. Please request a new verification code.",
                });
            }

            if (customer.emailVerificationOTPExpires && customer.emailVerificationOTPExpires < Date.now()) {
                return res.status(400).json({
                    success: false,
                    message: "OTP has expired. Please request a new verification code.",
                });
            }

            if (customer.emailVerificationOTP !== otp) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid OTP. Please try again.",
                });
            }

            customer.isEmailVerified = true;
            customer.accountStatus = "active";
            customer.emailVerificationOTP = undefined;
            customer.emailVerificationOTPExpires = undefined;
            customer.lastActive = new Date();

            await customer.save();

            const { accessToken, refreshToken } = generateTokens(customer._id);
            customer.refreshToken = refreshToken;
            await customer.save();

            const customerResponse = customer.toJSON();
            delete customerResponse.refreshToken;

            res.status(200).json({
                success: true,
                message: "Email verified successfully",
                data: {
                    customer: customerResponse,
                    accessToken,
                    refreshToken
                }
            });

        } catch (error) {
            console.error("Email verification error:", error);
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message,
            });
        }
    },

    resendVerification: async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: "Email is required",
                });
            }

            const customer = await Customer.findOne({
                email: email.toLowerCase(),
                isDeleted: false
            });

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: "Customer not found",
                });
            }

            if (customer.isEmailVerified) {
                return res.status(200).json({
                    success: true,
                    message: "Email already verified",
                    isAccountActive: customer.accountStatus === "active",
                });
            }

            const response = await sendVerificationEmail(email);

            customer.emailVerificationOTP = response.otp;
            customer.emailVerificationOTPExpires = Date.now() + 10 * 60 * 1000;
            await customer.save();

            res.status(200).json({
                success: true,
                message: "New verification OTP sent to your email",
            });
        } catch (error) {
            console.error("Resend verification error:", error);
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message,
            });
        }
    },

    otpLogin: async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: "Email is required",
                });
            }
            console.log({ email })
            const customer = await Customer.findOne({ email });
            console.log({ customer })
            if (!customer) {
                return res.status(200).json({
                    success: true,
                    message: "If your email exists in our system, you will receive a password reset OTP",
                });
            }

            const response = await sendPasswordResetOTPEmail(email);
            console.log({ response })
            customer.emailOtp = response.otp;
            customer.emailOtpExpiry = new Date(Date.now() + 10 * 60 * 60 * 1000);
            await customer.save();

            res.status(200).json({
                success: true,
                message: "If your email exists in our system, you will receive a password reset OTP"
            });
        } catch (error) {
            console.error("Otp Login error:", error);
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message,
            });
        }
    },

    resetPassword: async (req, res) => {
        try {
            const { email, otp, newPassword } = req.body;

            if (!email || !otp || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: "Email, OTP, and new password are required",
                });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters long'
                });
            }

            const customer = await Customer.findOne({
                email: email.toLowerCase(),
                isDeleted: false
            });

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: "Customer not found",
                });
            }

            if (customer.accountStatus === "pending") {
                customer.accountStatus = "active";
                customer.isEmailVerified = true;
            }

            if (!customer.passwordResetOTP) {
                return res.status(400).json({
                    success: false,
                    message: "No OTP found. Please request a new password reset.",
                });
            }

            if (customer.passwordResetOTPExpires && customer.passwordResetOTPExpires < Date.now()) {
                return res.status(400).json({
                    success: false,
                    message: "OTP has expired. Please request a new password reset.",
                });
            }

            if (customer.passwordResetOTP !== otp) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid OTP. Please try again.",
                });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            customer.password = hashedPassword;
            customer.passwordResetOTP = undefined;
            customer.passwordResetOTPExpires = undefined;
            customer.lastActive = new Date();

            await customer.save();

            const { accessToken, refreshToken } = generateTokens(customer._id);
            customer.refreshToken = refreshToken;
            await customer.save();

            const customerResponse = customer.toJSON();
            delete customerResponse.refreshToken;

            res.status(200).json({
                success: true,
                message: "Password reset successful",
                data: {
                    customer: customerResponse,
                    accessToken,
                    refreshToken
                }
            });
        } catch (error) {
            console.error("Reset password error:", error);
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message,
            });
        }
    },

    changePassword: async (req, res) => {
        try {
            const { currentPassword, newPassword, sendOTP } = req.body;
            const customerId = req.customer.customerId;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: "Current password and new password are required",
                });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must be at least 8 characters long'
                });
            }

            const customer = await Customer.findById(customerId).select('+password');

            if (!customer || customer.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Customer not found",
                });
            }

            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, customer.password);
            if (!isCurrentPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: "Current password is incorrect",
                });
            }

            if (sendOTP) {
                const response = await sendVerificationEmail(customer.email);

                customer.passwordChangeOTP = response.otp;
                customer.passwordChangeOTPExpires = Date.now() + 10 * 60 * 1000;
                customer.newPasswordTemp = await bcrypt.hash(newPassword, 10);
                await customer.save();

                return res.status(200).json({
                    success: true,
                    message: "OTP sent to your email. Please verify to complete password change.",
                });
            }

            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            customer.password = hashedNewPassword;
            customer.lastActive = new Date();
            await customer.save();

            res.status(200).json({
                success: true,
                message: "Password changed successfully",
            });

        } catch (error) {
            console.error("Change password error:", error);
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message,
            });
        }
    },

    verifyChangePasswordOTP: async (req, res) => {
        try {
            const { otp } = req.body;
            const customerId = req.customer.customerId;

            if (!otp) {
                return res.status(400).json({
                    success: false,
                    message: "OTP is required",
                });
            }

            const customer = await Customer.findById(customerId);

            if (!customer || customer.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Customer not found",
                });
            }

            if (!customer.passwordChangeOTP || !customer.newPasswordTemp) {
                return res.status(400).json({
                    success: false,
                    message: "No password change request found. Please initiate password change again.",
                });
            }

            if (customer.passwordChangeOTPExpires && customer.passwordChangeOTPExpires < Date.now()) {
                return res.status(400).json({
                    success: false,
                    message: "OTP has expired. Please initiate password change again.",
                });
            }

            if (customer.passwordChangeOTP !== otp) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid OTP. Please try again.",
                });
            }

            customer.password = customer.newPasswordTemp;
            customer.passwordChangeOTP = undefined;
            customer.passwordChangeOTPExpires = undefined;
            customer.newPasswordTemp = undefined;
            customer.lastActive = new Date();
            await customer.save();

            res.status(200).json({
                success: true,
                message: "Password changed successfully",
            });

        } catch (error) {
            console.error("Verify change password OTP error:", error);
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message,
            });
        }
    },

    verifyOtpLogin: async (req, res) => {
        try {
            const { email, otp } = req.body;

            console.log({ email, otp })

            if (!email || !otp) {
                return res.status(400).json({
                    success: false,
                    message: "Email and OTP are required"
                });
            }

            const customer = await Customer.findOne({ email }).select('+emailOtp +emailOtpExpiry');

            console.log({ customer })

            if (!customer) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid credentials",
                });
            }

            console.log({
                emailOtp: customer.emailOtp,
                emailOtpExpiry: customer.emailOtpExpiry,
                otp: otp,
                date: Date.now(),
            })

            const isEmailOtpValid = (otp == customer.emailOtp && Date.now() < customer.emailOtpExpiry);

            if (!isEmailOtpValid) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid or expired OTP",
                });
            }
            customer.lastActive = new Date();
            customer.emailOtp = undefined;
            customer.emailOtpExpiry = undefined;
            const deviceInfo = getDeviceInfo(req);
            customer.loginHistory.push(deviceInfo);
            if (customer.loginHistory.length > 10) {
                customer.loginHistory = customer.loginHistory.slice(-10);
            }
            await customer.save();
            const { accessToken, refreshToken } = generateTokens(customer._id);
            customer.refreshToken = refreshToken;
            await customer.save();
            const customerResponse = customer.toJSON();
            delete customerResponse.refreshToken;
            res.status(200).json({
                success: true,
                message: "OTP login successful",
                data: {
                    customer: customerResponse,
                    accessToken,
                    refreshToken
                }
            });
        } catch (error) {
            console.error("OTP login error:", error);
            res.status(500).json({
                success: false,
                message: "Server error",
                error: error.message,
            });
        }
    },
    getProfile: async (req, res) => {
        try {

            const customerId = req.loginUser.id;

            const customer = await Customer.findById(customerId).select('-refreshToken');

            if (!customer || customer.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found'
                });
            }

            res.status(200).json({
                success: true,
                data: { customer }
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    },

    reEvaluateProfile: async (req, res) => {
        try {
            const customerId = req.loginUser.id;
            const customer = await Customer.findById(customerId);
            if (!customer || customer.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found'
                });
            }
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            if (customer.lastReEvaluation && customer.lastReEvaluation > thirtyDaysAgo) {
                return res.status(400).json({
                    success: false,
                    message: 'Profile was re-evaluated within the last 30 days'
                });
            }
            const instaDetails = await getInstagramFollowers(customer.instaId.trim());

            console.log({ instaDetails })

            const updatedCustomer = await Customer.findByIdAndUpdate(
                customerId,
                {
                    $set: {
                        'instaDetails.followersCount': instaDetails.followersCount,
                        'instaDetails.avgViews': instaDetails.avgViews,
                        'instaDetails.avgLikes': instaDetails.avgLikes,
                        'instaDetails.avgComments': instaDetails.avgComments,
                        'instaDetails.followingCount': instaDetails.followingCount,
                        'instaDetails.profile_pic_url': instaDetails.profile_pic_url,
                        'instaDetails.full_name': instaDetails.full_name,
                        'instaDetails.postsCount': instaDetails.postsCount,
                        'instaDetails.memberType': instaDetails.memberType,
                        lastReEvaluation: new Date()
                    }
                },
                { new: true, runValidators: true }
            ).select('-refreshToken -password');
            res.status(200).json({
                success: true,
                message: 'Profile re-evaluated successfully',
                data: { customer: updatedCustomer }
            });
        } catch (error) {
            console.error('Re-evaluation error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    },

    get_verified_brand: async (req, res) => {
        try {
            const { id } = req.loginUser;

            const getBrands = await Customer.findById(id).select('brandVerified').populate('brandVerified', 'brandname brandlogo');
            if (!getBrands) {
                return sendResponse(req, res, 200, 0, { keyword: "Brands_not_found", components: {} });
            }
            return sendResponse(req, res, 200, 1, { keyword: "success" }, { brands: getBrands });
        } catch (err) {
            console.error("Error fetching verified brands:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch", components: {} });
        }
    },

    search_brand: async (req, res) => {
        try {
            const { brandname } = req.params;

            let brands;

            if (!brandname || brandname.trim() === '') {
                brands = await Brand.find({}).select('brandname brandlogo').limit(50);
            } else {
                const searchRegex = new RegExp(brandname.trim(), 'i');
                brands = await Brand.find({
                    brandname: { $regex: searchRegex }
                }).select('brandname brandlogo').limit(50);
            }

            if (!brands || brands.length === 0) {
                return sendResponse(req, res, 200, 0, {
                    keyword: "no_data_found",
                    components: {}
                }, { brands: [] });
            }

            return sendResponse(req, res, 200, 1, {
                keyword: "success"
            }, { brands });

        } catch (err) {
            console.error("Error fetching brand offers and challenges:", err);
            return sendResponse(req, res, 500, 0, {
                keyword: "failed_to_fetch",
                components: {}
            });
        }
    },


    get_brand_offers: async (req, res) => {
        try {
            const { id } = req.loginUser;
            const { brandId } = req.params;

            const [getOffers, getChallenges] = await Promise.all([
                OffersDeals.find({ brandId }).select('title description'),
                Challenge.find({ brandId }).select('title description')
            ]);

            const combinedData = {
                offers: getOffers || [],
                challenges: getChallenges || []
            };


            if (!getOffers.length && !getChallenges.length) {
                return sendResponse(req, res, 200, 0, {
                    keyword: "no_data_found",
                    components: {}
                });
            }

            return sendResponse(req, res, 200, 1, {
                keyword: "success"
            }, combinedData);

        } catch (err) {
            console.error("Error fetching brand offers and challenges:", err);
            return sendResponse(req, res, 500, 0, {
                keyword: "failed_to_fetch",
                components: {}
            });
        }
    },
};

module.exports = customerController;