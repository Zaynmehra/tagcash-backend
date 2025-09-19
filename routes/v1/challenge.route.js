const express = require('express');
const router = express.Router();
const { checkApiKey, decryption, validateJoi, checkToken, checkTokenBrand } = require('../../middleware');
const challengeController = require('../../controllers/v1/challengeController');
const Joi = require('joi');

const {s3, upload} = require("../../utils/aws")


const uploadChallengeImages = async (req, res, next) => {
  try {
    if (req.files && req.files.images) {
      const imageUrls = [];
      
      for (const file of req.files.images) {
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `TagCashMVP/challenges/${Date.now()}_${file.originalname}`,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read'
        };
        const uploadResult = await s3.upload(params).promise();
        imageUrls.push({
          url: uploadResult.Location,
          alt: file.originalname,
          type: req.body.imageTypes ? req.body.imageTypes[req.files.images.indexOf(file)] : 'banner'
        });
      }
      
      req.body.images = imageUrls;
    }

    if (req.files && req.files.bannerImage && req.files.bannerImage[0]) {
      const file = req.files.bannerImage[0];
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `TagCashMVP/challenges/banner_${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
      };
      const uploadResult = await s3.upload(params).promise();
      req.body.bannerImage = uploadResult.Location;
    }
    
    next();
  } catch (error) {
    console.error("File upload error:", error);
    return res.status(500).json({ code: 0, message: 'Failed to upload file(s)' });
  }
};

router.post("/addChallenges", checkApiKey, checkTokenBrand, upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'bannerImage', maxCount: 1 }
]), uploadChallengeImages, decryption, validateJoi(Joi.object({
  title: Joi.string().required().max(200),
  description: Joi.string().required().max(1000),
  shortDescription: Joi.string().optional().max(150).allow('', null),
  brandName: Joi.string().required(),
  link: Joi.string().optional().allow('', null),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  targetAudience: Joi.string().valid('all', 'verified_only', 'new_customers', 'returning_customers', 'specific_customers', 'followers_range').default('all'),
  verifiedCustomersOnly: Joi.boolean().default(false),
  specificCustomers: Joi.array().items(Joi.string()).optional(),
  minFollowersRequired: Joi.number().min(0).default(0),
  maxFollowersAllowed: Joi.number().min(0).optional().allow(null),
  targetCategories: Joi.array().items(Joi.string()).optional(),
  targetLocations: Joi.array().items(Joi.object({
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    country: Joi.string().optional()
  })).optional(),
  reward: Joi.number().min(0).required(),
  rewardType: Joi.string().valid('fixed_amount', 'percentage', 'free_product', 'discount_code').default('fixed_amount'),
  totalParticipationLimit: Joi.number().min(1).optional(),
  perCustomerLimit: Joi.number().min(1).default(1),
  requirements: Joi.array().items(Joi.string().max(300)).optional(),
  submissionGuidelines: Joi.string().max(1000).optional().allow('', null),
  socialMediaRequirements: Joi.object({
    requireInstagramPost: Joi.boolean().default(false),
    requireStoryMention: Joi.boolean().default(false),
    requireBrandTag: Joi.boolean().default(false),
    requiredHashtags: Joi.array().items(Joi.string()).optional(),
    minimumViews: Joi.number().min(0).default(0),
    minimumLikes: Joi.number().min(0).default(0)
  }).optional(),
  status: Joi.string().valid('draft', 'active', 'paused', 'completed', 'cancelled').default('draft'),
  isActive: Joi.boolean().default(true),
  priority: Joi.number().min(1).max(10).default(5),
  isFeatured: Joi.boolean().default(false),
  autoExpire: Joi.boolean().default(true)
})), challengeController.add_challenges);

// List Challenges
router.post("/listChallenges", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  page: Joi.number().min(1).default(1).optional(),
  limit: Joi.number().min(1).max(100).default(10).optional(),
  search: Joi.string().optional().allow('', null),
  isActive: Joi.boolean().optional().allow(null),
  status: Joi.string().valid('draft', 'active', 'paused', 'completed', 'cancelled').optional().allow('', null),
  targetAudience: Joi.string().valid('all', 'verified_only', 'new_customers', 'returning_customers', 'specific_customers', 'followers_range').optional().allow('', null),
  brandName: Joi.string().optional().allow('', null),
  startDateFrom: Joi.date().optional().allow(null),
  startDateTo: Joi.date().optional().allow(null),
  endDateFrom: Joi.date().optional().allow(null),
  endDateTo: Joi.date().optional().allow(null)
})), challengeController.list_challenges);

// Get Single Challenge
router.get("/getChallenge/:challengeId", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  challengeId: Joi.string().required()
}), 'params'), challengeController.get_challenge);

// Update Challenge
router.put("/updateChallenge/:challengeId", checkApiKey, checkTokenBrand, upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'bannerImage', maxCount: 1 }
]), uploadChallengeImages, decryption, validateJoi(Joi.object({
  challengeId: Joi.string().required()
}), 'params'), validateJoi(Joi.object({
  title: Joi.string().optional().max(200),
  description: Joi.string().optional().max(1000),
  shortDescription: Joi.string().optional().max(150).allow('', null),
  link: Joi.string().optional().allow('', null),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  targetAudience: Joi.string().valid('all', 'verified_only', 'new_customers', 'returning_customers', 'specific_customers', 'followers_range').optional(),
  verifiedCustomersOnly: Joi.boolean().optional(),
  specificCustomers: Joi.array().items(Joi.string()).optional(),
  minFollowersRequired: Joi.number().min(0).optional(),
  maxFollowersAllowed: Joi.number().min(0).optional().allow(null),
  targetCategories: Joi.array().items(Joi.string()).optional(),
  targetLocations: Joi.array().items(Joi.object({
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    country: Joi.string().optional()
  })).optional(),
  reward: Joi.number().min(0).optional(),
  rewardType: Joi.string().valid('fixed_amount', 'percentage', 'free_product', 'discount_code').optional(),
  totalParticipationLimit: Joi.number().min(1).optional(),
  perCustomerLimit: Joi.number().min(1).optional(),
  requirements: Joi.array().items(Joi.string().max(300)).optional(),
  submissionGuidelines: Joi.string().max(1000).optional().allow('', null),
  socialMediaRequirements: Joi.object({
    requireInstagramPost: Joi.boolean().optional(),
    requireStoryMention: Joi.boolean().optional(),
    requireBrandTag: Joi.boolean().optional(),
    requiredHashtags: Joi.array().items(Joi.string()).optional(),
    minimumViews: Joi.number().min(0).optional(),
    minimumLikes: Joi.number().min(0).optional()
  }).optional(),
  status: Joi.string().valid('draft', 'active', 'paused', 'completed', 'cancelled').optional(),
  isActive: Joi.boolean().optional(),
  priority: Joi.number().min(1).max(10).optional(),
  isFeatured: Joi.boolean().optional(),
  autoExpire: Joi.boolean().optional()
})), challengeController.update_challenge);

router.post("/deleteChallenges", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  challengeId: Joi.string().required(),
})), challengeController.delete_challenges);

router.post("/updateChallengesStatus", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  challengeId: Joi.string().required(),
  isActive: Joi.boolean().required(),
})), challengeController.update_challenges_status);


router.post("/participate/:challengeId", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  challengeId: Joi.string().required()
}), 'params'), validateJoi(Joi.object({
  customerId: Joi.string().required(),
  submission: Joi.string().optional().allow('', null),
  customerName: Joi.string().optional(),
  customerInstaId: Joi.string().optional()
})), challengeController.participate_in_challenge);

router.put("/participationStatus/:challengeId/:participationId", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  challengeId: Joi.string().required(),
  participationId: Joi.string().required()
}), 'params'), validateJoi(Joi.object({
  status: Joi.string().valid('submitted', 'under_review', 'approved', 'rejected', 'winner', 'rewarded').required(),
  notes: Joi.string().max(500).optional().allow('', null)
})), challengeController.update_participation_status);

module.exports = router;