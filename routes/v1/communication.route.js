const express = require('express');
const router = express.Router();
const { checkApiKey, decryption, validateJoi, checkToken, checkTokenBrand } = require('../../middleware');
const communication_controller = require('../../controllers/v1/communicationController');
const Joi = require('joi');
const {s3, upload} = require("../../utils/aws")

router.post("/createCommunication", checkApiKey, checkToken, upload.array('attachments', 10), async (req, res, next) => {
  try {
    let attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `TagCashMVP/communications/${Date.now()}_${file.originalname}`,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read'
        };
        const uploadResult = await s3.upload(params).promise();
        attachments.push({
          filename: file.originalname,
          fileUrl: uploadResult.Location,
          fileType: file.mimetype,
          fileSize: file.size
        });
      }
      req.body.attachments = JSON.stringify(attachments);
    }
    next();
  } catch (error) {
    return res.status(500).json({ code: 0, message: 'Failed to upload files' });
  }
}, decryption, validateJoi(Joi.object({
  brandId: Joi.string().required(),
  adminId: Joi.string().required(),
  subject: Joi.string().required(),
  type: Joi.string().valid('support', 'complaint', 'inquiry', 'feedback', 'technical', 'billing', 'general').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  message: Joi.string().required(),
  senderType: Joi.string().valid('newBrand', 'tagcashAdmins').required(),
  senderName: Joi.string().required(),
  messageType: Joi.string().valid('text', 'image', 'file', 'link').optional(),
  attachments: Joi.string().optional()
})), communication_controller.create_communication);

router.post("/addMessage", checkApiKey, checkToken, upload.array('attachments', 10), async (req, res, next) => {
  try {
    let attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `TagCashMVP/communications/${Date.now()}_${file.originalname}`,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read'
        };
        const uploadResult = await s3.upload(params).promise();
        attachments.push({
          filename: file.originalname,
          fileUrl: uploadResult.Location,
          fileType: file.mimetype,
          fileSize: file.size
        });
      }
      req.body.attachments = JSON.stringify(attachments);
    }
    next();
  } catch (error) {
    return res.status(500).json({ code: 0, message: 'Failed to upload files' });
  }
}, decryption, validateJoi(Joi.object({
  communicationId: Joi.string().required(),
  senderId: Joi.string().required(),
  senderType: Joi.string().valid('newBrand', 'tagcashAdmins').required(),
  senderName: Joi.string().required(),
  message: Joi.string().required(),
  messageType: Joi.string().valid('text', 'image', 'file', 'link').optional(),
  attachments: Joi.string().optional()
})), communication_controller.add_message);

router.post("/editMessage", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  communicationId: Joi.string().required(),
  messageId: Joi.string().required(),
  message: Joi.string().required()
})), communication_controller.edit_message);

router.post("/markMessageRead", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  communicationId: Joi.string().required(),
  messageId: Joi.string().required()
})), communication_controller.mark_message_read);

router.post("/updateStatus", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  communicationId: Joi.string().required(),
  status: Joi.string().valid('open', 'in_progress', 'pending_brand', 'pending_admin', 'resolved', 'closed').required()
})), communication_controller.update_status);

router.post("/updatePriority", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  communicationId: Joi.string().required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').required()
})), communication_controller.update_priority);

router.post("/getCommunication", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  communicationId: Joi.string().required()
})), communication_controller.get_communication);

router.post("/listCommunications", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  brandId: Joi.string().allow(null, '').optional(),
  adminId: Joi.string().allow(null, '').optional(),
  status: Joi.string().valid('open', 'in_progress', 'pending_brand', 'pending_admin', 'resolved', 'closed').allow(null, '').optional(),
  type: Joi.string().valid('support', 'complaint', 'inquiry', 'feedback', 'technical', 'billing', 'general').allow(null, '').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').allow(null, '').optional(),
  search: Joi.string().allow(null, '').optional()
})), communication_controller.list_communications);

router.post("/listBrandCommunications", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  brandId: Joi.string().required(),
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  status: Joi.string().valid('open', 'in_progress', 'pending_brand', 'pending_admin', 'resolved', 'closed').allow(null, '').optional(),
  type: Joi.string().valid('support', 'complaint', 'inquiry', 'feedback', 'technical', 'billing', 'general').allow(null, '').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').allow(null, '').optional()
})), communication_controller.list_brand_communications);

router.post("/listAdminCommunications", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  adminId: Joi.string().required(),
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  status: Joi.string().valid('open', 'in_progress', 'pending_brand', 'pending_admin', 'resolved', 'closed').allow(null, '').optional(),
  type: Joi.string().valid('support', 'complaint', 'inquiry', 'feedback', 'technical', 'billing', 'general').allow(null, '').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').allow(null, '').optional()
})), communication_controller.list_admin_communications);

router.post("/getUnreadCount", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  userId: Joi.string().required(),
  userType: Joi.string().valid('brand', 'admin').required()
})), communication_controller.get_unread_count);

router.post("/getStatistics", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  startDate: Joi.string().allow(null, '').optional(),
  endDate: Joi.string().allow(null, '').optional()
})), communication_controller.get_statistics);

router.post("/searchCommunications", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  query: Joi.string().required(),
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional()
})), communication_controller.search_communications);

module.exports = router;