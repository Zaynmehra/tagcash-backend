const AWS = require('aws-sdk');
const multer = require('multer');


AWS.config.update({ region: 'ap-south-1' });

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

const uploadToS3 = async (file, folder = 'user') => {
    try {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `TagCashMVP/${folder}/${Date.now()}_${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
        };

        const uploadResult = await s3.upload(params).promise();
        return {
            success: true,
            url: uploadResult.Location,
            filename: uploadResult.Key.split('/').pop()
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};

const deleteFromS3 = async (key) => {
    try {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key
        };

        await s3.deleteObject(params).promise();
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    upload,
    uploadToS3,
    deleteFromS3
};