const express = require('express');
const router = express.Router();
const { checkApiKey, decryption, validateJoi, checkToken, checkTokenBrand, checkTokenCustomer } = require('../../middleware');
const brandController = require('../../controllers/v1/brandController');
const Joi = require('joi');

const {s3, upload} = require("../../utils/aws")

router.post("/registerBrand", checkApiKey, decryption, validateJoi(Joi.object({
  brandname: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  phone: Joi.string().required(),
  managername: Joi.string().required(),
  instaId: Joi.string().optional(),
  brandurl: Joi.string().optional(),
  paymentType : Joi.string().optional(),
})), brandController.register_brand);

router.post("/verifyRegistrationOTP", checkApiKey, decryption, validateJoi(Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().required()
})), brandController.verify_registration_otp);

router.post("/loginBrand", checkApiKey, decryption, validateJoi(Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
  deviceName: Joi.string().required(),
  deviceType: Joi.string().valid('A', 'I', 'W').required(),
  deviceToken: Joi.string().required()
})), brandController.access_account_brand);

router.post("/logoutBrand", checkApiKey, checkTokenBrand, decryption, brandController.logout_brand);

router.post("/changePasswordBrand", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().required()
})), brandController.change_password_brand);

router.get('/getBrandDetails', checkApiKey, checkTokenBrand, decryption, brandController.brand_details);

router.post("/sendOTPBrand", checkApiKey, decryption, validateJoi(Joi.object({
  email: Joi.string().required(),
})), brandController.send_otp_brand);

router.post("/verifyOTPBrand", checkApiKey, decryption, validateJoi(Joi.object({
  email: Joi.string().required(),
  otp: Joi.string().required(),
})), brandController.verify_otp_brand);

router.post("/resetpasswordBrand", checkApiKey, decryption, validateJoi(Joi.object({
  email: Joi.string().required(),
  newPassword: Joi.string().required(),
})), brandController.reset_password_brand);

router.post("/listBrand", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  search: Joi.string().allow(null, '').optional(),
  isActive: Joi.boolean().allow(null, '').optional(),
})), brandController.list_brand);

router.post("/listBrandTransactions", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  search: Joi.string().allow(null, '').optional(),
  isActive: Joi.boolean().allow(null, '').optional(),
})), brandController.get_brand_bills);

router.post("/getBrandById", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  brandId: Joi.string().required(),
})), brandController.get_brand_by_id);

router.post("/addBrand", checkApiKey, checkTokenBrand, upload.single('brandlogo'), async (req, res, next) => {
  try {
    let imageUrl;
    if (req.file) {
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `TagCashMVP/user/${Date.now()}_${req.file.originalname}`,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ACL: 'public-read'
      };
      const uploadResult = await s3.upload(params).promise();
      imageUrl = uploadResult.Location;
      var imagename = imageUrl;
      req.body.brandlogo = imagename;
    }
    next();
  } catch (error) {
    return res.status(500).json({ code: 0, message: 'Failed to upload image' });
  }
}, decryption, validateJoi(Joi.object({
  brandname: Joi.string().required(),
  phone: Joi.string().required(),
  email: Joi.string().email().required(),
  brandlogo: Joi.string().optional(),
  managername: Joi.string().required(),
  brandurl: Joi.string().optional(),
  category: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
  subcategory: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
})), brandController.add_brand);

router.post("/updateBrand", checkApiKey, checkTokenBrand,
  upload.fields([
    { name: 'brandlogo', maxCount: 1 },
    { name: 'carouselDesktop', maxCount: 10 },
    { name: 'carouselMobile', maxCount: 10 },
    { name: 'posterImages', maxCount: 10 },
    { name: 'mustTryItemImages', maxCount: 20 },
    { name: 'tryThisOutImages', maxCount: 20 }
  ]),
  async (req, res, next) => {
    try {
      if (req.files && req.files.brandlogo && req.files.brandlogo[0]) {
        const file = req.files.brandlogo[0];
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `TagCashMVP/user/${Date.now()}_${file.originalname}`,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read'
        };
        const uploadResult = await s3.upload(params).promise();
        req.body.brandlogo = uploadResult.Location
      }
      if (req.files && req.files.carouselDesktop) {
        const carouselDesktop = [];
        for (const file of req.files.carouselDesktop) {
          const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `TagCashMVP/user/${Date.now()}_${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
          };
          const uploadResult = await s3.upload(params).promise();
          carouselDesktop.push({
            url: uploadResult.Location,
            alt: req.body[`carouselDesktopAlt_${carouselDesktop.length}`] || ''
          });
        }
        if (!req.body.carouselImages) req.body.carouselImages = {};
        req.body.carouselImages.desktop = carouselDesktop;
      }
      if (req.files && req.files.carouselMobile) {
        const carouselMobile = [];
        for (const file of req.files.carouselMobile) {
          const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `TagCashMVP/user/${Date.now()}_${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
          };
          const uploadResult = await s3.upload(params).promise();
          carouselMobile.push({
            url: uploadResult.Location,
            alt: req.body[`carouselMobileAlt_${carouselMobile.length}`] || ''
          });
        }
        if (!req.body.carouselImages) req.body.carouselImages = {};
        req.body.carouselImages.mobile = carouselMobile;
      }
      if (req.files && req.files.posterImages) {
        const posterImages = [];
        for (let i = 0; i < req.files.posterImages.length; i++) {
          const file = req.files.posterImages[i];
          const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `TagCashMVP/user/${Date.now()}_${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
          };
          const uploadResult = await s3.upload(params).promise();
          posterImages.push({
            url: uploadResult.Location,
            title: req.body[`posterTitle_${i}`] || '',
            type: req.body[`posterType_${i}`] || 'general'
          });
        }
        req.body.posterImages = posterImages;
      }
      if (req.files && req.files.mustTryItemImages) {
        const mustTryItems = JSON.parse(req.body.mustTryItems || '[]');
        const uploadedImageUrls = [];
        for (const file of req.files.mustTryItemImages) {
          const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `TagCashMVP/user/${Date.now()}_${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
          };
          const uploadResult = await s3.upload(params).promise();
          uploadedImageUrls.push(uploadResult.Location);
        }
        let imageUrlIndex = 0;
        for (let i = 0; i < mustTryItems.length; i++) {
          if (imageUrlIndex < uploadedImageUrls.length) {
            mustTryItems[i].image = uploadedImageUrls[imageUrlIndex];
            imageUrlIndex++;
          }
        }

        req.body.mustTryItems = mustTryItems;
      }

      if (req.files && req.files.tryThisOutImages) {
        const tryThisOut = JSON.parse(req.body.tryThisOut || '[]');

        const uploadedImageUrls = [];
        for (const file of req.files.tryThisOutImages) {
          const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `TagCashMVP/user/${Date.now()}_${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
          };
          const uploadResult = await s3.upload(params).promise();
          uploadedImageUrls.push(uploadResult.Location);
        }

        let imageUrlIndex = 0;
        for (let i = 0; i < tryThisOut.length; i++) {
          const imageCount = parseInt(req.body[`tryThisOutImageCount_${i}`] || '0');

          if (imageCount > 0 && imageUrlIndex < uploadedImageUrls.length) {
            const itemImages = [];

            // Assign the specified number of images to this item
            for (let j = 0; j < imageCount && imageUrlIndex < uploadedImageUrls.length; j++) {
              itemImages.push(uploadedImageUrls[imageUrlIndex]);
              imageUrlIndex++;
            }

            if (itemImages.length > 0) {
              tryThisOut[i].images = itemImages;
            }
          }
        }

        req.body.tryThisOut = tryThisOut;
      }

      next();
    } catch (error) {
      console.error('Image upload error:', error);
      return res.status(500).json({ code: 0, message: 'Failed to upload images' });
    }
  },
  decryption,
  brandController.update_brand
);


router.post("/deleteBrand", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  brandId: Joi.string().required(),
})), brandController.delete_brand);

router.get("/dashboardBrand", checkApiKey, checkTokenBrand, decryption, brandController.dashboard_brand);

router.post("/archiveBrand", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  archive: Joi.boolean().required(),
})), brandController.archive_brand);

router.post("/addBalance", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  amount: Joi.number().required(),
})), brandController.add_balance);

router.post("/verifyPayment", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  razorpay_order_id: Joi.string().required(),
  razorpay_payment_id: Joi.string().required(),
  razorpay_signature: Joi.string().required(),
})), brandController.verify_payment);

router.post("/customersList", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(100).optional()
})), brandController.get_brand_customers);

router.post("/customersVerify", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  customerId: Joi.string().required()
})), brandController.verify_brand_customer);

router.post("/customersUnVerify", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  customerId: Joi.string().required()
})), brandController.unverify_brand_customer);

router.post("/customersDetails", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  customerId: Joi.string().required()
})), brandController.get_brand_customer_details);

router.post("/customersSearch", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  searchTerm: Joi.string().min(2).required(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(50).optional()
})), brandController.search_customers_for_brand);

router.post("/customers/export", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  format: Joi.string().valid('json', 'csv').optional(),
  isVerified: Joi.boolean().optional()
})), brandController.export_brand_customers);

router.post("/getBrandCustomerBills", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  customerId: Joi.string().required(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(100).optional(),
})), brandController.get_brand_customer_bills);


router.post("/checkEngagements", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  billId: Joi.string().required(),
})), brandController.check_engagements);


router.get("/getVerifiedBrand", checkApiKey, checkTokenCustomer, decryption, brandController.get_verified_brand);


router.post("/createOffer", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  title: Joi.string().max(200).required(),
  description: Joi.string().max(1000).required(),
  shortDescription: Joi.string().max(150).optional(),
  offerType: Joi.string().valid('percentage', 'fixed_amount', 'buy_one_get_one', 'free_service', 'cashback', 'points', 'custom').optional(),
  discountValue: Joi.number().min(0).optional(),
  maxDiscountAmount: Joi.number().min(0).optional(),
  minimumPurchaseAmount: Joi.number().min(0).optional(),
  offerCode: Joi.string().max(20).optional(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  totalUsageLimit: Joi.number().min(1).optional(),
  perCustomerLimit: Joi.number().min(1).optional(),
  targetAudience: Joi.string().valid('all', 'verified_only', 'new_customers', 'returning_customers', 'specific_customers', 'followers_range').optional(),
  verifiedCustomersOnly: Joi.boolean().optional(),
  specificCustomers: Joi.array().items(Joi.string()).optional(),
  minFollowersRequired: Joi.number().min(0).optional(),
  maxFollowersAllowed: Joi.number().min(0).optional(),
  targetCategories: Joi.array().items(Joi.string()).optional(),
  targetLocations: Joi.array().items(Joi.object({
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    country: Joi.string().optional()
  })).optional(),
  offerImages: Joi.array().items(Joi.object({
    url: Joi.string().optional(),
    alt: Joi.string().max(200).optional(),
    type: Joi.string().valid('banner', 'thumbnail', 'detail', 'social_media').optional()
  })).optional(),
  bannerImage: Joi.string().optional(),
  termsAndConditions: Joi.array().items(Joi.string().max(500)).optional(),
  requirements: Joi.array().items(Joi.string().max(300)).optional(),
  redemptionProcess: Joi.string().max(1000).optional(),
  redemptionLocation: Joi.string().valid('online', 'in_store', 'both').optional(),
  applicableItems: Joi.array().items(Joi.object({
    name: Joi.string().max(200).optional(),
    category: Joi.string().optional(),
    isExcluded: Joi.boolean().optional()
  })).optional(),
  priority: Joi.number().min(1).max(10).optional(),
  isFeatured: Joi.boolean().optional(),
  isFlashSale: Joi.boolean().optional(),
  socialMediaRequirements: Joi.object({
    requireInstagramPost: Joi.boolean().optional(),
    requireStoryMention: Joi.boolean().optional(),
    requireBrandTag: Joi.boolean().optional(),
    requiredHashtags: Joi.array().items(Joi.string()).optional(),
    minimumViews: Joi.number().min(0).optional(),
    minimumLikes: Joi.number().min(0).optional()
  }).optional(),
  notificationSettings: Joi.object({
    notifyOnUsage: Joi.boolean().optional(),
    notifyOnExpiry: Joi.boolean().optional(),
    reminderDays: Joi.number().optional()
  }).optional()
})), brandController.create_offer);

router.post("/getOffers", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(100).optional(),
  status: Joi.string().valid('draft', 'active', 'paused', 'expired', 'cancelled').optional(),
  offerType: Joi.string().valid('percentage', 'fixed_amount', 'buy_one_get_one', 'free_service', 'cashback', 'points', 'custom').optional(),
  isFeatured: Joi.boolean().optional(),
  isFlashSale: Joi.boolean().optional()
})), brandController.get_offers);

router.post("/getOfferById", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  offerId: Joi.string().required()
})), brandController.get_offer_by_id);

router.post("/updateOffer", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  offerId: Joi.string().required(),
  title: Joi.string().max(200).optional(),
  description: Joi.string().max(1000).optional(),
  shortDescription: Joi.string().max(150).optional(),
  offerType: Joi.string().valid('percentage', 'fixed_amount', 'buy_one_get_one', 'free_service', 'cashback', 'points', 'custom').optional(),
  discountValue: Joi.number().min(0).optional(),
  maxDiscountAmount: Joi.number().min(0).optional(),
  minimumPurchaseAmount: Joi.number().min(0).optional(),
  offerCode: Joi.string().max(20).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  totalUsageLimit: Joi.number().min(1).optional(),
  perCustomerLimit: Joi.number().min(1).optional(),
  targetAudience: Joi.string().valid('all', 'verified_only', 'new_customers', 'returning_customers', 'specific_customers', 'followers_range').optional(),
  verifiedCustomersOnly: Joi.boolean().optional(),
  specificCustomers: Joi.array().items(Joi.string()).optional(),
  minFollowersRequired: Joi.number().min(0).optional(),
  maxFollowersAllowed: Joi.number().min(0).optional(),
  targetCategories: Joi.array().items(Joi.string()).optional(),
  targetLocations: Joi.array().items(Joi.object({
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    country: Joi.string().optional()
  })).optional(),
  offerImages: Joi.array().items(Joi.object({
    url: Joi.string().optional(),
    alt: Joi.string().max(200).optional(),
    type: Joi.string().valid('banner', 'thumbnail', 'detail', 'social_media').optional()
  })).optional(),
  bannerImage: Joi.string().optional(),
  termsAndConditions: Joi.array().items(Joi.string().max(500)).optional(),
  requirements: Joi.array().items(Joi.string().max(300)).optional(),
  redemptionProcess: Joi.string().max(1000).optional(),
  redemptionLocation: Joi.string().valid('online', 'in_store', 'both').optional(),
  applicableItems: Joi.array().items(Joi.object({
    name: Joi.string().max(200).optional(),
    category: Joi.string().optional(),
    isExcluded: Joi.boolean().optional()
  })).optional(),
  priority: Joi.number().min(1).max(10).optional(),
  isFeatured: Joi.boolean().optional(),
  isFlashSale: Joi.boolean().optional(),
  socialMediaRequirements: Joi.object({
    requireInstagramPost: Joi.boolean().optional(),
    requireStoryMention: Joi.boolean().optional(),
    requireBrandTag: Joi.boolean().optional(),
    requiredHashtags: Joi.array().items(Joi.string()).optional(),
    minimumViews: Joi.number().min(0).optional(),
    minimumLikes: Joi.number().min(0).optional()
  }).optional(),
  status: Joi.string().valid('draft', 'active', 'paused', 'expired', 'cancelled').optional(),
  isActive: Joi.boolean().optional(),
  notificationSettings: Joi.object({
    notifyOnUsage: Joi.boolean().optional(),
    notifyOnExpiry: Joi.boolean().optional(),
    reminderDays: Joi.number().optional()
  }).optional()
})), brandController.update_offer);

router.post("/deleteOffer", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  offerId: Joi.string().required()
})), brandController.delete_offer);

router.post("/activateOffer", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  offerId: Joi.string().required()
})), brandController.activate_offer);

router.post("/deactivateOffer", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  offerId: Joi.string().required()
})), brandController.deactivate_offer);

router.post("/getOfferUsage", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  offerId: Joi.string().required(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(100).optional()
})), brandController.get_offer_usage);

router.post("/getOfferAnalytics", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  offerId: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional()
})), brandController.get_offer_analytics);

router.post("/searchBrand", checkApiKey, decryption, validateJoi(Joi.object({
  search: Joi.string().optional(),
})), brandController.search_brand);

module.exports = router;