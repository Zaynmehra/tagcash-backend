const RequestedBrand = require('../../models/v1/RequestedBrands');
const Customer = require('../../models/v1/Customer');
const { sendResponse } = require('../../middleware');

let requested_brand_controller = {
    create_requested_brand: async (req, res) => {
        const { customerId, brandName, remark } = req.body;
        try {
            const customer = await Customer.findById(customerId);
            if (!customer) {
                return sendResponse(req, res, 200, 0, { keyword: "customer_not_found", components: {} });
            }

            const existingRequest = await RequestedBrand.findOne({
                customerId,
                brandName: { $regex: new RegExp(`^${brandName}$`, 'i') }
            });

            if (existingRequest) {
                return sendResponse(req, res, 200, 0, { keyword: "brand_already_requested", components: {} });
            }

            const newRequestedBrand = new RequestedBrand({
                customerId,
                brandName,
                remark
            });

            const result = await newRequestedBrand.save();

            if (!result) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_create_brand_request", components: {} });
            }

            return sendResponse(req, res, 200, 1, { keyword: "brand_request_created", components: { id: result._id } });
        } catch (err) {
            console.error("Error creating brand request:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_create_brand_request", components: {} });
        }
    },

    list_requested_brands: async (req, res) => {
        try {
            const { page = 1, limit = 10, search, hasActionTaken, isIncluded } = req.body;
            const skip = (page - 1) * limit;

            let query = {};

            if (search) {
                query.$or = [
                    { brandName: { $regex: search, $options: 'i' } },
                    { 'customerDetails.name': { $regex: search, $options: 'i' } },
                    { 'customerDetails.email': { $regex: search, $options: 'i' } },
                    { 'customerDetails.instaId': { $regex: search, $options: 'i' } }
                ];
            }

            if (hasActionTaken !== null && typeof hasActionTaken !== 'undefined') {
                query.hasActionTaken = hasActionTaken;
            }

            if (isIncluded !== null && typeof isIncluded !== 'undefined') {
                query.isIncluded = isIncluded;
            }

            const aggregationPipeline = [
                { $match: query },
                {
                    $lookup: {
                        from: 'customers',
                        localField: 'customerId',
                        foreignField: '_id',
                        as: 'customerDetails'
                    }
                },
                {
                    $unwind: '$customerDetails'
                },
                {
                    $project: {
                        brandName: 1,
                        hasActionTaken: 1,
                        isIncluded: 1,
                        remark: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        'customerDetails._id': 1,
                        'customerDetails.name': 1,
                        'customerDetails.email': 1,
                        'customerDetails.phone': 1,
                        'customerDetails.instaId': 1,
                        'customerDetails.profileImage': 1,
                        'customerDetails.instaDetails.followersCount': 1,
                        'customerDetails.instaDetails.avgViews': 1,
                        'customerDetails.instaDetails.avgLikes': 1,
                        'customerDetails.instaDetails.avgComments': 1,
                        'customerDetails.instaDetails.memberType': 1,
                        'customerDetails.category': 1,
                        'customerDetails.isActive': 1,
                        'customerDetails.isVerified': 1
                    }
                },
                {
                    $match: search ? {
                        $or: [
                            { brandName: { $regex: search, $options: 'i' } },
                            { 'customerDetails.name': { $regex: search, $options: 'i' } },
                            { 'customerDetails.email': { $regex: search, $options: 'i' } },
                            { 'customerDetails.instaId': { $regex: search, $options: 'i' } }
                        ]
                    } : {}
                },
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: parseInt(limit) }
            ];

            const requestedBrands = await RequestedBrand.aggregate(aggregationPipeline);

            // Count total documents
            const countPipeline = [
                { $match: query },
                {
                    $lookup: {
                        from: 'customers',
                        localField: 'customerId',
                        foreignField: '_id',
                        as: 'customerDetails'
                    }
                },
                {
                    $unwind: '$customerDetails'
                },
                {
                    $match: search ? {
                        $or: [
                            { brandName: { $regex: search, $options: 'i' } },
                            { 'customerDetails.name': { $regex: search, $options: 'i' } },
                            { 'customerDetails.email': { $regex: search, $options: 'i' } },
                            { 'customerDetails.instaId': { $regex: search, $options: 'i' } }
                        ]
                    } : {}
                },
                { $count: "total" }
            ];

            const totalCountResult = await RequestedBrand.aggregate(countPipeline);
            const totalCount = totalCountResult.length > 0 ? totalCountResult[0].total : 0;
            const totalPages = Math.ceil(totalCount / limit);

            const response = {
                totalCount,
                totalPages,
                currentPage: parseInt(page),
                requestedBrands
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching requested brands:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_requested_brands", components: {} });
        }
    }
};

module.exports = requested_brand_controller;