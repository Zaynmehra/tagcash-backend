const express = require('express');
const router = express.Router();
const { checkApiKey, decryption, validateJoi, checkToken } = require('../../middleware');
const categoryController = require('../../controllers/v1/categoryController');
const Joi = require('joi');

router.post("/addCategory", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  category: Joi.string().required(),
  subcategory: Joi.array().optional(),
  isActive: Joi.boolean().optional(),
})), categoryController.add_category);

router.post("/addsubcategory", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  subcategory: Joi.array().required(),
  categoryId: Joi.string().required(),
  isActive: Joi.boolean().optional(),
})), categoryController.add_subcategory);

router.post("/editCategory", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  categoryId: Joi.string().required(),
  category: Joi.string().optional(),
  subcategory: Joi.array().optional(),
  isActive: Joi.boolean().optional(),
})), categoryController.edit_category);

router.post("/listCategory", checkApiKey, decryption, validateJoi(Joi.object({
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  search: Joi.string().allow(null, '').optional(),
})), categoryController.list_category);

module.exports = router;