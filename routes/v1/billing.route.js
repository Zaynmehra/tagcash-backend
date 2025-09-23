const express = require('express');
const router = express.Router();
const { checkApiKey, decryption, validateJoi, checkToken, checkTokenBrand, checkTokenCustomer } = require('../../middleware');
const billingController = require('../../controllers/v1/billingController');
const Joi = require('joi');
const {s3, upload} = require("../../utils/aws")

router.post("/listBill", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  search: Joi.string().allow(null, '').optional(),
  brandId: Joi.string().allow(null, '').optional(),
  brandStatus: Joi.string().allow(null, '').optional(),
  brandRefundStatus: Joi.string().allow(null, '').optional(),
  customerRefundStatus: Joi.string().allow(null, '').optional(),
  claimStatus: Joi.string().allow(null, '').optional(),
  startDate: Joi.string().allow(null, '').optional(),
  endDate: Joi.string().allow(null, '').optional(),
  status: Joi.string().allow(null, '').optional(),
})), billingController.list_billing);

router.post("/getBillById", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  billingId: Joi.string().required(),
})), billingController.get_content_by_id);




router.post("/uploadbill", checkApiKey, checkTokenCustomer, upload.fields([
  { name: 'uploadedBill', maxCount: 1 }
]), async (req, res, next) => {
  try {
    if (req.files && req.files.uploadedBill && req.files.uploadedBill[0]) {
      const file = req.files.uploadedBill[0];
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `TagCashMVP/user/${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
      };
      const uploadResult = await s3.upload(params).promise();
      req.body.uploadedBill = uploadResult.Location;
    }

    next();
  } catch (error) {
    return res.status(500).json({ code: 0, message: 'Failed to upload file(s)' });
  }
}, decryption, validateJoi(Joi.object({
  brandId: Joi.string().required(),
  billNo: Joi.string().optional(),
  billAmount: Joi.number().required(),
  uploadedBill: Joi.string().optional(),
})), billingController.upload_bill);




router.post("/uploadcontent", checkApiKey, checkTokenCustomer, upload.fields([
  { name: 'uploadContent', maxCount: 10 }
]), async (req, res, next) => {
  try {
    if (req.files && req.files.uploadContent && req.files.uploadContent[0]) {
      const file = req.files.uploadContent[0];
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `TagCashMVP/user/${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
      };
      const uploadResult = await s3.upload(params).promise();
      req.body.uploadContent = uploadResult.Location;
    }

    next();
  } catch (error) {
    return res.status(500).json({ code: 0, message: 'Failed to upload file(s)' });
  }
}, decryption, validateJoi(Joi.object({
  billingId: Joi.string().required(),
  brandId: Joi.string().required(),
  uploadContent: Joi.string().optional(),
  selectedOffer: Joi.string().optional(),
  selectedOfferType: Joi.string().optional(),
  contentType: Joi.string().valid('post', 'story', 'reel').required()
})), billingController.upload_content);




router.post("/paybill", checkApiKey, checkTokenCustomer, decryption, validateJoi(Joi.object({
  brandId: Joi.string().required(),
  billAmount: Joi.number().required(),
})), billingController.pay_bill);




router.post("/verify-payment", checkApiKey, checkTokenCustomer, decryption, validateJoi(Joi.object({
  razorpay_order_id: Joi.string().required(),
  razorpay_payment_id: Joi.string().required(),
  razorpay_signature: Joi.string().required(),
  billId: Joi.string().required(),
})), billingController.verify_payment);



router.post("/updatebill", checkApiKey, checkTokenCustomer, upload.fields([
  { name: 'billImage', maxCount: 1 },
  { name: 'content', maxCount: 1 }
]), async (req, res, next) => {
  try {
    if (req.files && req.files.billImage && req.files.billImage[0]) {
      const file = req.files.billImage[0];
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `TagCashMVP/user/${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
      };
      const uploadResult = await s3.upload(params).promise();
      const imageUrl = uploadResult.Location;
      req.body.billUrl = imageUrl
    }

    if (req.files && req.files.content && req.files.content[0]) {
      const file = req.files.content[0];
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `TagCashMVP/user/${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
      };
      const uploadResult = await s3.upload(params).promise();
      const contentUrl = uploadResult.Location;
      req.body.contentUrl = contentUrl;
    }

    next();
  } catch (error) {
    return res.status(500).json({ code: 0, message: 'Failed to upload file(s)' });
  }
}, decryption, validateJoi(Joi.object({
  billId: Joi.string().required(),
  customerId: Joi.string().optional(),
  instaId: Joi.string().optional(),
  status: Joi.string().optional(),
  brandId: Joi.string().optional(),
  billNo: Joi.string().optional(),
  billAmount: Joi.number().optional(),
  billUrl: Joi.string().optional(),
  contentUrl: Joi.string().optional(),
  instaContentUrl: Joi.string().optional(),
  refundClaimDate: Joi.string().optional(),
  refundAmount: Joi.number().optional(),
  refundStatus: Joi.string().optional(),
  brandRefundStatus: Joi.string().optional(),
  brandRefundDate: Joi.string().optional(),
  refundDate: Joi.string().optional(),
  likes: Joi.number().optional(),
  comments: Joi.number().optional(),
  views: Joi.number().optional(),
  metaFetch: Joi.string().optional(),
})), billingController.update_billing);




router.post("/deleteBill", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  billingId: Joi.string().required(),
})), billingController.delete_billing);

router.post("/fetchMetadata", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  billId: Joi.string().required(),
  fetchDate: Joi.string().optional(),
})), billingController.fetch_meta_data);

router.post("/listContent", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  search: Joi.string().allow(null, '').optional(),
  brandId: Joi.string().allow(null, '').optional(),
  brandStatus: Joi.string().allow(null, '').optional(),
  brandRefundStatus: Joi.string().allow(null, '').optional(),
  customerRefundStatus: Joi.string().allow(null, '').optional(),
  claimStatus: Joi.string().allow(null, '').optional(),
  startDate: Joi.string().allow(null, '').optional(),
  endDate: Joi.string().allow(null, '').optional(),
})), billingController.list_content);

router.post("/getContentById", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  billingId: Joi.string().required(),
})), billingController.get_content_by_id);


router.post("/updateContentStatus", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  billingId: Joi.string().required(),
})), billingController.update_content_status);


router.post("/updateInstaContentUrl", checkApiKey, checkTokenCustomer, decryption, validateJoi(Joi.object({
  instaUrl: Joi.string().required(),
  billingId: Joi.string().required(),
})), billingController.update_insta_content_url);



router.post("/updateContent", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  billId: Joi.string().required(),
  status: Joi.string().optional(),
  instaContentUrl: Joi.string().optional(),
  refundClaimDate: Joi.string().optional(),
  refundAmount: Joi.number().optional(),
  refundStatus: Joi.string().optional(),
  brandRefundStatus: Joi.string().optional(),
  brandRefundDate: Joi.string().optional(),
  refundDate: Joi.string().optional(),
  likes: Joi.number().optional(),
  comments: Joi.number().optional(),
  views: Joi.number().optional(),
  metaFetch: Joi.string().optional(),
  brandStatusDate: Joi.string().optional(),
  isInstPostViewed: Joi.boolean().optional(),
  instPostVerifyStatus: Joi.string().optional(),

})), billingController.update_content);

router.post("/fetchMetadataBrand", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  billId: Joi.string().required(),
  fetchDate: Joi.string().optional(),
})), billingController.fetch_meta_data_brand);


router.get("/", checkApiKey, checkTokenCustomer, decryption, validateJoi(Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  status: Joi.string().valid('pending for approval', 'upload content', 'approved', 'rejected').optional(),
  paymentType: Joi.string().valid('upload bill', 'pay now').optional()
}).options({ allowUnknown: true })), billingController.get_bills);

router.get("/stats", checkApiKey, checkTokenCustomer, decryption, billingController.get_bills_stats);

router.get("/:billingId", checkApiKey, checkTokenCustomer, decryption, validateJoi(Joi.object({
  billId: Joi.string().required()
}).options({ allowUnknown: true })), billingController.get_bill_by_id);


module.exports = router;