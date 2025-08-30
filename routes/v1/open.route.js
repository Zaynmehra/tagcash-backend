const express = require('express');
const router = express.Router();
const { checkApiKey, decryption } = require('../../middleware');
const brandController = require('../../controllers/v1/brandController');

router.get("/explore", brandController.get_brands);
router.get("/getExploreById/:id", checkApiKey, decryption, brandController.get_open_brand_by_id);

module.exports = router;