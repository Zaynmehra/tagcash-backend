const express = require('express');
const router = express.Router();
const { checkApiKey, decryption, validateJoi, checkToken, checkTokenBrand } = require('../../middleware');
const rateClassificationController = require('../../controllers/v1/rateClassificationController');
const Joi = require('joi');

const rangeSchema = Joi.object({
  from: Joi.number().required(),
  to: Joi.number().required(),
  amount: Joi.number().required()
});

router.post("/createOrUpdateRate", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  brandId: Joi.string().allow(null, '').optional(),
  contentType: Joi.string().valid('post', 'story', 'reel').default('story'),
  range: Joi.array().items(rangeSchema).min(1).required()
})), rateClassificationController.create_or_update_rate);

router.post("/getRates", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  contentType: Joi.string().valid('post', 'story', 'reel').allow(null, '').optional()
})), rateClassificationController.get_rates);

router.post("/getRateByBrand", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  brandId: Joi.string().allow(null, '').optional(),
  contentType: Joi.string().valid('post', 'story', 'reel').required()
})), rateClassificationController.get_rate_by_brand);

router.post("/deleteRate", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  rateId: Joi.string().required()
})), rateClassificationController.delete_rate);

router.post("/listRates", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  search: Joi.string().allow(null, '').optional(),
  contentType: Joi.string().valid('post', 'story', 'reel').allow(null, '').optional(),
  brandId: Joi.string().allow(null, '').optional()
})), rateClassificationController.list_rates);






router.post("/brand/createOrUpdateRate", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  contentType: Joi.string().valid('post', 'story', 'reel').default('story'),
  range: Joi.array().items(rangeSchema).min(1).required()
})), rateClassificationController.brand_create_or_update_rate);

router.post("/brand/getMyRates", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  contentType: Joi.string().valid('post', 'story', 'reel').allow(null, '').optional()
})), rateClassificationController.brand_get_my_rates);

router.post("/brand/getRateByContentType", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  contentType: Joi.string().valid('post', 'story', 'reel').required()
})), rateClassificationController.brand_get_rate_by_content_type);

router.post("/brand/deleteRate", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  rateId: Joi.string().required()
})), rateClassificationController.brand_delete_rate);

router.post("/brand/listMyRates", checkApiKey, checkTokenBrand, decryption, validateJoi(Joi.object({
  page: Joi.number().allow(null, '').optional(),
  limit: Joi.number().allow(null, '').optional(),
  contentType: Joi.string().valid('post', 'story', 'reel').allow(null, '').optional()
})), rateClassificationController.brand_list_my_rates);



module.exports = router;