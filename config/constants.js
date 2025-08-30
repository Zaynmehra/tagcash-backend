module.exports = {
    'APP_NAME': `Team Tagcash`,
    'USER_IMAGE_PATH': process.env.AWS_S3_PATH + 'user/',
    'ENCRYPTION_BYPASS': true,
    'SSL': false,
    'DEVICE_TYPES': {
        ANDROID: 'A',
        IOS: 'I',
        WEB: 'W'
    },
    'ACCOUNT_STATUS': {
        PENDING: 'pending',
        ACTIVE: 'active',
        INACTIVE: 'inactive',
        SUSPENDED: 'suspended'
    },
    'AUTH_PROVIDERS': {
        EMAIL: 'email',
        PHONE: 'phone',
        GOOGLE: 'google',
        APPLE: 'apple'
    },
    'MEMBER_TYPES': [
        "Starter Member",
        "Bronze Member", 
        "Silver Member",
        "Gold Member",
        "Priority Member"
    ]
};