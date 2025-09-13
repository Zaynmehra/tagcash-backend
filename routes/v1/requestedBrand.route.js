const express = require('express');
const router = express.Router();
const { checkApiKey, decryption, validateJoi, checkToken } = require('../../middleware');
const requestedBrandController = require('../../controllers/v1/requestedBrandController');
const Joi = require('joi');

router.post("/createRequestedBrand", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  customerId: Joi.string().required(),
  brandName: Joi.string().required().trim().max(200),
  remark: Joi.string().allow(null, '').optional().trim(),
})), requestedBrandController.create_requested_brand);

router.post("/listRequestedBrands", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  search: Joi.string().allow(null, '').optional(),
  hasActionTaken: Joi.boolean().allow(null, '').optional(),
  isIncluded: Joi.boolean().allow(null, '').optional(),
})), requestedBrandController.list_requested_brands);

module.exports = router;