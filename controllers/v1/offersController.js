const Offers = require('../../models/v1/OffersDeals');
const { sendResponse } = require('../../middleware');

let admin_offers_controller = {
    list_all_offers: async (req, res) => {
        try {
            const { page = 1, limit = 10, search, status, offerType, brandName, isActive, isFeatured, approvalStatus } = req.body;
            const skip = (page - 1) * limit;

            let query = { isDeleted: false };

            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { brandName: { $regex: search, $options: 'i' } },
                    { offerCode: { $regex: search, $options: 'i' } }
                ];
            }

            if (status) {
                query.status = status;
            }

            if (offerType) {
                query.offerType = offerType;
            }

            if (brandName) {
                query.brandName = { $regex: brandName, $options: 'i' };
            }

            if (isActive !== null && typeof isActive !== 'undefined') {
                query.isActive = isActive;
            }

            if (isFeatured !== null && typeof isFeatured !== 'undefined') {
                query.isFeatured = isFeatured;
            }

            if (approvalStatus) {
                query.approvalStatus = approvalStatus;
            }

            const offers = await Offers.find(query)
                .populate('createdBy', 'name email')
                .populate('approvedBy', 'name email')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            const totalCount = await Offers.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            const response = {
                totalCount,
                totalPages,
                currentPage: page,
                offers
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching offers:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_offers", components: {} });
        }
    },

    get_offer_by_id: async (req, res) => {
        const { offerId } = req.body;
        try {
            const offer = await Offers.findOne({
                _id: offerId,
                isDeleted: false
            })
                .populate('createdBy', 'name email')
                .populate('approvedBy', 'name email')
                .populate('specificCustomers', 'name email')
                .populate('usageHistory.customer', 'name email');

            if (!offer) {
                return sendResponse(req, res, 200, 0, { keyword: "offer_not_found", components: {} });
            }

            return sendResponse(req, res, 200, 1, { keyword: "success" }, { offer });
        } catch (err) {
            console.error("Error fetching offer:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_offer", components: {} });
        }
    },

    update_offer_status: async (req, res) => {
        const { offerId, status } = req.body;
        try {
            const existingOffer = await Offers.findOne({
                _id: offerId,
                isDeleted: false
            });

            if (!existingOffer) {
                return sendResponse(req, res, 200, 0, { keyword: "offer_not_found", components: {} });
            }

            await Offers.findByIdAndUpdate(offerId, { status });

            return sendResponse(req, res, 200, 1, { keyword: "offer_status_updated", components: {} });
        } catch (err) {
            console.error("Error updating offer status:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_offer_status", components: {} });
        }
    },

    update_offer_active_status: async (req, res) => {
        const { offerId, isActive } = req.body;
        try {
            const existingOffer = await Offers.findOne({
                _id: offerId,
                isDeleted: false
            });

            if (!existingOffer) {
                return sendResponse(req, res, 200, 0, { keyword: "offer_not_found", components: {} });
            }

            await Offers.findByIdAndUpdate(offerId, { isActive });

            return sendResponse(req, res, 200, 1, { keyword: "offer_active_status_updated", components: {} });
        } catch (err) {
            console.error("Error updating offer active status:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_offer_active_status", components: {} });
        }
    },

    update_offer_featured_status: async (req, res) => {
        const { offerId, isFeatured } = req.body;
        try {
            const existingOffer = await Offers.findOne({
                _id: offerId,
                isDeleted: false
            });

            if (!existingOffer) {
                return sendResponse(req, res, 200, 0, { keyword: "offer_not_found", components: {} });
            }

            await Offers.findByIdAndUpdate(offerId, { isFeatured });

            return sendResponse(req, res, 200, 1, { keyword: "offer_featured_status_updated", components: {} });
        } catch (err) {
            console.error("Error updating offer featured status:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_offer_featured_status", components: {} });
        }
    },

    approve_reject_offer: async (req, res) => {
        const { offerId, approvalStatus, approvalNotes, adminId } = req.body;
        try {
            const existingOffer = await Offers.findOne({
                _id: offerId,
                isDeleted: false
            });

            if (!existingOffer) {
                return sendResponse(req, res, 200, 0, { keyword: "offer_not_found", components: {} });
            }

            const updateData = {
                approvalStatus,
                approvedBy: adminId,
                approvalNotes: approvalNotes || ''
            };

            if (approvalStatus === 'approved') {
                updateData.status = 'active';
                updateData.isActive = true;
            } else if (approvalStatus === 'rejected') {
                updateData.status = 'cancelled';
                updateData.isActive = false;
            }

            await Offers.findByIdAndUpdate(offerId, updateData);

            return sendResponse(req, res, 200, 1, { keyword: "offer_approval_updated", components: {} });
        } catch (err) {
            console.error("Error updating offer approval:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_offer_approval", components: {} });
        }
    },

    delete_offer: async (req, res) => {
        const { offerId } = req.body;
        try {
            const existingOffer = await Offers.findOne({
                _id: offerId,
                isDeleted: false
            });

            if (!existingOffer) {
                return sendResponse(req, res, 200, 0, { keyword: "offer_not_found", components: {} });
            }

            await Offers.findByIdAndUpdate(offerId, {
                isDeleted: true,
                isActive: false,
                status: 'cancelled'
            });

            return sendResponse(req, res, 200, 1, { keyword: "offer_deleted", components: {} });
        } catch (err) {
            console.error("Error deleting offer:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_delete_offer", components: {} });
        }
    },

    get_offer_analytics: async (req, res) => {
        try {
            const totalOffers = await Offers.countDocuments({ isDeleted: false });
            const activeOffers = await Offers.countDocuments({ isDeleted: false, isActive: true });
            const pendingApproval = await Offers.countDocuments({ isDeleted: false, approvalStatus: 'pending' });
            const featuredOffers = await Offers.countDocuments({ isDeleted: false, isFeatured: true });
            const expiredOffers = await Offers.countDocuments({ isDeleted: false, status: 'expired' });

            const offersByType = await Offers.aggregate([
                { $match: { isDeleted: false } },
                { $group: { _id: '$offerType', count: { $sum: 1 } } }
            ]);

            const offersByStatus = await Offers.aggregate([
                { $match: { isDeleted: false } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]);

            const topBrands = await Offers.aggregate([
                { $match: { isDeleted: false } },
                { $group: { _id: '$brandName', count: { $sum: 1 }, totalUsage: { $sum: '$currentUsageCount' } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);

            const response = {
                summary: {
                    totalOffers,
                    activeOffers,
                    pendingApproval,
                    featuredOffers,
                    expiredOffers
                },
                offersByType,
                offersByStatus,
                topBrands
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching offer analytics:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_offer_analytics", components: {} });
        }
    },

    get_offer_usage_history: async (req, res) => {
        const { offerId, page = 1, limit = 10 } = req.body;
        try {
            const skip = (page - 1) * limit;

            const offer = await Offers.findOne({
                _id: offerId,
                isDeleted: false
            });

            if (!offer) {
                return sendResponse(req, res, 200, 0, { keyword: "offer_not_found", components: {} });
            }

            const totalUsage = offer.usageHistory.length;
            const totalPages = Math.ceil(totalUsage / limit);

            const usageHistory = offer.usageHistory
                .sort((a, b) => new Date(b.usedAt) - new Date(a.usedAt))
                .slice(skip, skip + parseInt(limit));

            const response = {
                totalUsage,
                totalPages,
                currentPage: page,
                usageHistory
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching offer usage history:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_offer_usage_history", components: {} });
        }
    },

    bulk_update_offers: async (req, res) => {
        const { offerIds, updateData } = req.body;
        try {
            const result = await Offers.updateMany(
                { _id: { $in: offerIds }, isDeleted: false },
                updateData
            );

            return sendResponse(req, res, 200, 1, { keyword: "offers_bulk_updated", components: { updatedCount: result.modifiedCount } });
        } catch (err) {
            console.error("Error bulk updating offers:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_bulk_update_offers", components: {} });
        }
    },

    create_offer_for_brand: async (req, res) => {
        try {
            const {
                title,
                description,
                shortDescription,
                brandId, // Admin selects which brand this offer is for
                brandName,
                offerType,
                discountValue,
                maxDiscountAmount,
                minimumPurchaseAmount,
                offerCode,
                startDate,
                endDate,
                totalUsageLimit,
                perCustomerLimit,
                targetAudience,
                verifiedCustomersOnly,
                specificCustomers,
                minFollowersRequired,
                maxFollowersAllowed,
                targetCategories,
                targetLocations,
                offerImages,
                bannerImage,
                termsAndConditions,
                requirements,
                redemptionProcess,
                redemptionLocation,
                applicableItems,
                priority,
                isFeatured,
                isFlashSale,
                socialMediaRequirements,
                status,
                isActive,
                notificationSettings,
                approvalStatus,
                adminId, // The admin creating the offer
                approvalNotes,
                autoExpire
            } = req.body;

            // Validation
            if (!title || !description || !brandId || !offerType || !startDate || !endDate) {
                return sendResponse(req, res, 400, 0, {
                    keyword: "missing_required_fields",
                    components: {}
                });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);
            if (start >= end) {
                return sendResponse(req, res, 400, 0, {
                    keyword: "invalid_date_range",
                    components: {}
                });
            }

            if (offerCode) {
                const existingOffer = await Offers.findOne({
                    offerCode: offerCode.toUpperCase(),
                    isDeleted: false
                });

                if (existingOffer) {
                    return sendResponse(req, res, 400, 0, {
                        keyword: "offer_code_already_exists",
                        components: {}
                    });
                }
            }

            if (['percentage', 'fixed_amount', 'cashback'].includes(offerType) && !discountValue) {
                return sendResponse(req, res, 400, 0, {
                    keyword: "discount_value_required",
                    components: {}
                });
            }

            if (targetAudience === 'followers_range') {
                if (!minFollowersRequired && !maxFollowersAllowed) {
                    return sendResponse(req, res, 400, 0, {
                        keyword: "followers_range_required",
                        components: {}
                    });
                }

                if (minFollowersRequired && maxFollowersAllowed && minFollowersRequired >= maxFollowersAllowed) {
                    return sendResponse(req, res, 400, 0, {
                        keyword: "invalid_followers_range",
                        components: {}
                    });
                }
            }

            const offerData = {
                title: title.trim(),
                description: description.trim(),
                shortDescription: shortDescription?.trim(),
                createdBy: brandId,
                brandName: brandName.trim(),
                offerType,
                discountValue: discountValue || 0,
                maxDiscountAmount: maxDiscountAmount || null,
                minimumPurchaseAmount: minimumPurchaseAmount || 0,
                offerCode: offerCode ? offerCode.toUpperCase() : null,
                startDate: start,
                endDate: end,
                totalUsageLimit: totalUsageLimit || null,
                perCustomerLimit: perCustomerLimit || 1,
                currentUsageCount: 0,
                targetAudience: targetAudience || 'all',
                verifiedCustomersOnly: verifiedCustomersOnly || false,
                specificCustomers: specificCustomers || [],
                minFollowersRequired: minFollowersRequired || 0,
                maxFollowersAllowed: maxFollowersAllowed || null,
                targetCategories: targetCategories || [],
                targetLocations: targetLocations || [],
                offerImages: offerImages || [],
                bannerImage: bannerImage || null,
                termsAndConditions: termsAndConditions || [],
                requirements: requirements || [],
                redemptionProcess: redemptionProcess?.trim(),
                redemptionLocation: redemptionLocation || 'both',
                applicableItems: applicableItems || [],
                priority: priority || 5,
                isFeatured: isFeatured || false,
                isFlashSale: isFlashSale || false,
                socialMediaRequirements: socialMediaRequirements || {
                    requireInstagramPost: false,
                    requireStoryMention: false,
                    requireBrandTag: false,
                    requiredHashtags: [],
                    minimumViews: 0,
                    minimumLikes: 0
                },
                status: status || 'draft',
                isActive: isActive !== undefined ? isActive : true,
                notificationSettings: notificationSettings || {
                    notifyOnUsage: true,
                    notifyOnExpiry: true,
                    reminderDays: 1
                },
                approvalStatus: approvalStatus || 'approved',
                approvedBy: adminId,
                approvalNotes: approvalNotes?.trim() || 'Created by admin',
                autoExpire: autoExpire !== undefined ? autoExpire : true
            };
            const newOffer = new Offers(offerData);
            const savedOffer = await newOffer.save();
            const populatedOffer = await Offers.findById(savedOffer._id)
                .populate('createdBy', 'name email')
                .populate('approvedBy', 'name email')
                .populate('specificCustomers', 'name email');

            return sendResponse(req, res, 201, 1, {
                keyword: "offer_created_successfully",
                components: {}
            }, { offer: populatedOffer });

        } catch (err) {
            console.error("Error creating offer:", err);
            if (err.name === 'ValidationError') {
                const validationErrors = Object.values(err.errors).map(error => error.message);
                return sendResponse(req, res, 400, 0, {
                    keyword: "validation_error",
                    components: { errors: validationErrors }
                });
            }
            if (err.code === 11000) {
                return sendResponse(req, res, 400, 0, {
                    keyword: "offer_code_already_exists",
                    components: {}
                });
            }

            return sendResponse(req, res, 500, 0, {
                keyword: "failed_to_create_offer",
                components: {}
            });
        }
    }
};

module.exports = admin_offers_controller;