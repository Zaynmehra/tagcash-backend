const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const customerController = require('../../controllers/v1/customerController');
const { checkApiKey, decryption, validateJoi, checkTokenCustomer } = require('../../middleware');
const Joi = require('joi');


router.post('/signup', 
    checkApiKey, 
    decryption, 
    validateJoi(Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        phone: Joi.string().optional(),
        password: Joi.string().min(8).required(),
        instaId: Joi.string().required(),
        upiId: Joi.string().optional(),
        deviceName: Joi.string().optional(),
        deviceType: Joi.string().valid('A', 'I', 'W').required()
    })),
    customerController.signUp
);

router.post('/login', 
    checkApiKey, 
    decryption,
    validateJoi(Joi.object({
        emailOrPhone: Joi.string().required(),
        password: Joi.string().required(),
        deviceName: Joi.string().optional(),
        deviceType: Joi.string().valid('A', 'I', 'W').required(),
        deviceToken: Joi.string().optional()
    })),
    customerController.login
);

router.post('/google-signup', 
    checkApiKey, 
    decryption,
    validateJoi(Joi.object({
        idToken: Joi.string().required(),
        instaId: Joi.string().required(),
        upiId: Joi.string().optional(),
        phone: Joi.string().required(),
        deviceName: Joi.string().optional(),
        deviceType: Joi.string().valid('A', 'I', 'W', 'M').optional(),
        deviceToken: Joi.string().optional()
    })),
    customerController.googleSignUp
);

router.post('/google-login', 
    checkApiKey, 
    decryption,
    validateJoi(Joi.object({
        idToken: Joi.string().required(),
        deviceName: Joi.string().optional(),
        deviceType: Joi.string().valid('A', 'I', 'W', "M").optional(),
        deviceToken: Joi.string().optional()
    })),
    customerController.googleLogin
);

router.post('/refresh-token', 
    checkApiKey, 
    decryption,
    validateJoi(Joi.object({
        refreshToken: Joi.string().required()
    })),
    customerController.refreshToken
);

router.post('/logout', 
    checkApiKey, 
    checkTokenCustomer, 
    decryption,
    customerController.logout
);

router.post('/verify-email', 
    checkApiKey, 
    decryption,
    validateJoi(Joi.object({
        email: Joi.string().email().required(),
        otp: Joi.string().required()
    })),
    customerController.verifyEmail
);

router.post('/resend-verification', 
    checkApiKey, 
    decryption,
    validateJoi(Joi.object({
        email: Joi.string().email().required()
    })),
    customerController.resendVerification
);

router.post('/otp-login', 
    checkApiKey, 
    decryption,
    validateJoi(Joi.object({
        email: Joi.string().email().required()
    })),
    customerController.otpLogin
);

router.post('/verify-otp-login', 
    checkApiKey, 
    decryption,
    validateJoi(Joi.object({
        email: Joi.string().email().required(),
        otp: Joi.string().required()
    })),
    customerController.verifyOtpLogin
);

router.post('/reset-password', 
    checkApiKey, 
    decryption,
    validateJoi(Joi.object({
        email: Joi.string().email().required(),
        otp: Joi.string().required(),
        newPassword: Joi.string().min(8).required()
    })),
    customerController.resetPassword
);

router.post('/change-password', 
    checkApiKey, 
    checkTokenCustomer, 
    decryption,
    validateJoi(Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string().min(8).required(),
        sendOTP: Joi.boolean().optional()
    })),
    customerController.changePassword
);

router.post('/verify-change-password-otp', 
    checkApiKey, 
    checkTokenCustomer, 
    decryption,
    validateJoi(Joi.object({
        otp: Joi.string().required()
    })),
    customerController.verifyChangePasswordOTP
);

router.get('/profile', 
    checkApiKey, 
    checkTokenCustomer, 
    decryption,
    customerController.getProfile
);

router.get('/reEvaluateProfile', 
    checkApiKey, 
    checkTokenCustomer, 
    decryption,
    customerController.reEvaluateProfile
);


router.get('/verified-brands', 
    checkApiKey, 
    checkTokenCustomer, 
    decryption,
    customerController.get_verified_brand
);


router.get('/getBrands-offers', 
    checkApiKey, 
    checkTokenCustomer, 
    decryption,
    customerController.get_brand_offers
);

router.get('/search-brand', 
    checkApiKey, 
    checkTokenCustomer, 
    decryption,
    customerController.search_brand
);

module.exports = router;