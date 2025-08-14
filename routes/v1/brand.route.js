const express = require('express');
const router = express.Router();
const { checkApiKey, decryption, validateJoi, checkToken, checkTokenBrand } = require('../../middleware');
const brandController = require('../../controllers/v1/brandController');
const Joi = require('joi');
const AWS = require('aws-sdk');
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, 
    files: 20
  }
});


const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

router.post("/registerBrand", checkApiKey, decryption, validateJoi(Joi.object({
  brandname: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  phone: Joi.string().required(),
  managername: Joi.string().required(),
  brandurl: Joi.string().optional(),
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

router.post("/getBrandById", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  brandId: Joi.string().required(),
})), brandController.get_brand_by_id);

router.post("/addBrand", checkApiKey, checkToken, upload.single('brandlogo'), async (req, res, next) => {
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
        var imagename = imageUrl.split('/').pop();
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

router.post("/updateBrandAdmin", 
  checkApiKey, 
  checkToken,
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
          Key: `TagCashMVP/brand/logo/${Date.now()}_${file.originalname}`,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read'
        };
        const uploadResult = await s3.upload(params).promise();
        req.body.brandlogo = uploadResult.Location.split('/').pop();
      }

      // Handle carousel desktop images
      if (req.files && req.files.carouselDesktop) {
        const carouselDesktop = [];
        for (const file of req.files.carouselDesktop) {
          const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `TagCashMVP/brand/carousel/desktop/${Date.now()}_${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
          };
          const uploadResult = await s3.upload(params).promise();
          carouselDesktop.push({
            url: uploadResult.Location.split('/').pop(),
            alt: req.body[`carouselDesktopAlt_${carouselDesktop.length}`] || ''
          });
        }
        if (!req.body.carouselImages) req.body.carouselImages = {};
        req.body.carouselImages.desktop = carouselDesktop;
      }

      // Handle carousel mobile images
      if (req.files && req.files.carouselMobile) {
        const carouselMobile = [];
        for (const file of req.files.carouselMobile) {
          const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `TagCashMVP/brand/carousel/mobile/${Date.now()}_${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
          };
          const uploadResult = await s3.upload(params).promise();
          carouselMobile.push({
            url: uploadResult.Location.split('/').pop(),
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
            Key: `TagCashMVP/brand/posters/${Date.now()}_${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
          };
          const uploadResult = await s3.upload(params).promise();
          posterImages.push({
            url: uploadResult.Location.split('/').pop(),
            title: req.body[`posterTitle_${i}`] || '',
            type: req.body[`posterType_${i}`] || 'general'
          });
        }
        req.body.posterImages = posterImages;
      }
      if (req.files && req.files.mustTryItemImages) {
        const mustTryItems = JSON.parse(req.body.mustTryItems || '[]');
        let imageIndex = 0;
        
        for (let i = 0; i < mustTryItems.length; i++) {
          if (req.files.mustTryItemImages[imageIndex]) {
            const file = req.files.mustTryItemImages[imageIndex];
            const params = {
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: `TagCashMVP/brand/musttry/${Date.now()}_${file.originalname}`,
              Body: file.buffer,
              ContentType: file.mimetype,
              ACL: 'public-read'
            };
            const uploadResult = await s3.upload(params).promise();
            mustTryItems[i].image = uploadResult.Location.split('/').pop();
            imageIndex++;
          }
        }
        req.body.mustTryItems = mustTryItems;
      }
      if (req.files && req.files.tryThisOutImages) {
        const tryThisOut = JSON.parse(req.body.tryThisOut || '[]');
        let imageIndex = 0;
        
        for (let i = 0; i < tryThisOut.length; i++) {
          const itemImages = [];
          const imageCount = parseInt(req.body[`tryThisOutImageCount_${i}`] || '0');
          
          for (let j = 0; j < imageCount; j++) {
            if (req.files.tryThisOutImages[imageIndex]) {
              const file = req.files.tryThisOutImages[imageIndex];
              const params = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: `TagCashMVP/brand/trythisout/${Date.now()}_${file.originalname}`,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read'
              };
              const uploadResult = await s3.upload(params).promise();
              itemImages.push(uploadResult.Location.split('/').pop());
              imageIndex++;
            }
          }
          if (itemImages.length > 0) {
            tryThisOut[i].images = itemImages;
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
  validateJoi(Joi.object({
    brandId: Joi.string().required(),
    brandname: Joi.string().optional(),
    managername: Joi.string().optional(),
    phone: Joi.string().optional(),
    email: Joi.string().email().optional(),
    brandlogo: Joi.string().optional(),
    brandurl: Joi.string().optional(),
    website: Joi.string().optional(),
    about: Joi.string().max(2000).optional(),
    address: Joi.object({
      street: Joi.string().max(200).optional(),
      city: Joi.string().max(100).optional(),
      state: Joi.string().max(100).optional(),
      country: Joi.string().max(100).optional(),
      zipCode: Joi.string().max(20).optional(),
      fullAddress: Joi.string().max(500).optional()
    }).optional(),
    location: Joi.object({
      lat: Joi.string().optional(),
      lon: Joi.string().optional()
    }).optional(),
    category: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
    subcategory: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
    rateOfTwo: Joi.number().min(0).optional(),
    paymentType: Joi.string().valid('Escrow', 'Prepaid').optional(),
    mustTryItems: Joi.array().items(Joi.object({
      name: Joi.string().max(200).optional(),
      link: Joi.string().optional(),
      image: Joi.string().optional(),
      price: Joi.number().min(0).optional(),
      description: Joi.string().max(500).optional()
    })).optional(),
    brandGuidelines: Joi.array().items(Joi.string().max(500)).optional(),
    minimumFollowers: Joi.number().min(0).optional(),
    viewAndRefund: Joi.object({
      policy: Joi.string().max(1000).optional(),
      refundPercentage: Joi.number().min(0).max(100).optional(),
      refundDays: Joi.number().min(0).optional()
    }).optional(),
    procedure: Joi.string().max(2000).optional(),
    tryThisOut: Joi.array().items(Joi.object({
      title: Joi.string().max(200).optional(),
      images: Joi.array().items(Joi.string()).optional(),
      link: Joi.string().optional(),
      about: Joi.string().max(1000).optional(),
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional(),
      isActive: Joi.boolean().optional(),
      reward: Joi.number().min(0).optional(),
      requirements: Joi.array().items(Joi.string()).optional()
    })).optional(),
    carouselImages: Joi.object({
      desktop: Joi.array().items(Joi.object({
        url: Joi.string().optional(),
        alt: Joi.string().max(200).optional()
      })).optional(),
      mobile: Joi.array().items(Joi.object({
        url: Joi.string().optional(),
        alt: Joi.string().max(200).optional()
      })).optional()
    }).optional(),
    
    posterImages: Joi.array().items(Joi.object({
      url: Joi.string().optional(),
      title: Joi.string().max(200).optional(),
      type: Joi.string().valid('promotion', 'event', 'product', 'general').optional()
    })).optional(),
    isActive: Joi.boolean().optional(),
    isLocked: Joi.boolean().optional(),
    isDeleted: Joi.boolean().optional(),
    isVerified: Joi.boolean().optional(),
    archive: Joi.boolean().optional(),
    deviceName: Joi.string().optional(),
    deviceType: Joi.string().optional(),
    deviceToken: Joi.string().optional(),
    totalCampaigns: Joi.number().min(0).optional(),
    totalInfluencers: Joi.number().min(0).optional(),
    averageRating: Joi.number().min(0).max(5).optional(),
    totalReviews: Joi.number().min(0).optional(),
    carouselDesktopAlt_0: Joi.string().optional(),
    carouselDesktopAlt_1: Joi.string().optional(),
    carouselDesktopAlt_2: Joi.string().optional(),
    carouselDesktopAlt_3: Joi.string().optional(),
    carouselDesktopAlt_4: Joi.string().optional(),
    carouselMobileAlt_0: Joi.string().optional(),
    carouselMobileAlt_1: Joi.string().optional(),
    carouselMobileAlt_2: Joi.string().optional(),
    carouselMobileAlt_3: Joi.string().optional(),
    carouselMobileAlt_4: Joi.string().optional(),
    posterTitle_0: Joi.string().optional(),
    posterTitle_1: Joi.string().optional(),
    posterTitle_2: Joi.string().optional(),
    posterTitle_3: Joi.string().optional(),
    posterTitle_4: Joi.string().optional(),
    posterType_0: Joi.string().valid('promotion', 'event', 'product', 'general').optional(),
    posterType_1: Joi.string().valid('promotion', 'event', 'product', 'general').optional(),
    posterType_2: Joi.string().valid('promotion', 'event', 'product', 'general').optional(),
    posterType_3: Joi.string().valid('promotion', 'event', 'product', 'general').optional(),
    posterType_4: Joi.string().valid('promotion', 'event', 'product', 'general').optional(),
    tryThisOutImageCount_0: Joi.string().optional(),
    tryThisOutImageCount_1: Joi.string().optional(),
    tryThisOutImageCount_2: Joi.string().optional(),
    tryThisOutImageCount_3: Joi.string().optional(),
    tryThisOutImageCount_4: Joi.string().optional()
  })), 
  brandController.update_brand
);


router.post("/deleteBrand", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  brandId: Joi.string().required(),
})), brandController.delete_brand);

router.post("/dashboardBrand", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  brandId: Joi.string().required(),
  startDate: Joi.string().allow(null, '').optional(),
  endDate: Joi.string().allow(null, '').optional(),
})), brandController.dashboard_brand);

router.post("/archiveBrand", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  brandId: Joi.string().required(),
  archive: Joi.boolean().required(),
})), brandController.archive_brand);

module.exports = router;