const express = require('express');
const router = express.Router();
const { checkApiKey, decryption, validateJoi, checkToken } = require('../../middleware');
const adminController = require('../../controllers/v1/adminController');
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

module.exports = router;