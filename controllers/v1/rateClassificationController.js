const RateClassification = require('../../models/v1/RateClassification');
const Brand = require('../../models/v1/Brand');
const { sendResponse } = require('../../middleware');

let rate_classification_controller = {
    create_or_update_rate: async (req, res) => {
        const { brandId, contentType, range } = req.body;
        try {
            // Validate range data
            if (!range || !Array.isArray(range) || range.length === 0) {
                return sendResponse(req, res, 200, 0, { keyword: "range_data_required", components: {} });
            }

            // Validate range structure
            for (let r of range) {
                if (!r.from || !r.to || !r.amount) {
                    return sendResponse(req, res, 200, 0, { keyword: "invalid_range_structure", components: {} });
                }
                if (r.from >= r.to) {
                    return sendResponse(req, res, 200, 0, { keyword: "invalid_range_values", components: {} });
                }
            }

            // If brandId is provided, verify it exists
            if (brandId) {
                const brand = await Brand.findById(brandId);
                if (!brand) {
                    return sendResponse(req, res, 200, 0, { keyword: "brand_not_found", components: {} });
                }
            }

            let query = {};
            let updateData = { contentType, range };

            if (brandId) {
                // Brand-specific rate
                query = { brandId, contentType };
                updateData.brandId = brandId;
            } else {
                // Generic rate (no brandId)
                query = { brandId: { $exists: false }, contentType };
            }

            const rateClassification = await RateClassification.findOneAndUpdate(
                query,
                updateData,
                { 
                    new: true, 
                    upsert: true,
                    runValidators: true 
                }
            ).populate('brandId', 'name');

            if (!rateClassification) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_update_rate", components: {} });
            }

            const message = brandId ? "brand_specific_rate_updated" : "generic_rate_updated";
            return sendResponse(req, res, 200, 1, { keyword: message, components: { id: rateClassification._id } });

        } catch (err) {
            console.error("Error creating/updating rate classification:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_rate", components: {} });
        }
    },

    get_rates: async (req, res) => {
        try {
            const { contentType } = req.body;

            let query = {};
            if (contentType) {
                query.contentType = contentType;
            }

            // Get generic rate (without brandId)
            const genericRate = await RateClassification.findOne({
                brandId: { $exists: false },
                ...query
            });

            // Get brand-specific rates (with brandId)
            const brandSpecificRates = await RateClassification.find({
                brandId: { $exists: true },
                ...query
            }).populate('brandId', 'name logo');

            const response = {
                genericRate: genericRate || null,
                brandSpecificRates: brandSpecificRates || []
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);

        } catch (err) {
            console.error("Error fetching rate classifications:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_rates", components: {} });
        }
    },

    get_rate_by_brand: async (req, res) => {
        try {
            const { brandId, contentType } = req.body;

            if (!contentType) {
                return sendResponse(req, res, 200, 0, { keyword: "content_type_required", components: {} });
            }

            let rateClassification;

            if (brandId) {
                // Check if brand exists
                const brand = await Brand.findById(brandId);
                if (!brand) {
                    return sendResponse(req, res, 200, 0, { keyword: "brand_not_found", components: {} });
                }

                // Try to get brand-specific rate first
                rateClassification = await RateClassification.findOne({
                    brandId,
                    contentType
                }).populate('brandId', 'name logo');

                // If no brand-specific rate found, fall back to generic rate
                if (!rateClassification) {
                    rateClassification = await RateClassification.findOne({
                        brandId: { $exists: false },
                        contentType
                    });
                }
            } else {
                // Get generic rate
                rateClassification = await RateClassification.findOne({
                    brandId: { $exists: false },
                    contentType
                });
            }

            if (!rateClassification) {
                return sendResponse(req, res, 200, 0, { keyword: "rate_not_found", components: {} });
            }

            return sendResponse(req, res, 200, 1, { keyword: "success" }, rateClassification);

        } catch (err) {
            console.error("Error fetching rate by brand:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_rate", components: {} });
        }
    },

    delete_rate: async (req, res) => {
        try {
            const { rateId } = req.body;

            if (!rateId) {
                return sendResponse(req, res, 200, 0, { keyword: "rate_id_required", components: {} });
            }

            const deletedRate = await RateClassification.findByIdAndDelete(rateId);

            if (!deletedRate) {
                return sendResponse(req, res, 200, 0, { keyword: "rate_not_found", components: {} });
            }

            return sendResponse(req, res, 200, 1, { keyword: "rate_deleted_successfully", components: {} });

        } catch (err) {
            console.error("Error deleting rate classification:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_delete_rate", components: {} });
        }
    },

    list_rates: async (req, res) => {
        try {
            const { page = 1, limit = 10, search, contentType, brandId } = req.body;
            const skip = (page - 1) * limit;

            let query = {};

            if (contentType) {
                query.contentType = contentType;
            }

            if (brandId) {
                query.brandId = brandId;
            }

            const aggregationPipeline = [
                { $match: query },
                {
                    $lookup: {
                        from: 'Brands', // Adjust collection name as needed
                        localField: 'brandId',
                        foreignField: '_id',
                        as: 'brandDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$brandDetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: search ? {
                        $or: [
                            { contentType: { $regex: search, $options: 'i' } },
                            { 'brandDetails.name': { $regex: search, $options: 'i' } }
                        ]
                    } : {}
                },
                {
                    $project: {
                        contentType: 1,
                        range: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        'brandDetails._id': 1,
                        'brandDetails.name': 1,
                        'brandDetails.logo': 1
                    }
                },
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: parseInt(limit) }
            ];

            const rates = await RateClassification.aggregate(aggregationPipeline);

            // Count total documents
            const countPipeline = [
                { $match: query },
                {
                    $lookup: {
                        from: 'Brands',
                        localField: 'brandId',
                        foreignField: '_id',
                        as: 'brandDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$brandDetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: search ? {
                        $or: [
                            { contentType: { $regex: search, $options: 'i' } },
                            { 'brandDetails.name': { $regex: search, $options: 'i' } }
                        ]
                    } : {}
                },
                { $count: "total" }
            ];

            const totalCountResult = await RateClassification.aggregate(countPipeline);
            const totalCount = totalCountResult.length > 0 ? totalCountResult[0].total : 0;
            const totalPages = Math.ceil(totalCount / limit);

            const response = {
                totalCount,
                totalPages,
                currentPage: parseInt(page),
                rates
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);

        } catch (err) {
            console.error("Error listing rate classifications:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_list_rates", components: {} });
        }
    }
};

module.exports = rate_classification_controller;