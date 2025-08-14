const express = require('express');
const router = express.Router();
const { checkApiKey, decryption, validateJoi, checkToken } = require('../../middleware');
const categoryController = require('../../controllers/v1/categoryController');
const Joi = require('joi');

router.post("/addCategory", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  name: Joi.string().required(),
  isActive: Joi.boolean().optional(),
})), categoryController.add_category);

router.post("/addsubcategory", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  name: Joi.string().required(),
  categoryId: Joi.string().required(),
  isActive: Joi.boolean().optional(),
})), categoryController.add_subcategory);

router.post("/editCategory", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  categoryId: Joi.string().required(),
  name: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
})), categoryController.edit_category);

router.post("/editSubCategory", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  subCategoryId: Joi.string().required(),
  name: Joi.string().optional(),
  categoryId: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
})), categoryController.edit_subcategory);

router.post("/listCategory", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  search: Joi.string().allow(null, '').optional(),
})), categoryController.list_category);

router.post("/listSubCategory", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  search: Joi.string().allow(null, '').optional(),
  categoryId: Joi.string().allow(null, '').optional(),
})), categoryController.list_subcategory);

module.exports = router;