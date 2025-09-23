const { decryption, validateJoi, checkToken, checkApiKey, checkTokenBrand } = require('../../middleware');
const authController = require('../../controllers/v1/authController.js');
const express = require('express');
const Joi = require('joi');
const router = express.Router();
const {s3, upload} = require("../../utils/aws")

router.post("/login", checkApiKey, decryption, validateJoi(Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
  device_name: Joi.string().required(),
  device_type: Joi.string().valid('A', 'I', 'W').required(),
  device_token: Joi.string().required()
})), authController.access_account);

router.post("/logout", checkApiKey, checkToken, decryption, authController.logout);

router.post("/changePassword", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().required()
})), authController.change_password);

router.get('/getUserDetails', checkApiKey, checkToken, decryption, authController.user_details);

router.post("/editProfile", checkApiKey, checkToken, upload.single('profileImage'), async (req, res, next) => {
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
        req.body.profileImage = imagename;
      }
      next();
    } catch (error) {
      return res.status(500).json({ code: 0, message: 'Failed to upload image' });
    }
  }, decryption, validateJoi(Joi.object({
    name: Joi.string().optional(),
    profileImage: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
    isLocked: Joi.boolean().optional(),
    isDeleted: Joi.boolean().optional(),
  })), authController.edit_profile);

router.post("/sendOTP", checkApiKey, decryption, validateJoi(Joi.object({
  email: Joi.string().required(),
})), authController.send_otp);

router.post("/verifyOTP", checkApiKey, decryption, validateJoi(Joi.object({
  email: Joi.string().required(),
  otp: Joi.string().required(),
})), authController.verify_otp);

router.post("/resetpassword", checkApiKey, decryption, validateJoi(Joi.object({
  email: Joi.string().required(),
  newPassword: Joi.string().required(),
})), authController.reset_password);

router.post("/listCustomer", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  search: Joi.string().allow(null, '').optional(),
  isActive: Joi.boolean().allow(null, '').optional(),
  isLocked: Joi.boolean().allow(null, '').optional(),
})), authController.list_customer);

router.post("/listCustomerTransactions", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  search: Joi.string().allow(null, '').optional(),
  isActive: Joi.boolean().allow(null, '').optional(),
  isLocked: Joi.boolean().allow(null, '').optional(),
})), authController.get_customer_bills);

router.post("/getCustomerById", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  userId: Joi.string().required(),
})), authController.get_customer_by_id);

router.post("/updateCustomer", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  userId: Joi.string().required(),
  isActive: Joi.boolean().optional(),
  isLocked: Joi.boolean().optional(),
  isDeleted: Joi.boolean().optional(),
})), authController.update_customer);

router.post("/dashboard", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  startDate: Joi.string().allow(null, '').optional(),
  endDate: Joi.string().allow(null, '').optional(),
})), authController.dashboard);

router.get("/getRedFlaggedUsers", checkApiKey, checkToken, decryption, authController.get_red_flagged_users);


module.exports = router;