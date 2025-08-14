const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

const validateSignup = [
    body('name')
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    
    body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
    body('instaId')
        .notEmpty()
        .withMessage('Instagram ID is required')
        .isLength({ min: 1, max: 30 })
        .withMessage('Instagram ID must be between 1 and 30 characters'),
    
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Valid phone number is required'),
    
    body('deviceType')
        .isIn(['A', 'I', 'W'])
        .withMessage('Device type must be A (Android), I (iOS), or W (Web)'),
    
    handleValidationErrors
];

const validateLogin = [
    body('emailOrPhone')
        .notEmpty()
        .withMessage('Email or phone is required'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    body('deviceType')
        .isIn(['A', 'I', 'W'])
        .withMessage('Device type must be A (Android), I (iOS), or W (Web)'),
    
    handleValidationErrors
];

const validateEmail = [
    body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    
    handleValidationErrors
];

const validateOTP = [
    body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    
    body('otp')
        .isLength({ min: 4, max: 6 })
        .withMessage('OTP must be 4-6 digits')
        .isNumeric()
        .withMessage('OTP must contain only numbers'),
    
    handleValidationErrors
];

const validatePasswordReset = [
    body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    
    body('otp')
        .isLength({ min: 4, max: 6 })
        .withMessage('OTP must be 4-6 digits')
        .isNumeric()
        .withMessage('OTP must contain only numbers'),
    
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
    handleValidationErrors
];

const validatePasswordChange = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
    handleValidationErrors
];

const validateGoogleAuth = [
    body('idToken')
        .notEmpty()
        .withMessage('Google ID token is required'),
    
    body('instaId')
        .notEmpty()
        .withMessage('Instagram ID is required')
        .isLength({ min: 1, max: 30 })
        .withMessage('Instagram ID must be between 1 and 30 characters'),
    
    body('phone')
        .isMobilePhone()
        .withMessage('Valid phone number is required'),
    
    handleValidationErrors
];

const validateMongoId = (field = 'id') => [
    param(field)
        .isMongoId()
        .withMessage(`Valid ${field} is required`),
    
    handleValidationErrors
];

const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    
    handleValidationErrors
];

const validateBrandCreation = [
    body('brandname')
        .notEmpty()
        .withMessage('Brand name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Brand name must be between 2 and 100 characters'),
    
    body('managername')
        .notEmpty()
        .withMessage('Manager name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Manager name must be between 2 and 100 characters'),
    
    body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    
    body('phone')
        .isMobilePhone()
        .withMessage('Valid phone number is required'),
    
    body('brandurl')
        .optional()
        .isURL()
        .withMessage('Valid brand URL is required'),
    
    handleValidationErrors
];

const validateFileUpload = (fieldName, allowedTypes = ['image/jpeg', 'image/png', 'image/gif']) => {
    return (req, res, next) => {
        if (!req.file && !req.files) {
            return next();
        }

        const file = req.file || (req.files && req.files[fieldName] && req.files[fieldName][0]);
        
        if (file) {
            if (!allowedTypes.includes(file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
                });
            }

            if (file.size > 5 * 1024 * 1024) {
                return res.status(400).json({
                    success: false,
                    message: 'File size must be less than 5MB'
                });
            }
        }

        next();
    };
};

module.exports = {
    handleValidationErrors,
    validateSignup,
    validateLogin,
    validateEmail,
    validateOTP,
    validatePasswordReset,
    validatePasswordChange,
    validateGoogleAuth,
    validateMongoId,
    validatePagination,
    validateBrandCreation,
    validateFileUpload
};