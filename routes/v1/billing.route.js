const express = require('express');
const router = express.Router();
const { checkApiKey, decryption, validateJoi, checkToken, checkTokenBrand } = require('../../middleware');
const billingController = require('../../controllers/v1/billingController');
const Joi = require('joi');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

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
})), billingController.list_billing);

router.post("/getBillById", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  billingId: Joi.string().required(),
})), billingController.get_billing_by_id);

router.post("/addbill", checkApiKey, checkToken, upload.fields([
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
      const contentUrl = uploadResult.Location;
      req.body.contentUrl = contentUrl.split('/').pop();
    }

    next();
  } catch (error) {
    return res.status(500).json({ code: 0, message: 'Failed to upload file(s)' });
  }
}, decryption, validateJoi(Joi.object({
  customerId: Joi.string().required(),
  instaId: Joi.string().optional(),
  status: Joi.string().optional(),
  brandId: Joi.string().required(),
  billNo: Joi.string().optional(),
  billAmount: Joi.number().required(),
  billUrl: Joi.string().optional(),
  contentUrl: Joi.string().optional(),
})), billingController.add_billing);

router.post("/updatebill", checkApiKey, checkToken, upload.fields([
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
      req.body.billUrl = imageUrl.split('/').pop();
    }

    if (req.files && req.files.content && req.files.content[0]) {
      const file = req.files.content[0];
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `TagCashMVP/user/content_${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
      };
      const uploadResult = await s3.upload(params).promise();
      const contentUrl = uploadResult.Location;
      req.body.contentUrl = contentUrl.split('/').pop();
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
})), billingController.update_content);

router.post("/fetchMetadataBrand", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  billId: Joi.string().required(),
  fetchDate: Joi.string().optional(),
})), billingController.fetch_meta_data_brand);

module.exports = router;