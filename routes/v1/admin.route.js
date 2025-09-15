const express = require('express');
const router = express.Router();
const { checkApiKey, decryption, validateJoi, checkToken } = require('../../middleware');
const adminController = require('../../controllers/v1/adminController');
const adminOffersController = require('../../controllers/v1/offersController');
const Joi = require('joi');


router.post("/createAdmin", checkApiKey, decryption, validateJoi(Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('super_admin', 'admin', 'moderator').optional(),
  permissions: Joi.array().items(Joi.string()).optional()
})), adminController.create_admin);

router.post("/listAdmin", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  search: Joi.string().allow(null, '').optional(),
  isActive: Joi.boolean().allow(null, '').optional(),
})), adminController.list_admin);

router.post("/getAdminById", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  adminId: Joi.string().required(),
})), adminController.get_admin_by_id);

router.post("/updateAdmin", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  adminId: Joi.string().required(),
  name: Joi.string().optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('super_admin', 'admin', 'moderator').optional(),
  permissions: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional(),
  isLocked: Joi.boolean().optional(),
  isDeleted: Joi.boolean().optional(),
})), adminController.update_admin);

router.post("/deleteAdmin", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  adminId: Joi.string().required(),
})), adminController.delete_admin);

// NEW ROUTE: Create offer for brand by admin
router.post("/createOfferForBrand", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  shortDescription: Joi.string().allow(null, '').optional(),
  brandId: Joi.string().required(),
  brandName: Joi.string().required(),
  offerType: Joi.string().valid('percentage', 'fixed_amount', 'buy_one_get_one', 'free_service', 'cashback', 'points', 'custom').required(),
  discountValue: Joi.number().min(0).allow(null, '').optional(),
  maxDiscountAmount: Joi.number().min(0).allow(null, '').optional(),
  minimumPurchaseAmount: Joi.number().min(0).allow(null, '').optional(),
  offerCode: Joi.string().max(20).allow(null, '').optional(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  totalUsageLimit: Joi.number().min(1).allow(null, '').optional(),
  perCustomerLimit: Joi.number().min(1).allow(null, '').optional(),
  targetAudience: Joi.string().valid('all', 'verified_only', 'new_customers', 'returning_customers', 'specific_customers', 'followers_range').allow(null, '').optional(),
  verifiedCustomersOnly: Joi.boolean().allow(null, '').optional(),
  specificCustomers: Joi.array().items(Joi.string()).allow(null, '').optional(),
  minFollowersRequired: Joi.number().min(0).allow(null, '').optional(),
  maxFollowersAllowed: Joi.number().min(0).allow(null, '').optional(),
  targetCategories: Joi.array().items(Joi.string()).allow(null, '').optional(),
  targetLocations: Joi.array().items(Joi.object({
    city: Joi.string().allow(null, '').optional(),
    state: Joi.string().allow(null, '').optional(),
    country: Joi.string().allow(null, '').optional()
  })).allow(null, '').optional(),
  offerImages: Joi.array().items(Joi.object({
    url: Joi.string().allow(null, '').optional(),
    alt: Joi.string().max(200).allow(null, '').optional(),
    type: Joi.string().valid('banner', 'thumbnail', 'detail', 'social_media').allow(null, '').optional()
  })).allow(null, '').optional(),
  bannerImage: Joi.string().allow(null, '').optional(),
  termsAndConditions: Joi.array().items(Joi.string().max(500)).allow(null, '').optional(),
  requirements: Joi.array().items(Joi.string().max(300)).allow(null, '').optional(),
  redemptionProcess: Joi.string().max(1000).allow(null, '').optional(),
  redemptionLocation: Joi.string().valid('online', 'in_store', 'both').allow(null, '').optional(),
  applicableItems: Joi.array().items(Joi.object({
    name: Joi.string().max(200).allow(null, '').optional(),
    category: Joi.string().allow(null, '').optional(),
    isExcluded: Joi.boolean().allow(null, '').optional()
  })).allow(null, '').optional(),
  priority: Joi.number().min(1).max(10).allow(null, '').optional(),
  isFeatured: Joi.boolean().allow(null, '').optional(),
  isFlashSale: Joi.boolean().allow(null, '').optional(),
  socialMediaRequirements: Joi.object({
    requireInstagramPost: Joi.boolean().allow(null, '').optional(),
    requireStoryMention: Joi.boolean().allow(null, '').optional(),
    requireBrandTag: Joi.boolean().allow(null, '').optional(),
    requiredHashtags: Joi.array().items(Joi.string()).allow(null, '').optional(),
    minimumViews: Joi.number().min(0).allow(null, '').optional(),
    minimumLikes: Joi.number().min(0).allow(null, '').optional()
  }).allow(null, '').optional(),
  status: Joi.string().valid('draft', 'active', 'paused', 'expired', 'cancelled').allow(null, '').optional(),
  isActive: Joi.boolean().allow(null, '').optional(),
  notificationSettings: Joi.object({
    notifyOnUsage: Joi.boolean().allow(null, '').optional(),
    notifyOnExpiry: Joi.boolean().allow(null, '').optional(),
    reminderDays: Joi.number().allow(null, '').optional()
  }).allow(null, '').optional(),
  approvalStatus: Joi.string().valid('pending', 'approved', 'rejected').allow(null, '').optional(),
  adminId: Joi.string().required(),
  approvalNotes: Joi.string().max(500).allow(null, '').optional(),
  autoExpire: Joi.boolean().allow(null, '').optional()
})), adminOffersController.create_offer_for_brand);

router.post("/listAllOffers", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  search: Joi.string().allow(null, '').optional(),
  status: Joi.string().valid('draft', 'active', 'paused', 'expired', 'cancelled').allow(null, '').optional(),
  offerType: Joi.string().valid('percentage', 'fixed_amount', 'buy_one_get_one', 'free_service', 'cashback', 'points', 'custom').allow(null, '').optional(),
  brandName: Joi.string().allow(null, '').optional(),
  isActive: Joi.boolean().allow(null, '').optional(),
  isFeatured: Joi.boolean().allow(null, '').optional(),
  approvalStatus: Joi.string().valid('pending', 'approved', 'rejected').allow(null, '').optional()
})), adminOffersController.list_all_offers);

router.post("/getOfferById", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  offerId: Joi.string().required()
})), adminOffersController.get_offer_by_id);

router.post("/updateOfferStatus", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  offerId: Joi.string().required(),
  status: Joi.string().valid('draft', 'active', 'paused', 'expired', 'cancelled').required()
})), adminOffersController.update_offer_status);

router.post("/updateOfferActiveStatus", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  offerId: Joi.string().required(),
  isActive: Joi.boolean().required()
})), adminOffersController.update_offer_active_status);

router.post("/updateOfferFeaturedStatus", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  offerId: Joi.string().required(),
  isFeatured: Joi.boolean().required()
})), adminOffersController.update_offer_featured_status);

router.post("/approveRejectOffer", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  offerId: Joi.string().required(),
  approvalStatus: Joi.string().valid('approved', 'rejected').required(),
  approvalNotes: Joi.string().allow(null, '').optional(),
  adminId: Joi.string().required()
})), adminOffersController.approve_reject_offer);

router.post("/deleteOffer", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  offerId: Joi.string().required()
})), adminOffersController.delete_offer);

router.post("/getOfferAnalytics", checkApiKey, checkToken, decryption, validateJoi(Joi.object({})), adminOffersController.get_offer_analytics);

router.post("/getOfferUsageHistory", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  offerId: Joi.string().required(),
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional()
})), adminOffersController.get_offer_usage_history);

router.post("/bulkUpdateOffers", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  offerIds: Joi.array().items(Joi.string()).required(),
  updateData: Joi.object({
    status: Joi.string().valid('draft', 'active', 'paused', 'expired', 'cancelled').optional(),
    isActive: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    approvalStatus: Joi.string().valid('pending', 'approved', 'rejected').optional()
  }).required()
})), adminOffersController.bulk_update_offers);


module.exports = router;