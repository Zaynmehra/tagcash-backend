const express = require('express');
const router = express.Router();
const { checkApiKey, decryption, validateJoi, checkToken } = require('../../middleware');
const challengeController = require('../../controllers/v1/challengeController');
const Joi = require('joi');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

router.post("/addChallenges", checkApiKey, checkToken, upload.fields([
  { name: 'challengesimage', maxCount: 1 },
]), async (req, res, next) => {
  try {
    if (req.files && req.files.challengesimage && req.files.challengesimage[0]) {
      const file = req.files.challengesimage[0];
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `TagCashMVP/user/${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
      };
      const uploadResult = await s3.upload(params).promise();
      const imageUrl = uploadResult.Location;
      req.body.challengesimage = imageUrl.split('/').pop();
    }
    next();
  } catch (error) {
    return res.status(500).json({ code: 0, message: 'Failed to upload file(s)' });
  }
}, decryption, validateJoi(Joi.object({
  challengesname: Joi.string().required(),
  challengesimage: Joi.string().optional(),
  challengesurl: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
})), challengeController.add_challenges);

router.post("/listChallenges", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  search: Joi.string().allow(null, '').optional(),
  isActive: Joi.boolean().allow(null, '').optional(),
})), challengeController.list_challenges);

router.post("/deleteChallenges", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  challengeId: Joi.string().required(),
})), challengeController.delete_challenges);

router.post("/updateChallengesStatus", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  challengeId: Joi.string().required(),
  isActive: Joi.boolean().required(),
})), challengeController.update_challenges_status);

module.exports = router;