const Challenge = require('../../models/v1/Challenge');
const { sendResponse } = require('../../middleware');

let challenge_controller = {
    add_challenges: async (req, res) => {
        const {
            title,
            description,
            shortDescription,
            brandName,
            images,
            link,
            startDate,
            endDate,
            targetAudience,
            verifiedCustomersOnly,
            specificCustomers,
            minFollowersRequired,
            maxFollowersAllowed,
            targetCategories,
            targetLocations,
            reward,
            rewardType,
            totalParticipationLimit,
            perCustomerLimit,
            requirements,
            submissionGuidelines,
            socialMediaRequirements,
            status,
            isActive,
            priority,
            isFeatured,
            autoExpire
        } = req.body;

        try {
            const createdBy = req.user?.brandId || req.body.createdBy;
            if (!createdBy) {
                return sendResponse(req, res, 400, 0, { keyword: "brand_required", components: {} });
            }
            const newChallenge = new Challenge({
                title,
                description,
                shortDescription,
                createdBy,
                brandName,
                images,
                link,
                startDate,
                endDate,
                targetAudience,
                verifiedCustomersOnly,
                specificCustomers,
                minFollowersRequired,
                maxFollowersAllowed,
                targetCategories,
                targetLocations,
                reward,
                rewardType,
                totalParticipationLimit,
                perCustomerLimit,
                requirements,
                submissionGuidelines,
                socialMediaRequirements,
                status,
                isActive: isActive !== undefined ? isActive : true,
                priority,
                isFeatured,
                autoExpire
            });
            const result = await newChallenge.save();
            if (!result) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_add_challenge", components: {} });
            }
            return sendResponse(req, res, 200, 1, { keyword: "challenge_added", components: { id: result._id } });
        } catch (err) {
            console.error("Error inserting challenge:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_add_challenge", components: {} });
        }
    },

    list_challenges: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                isActive,
                status,
                targetAudience,
                brandName,
                startDateFrom,
                startDateTo,
                endDateFrom,
                endDateTo
            } = req.body;

            const skip = (page - 1) * limit;

            let query = { isDeleted: false };
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { shortDescription: { $regex: search, $options: 'i' } }
                ];
            }
            if (isActive !== null && typeof isActive !== 'undefined') {
                query.isActive = isActive;
            }
            if (status) {
                query.status = status;
            }
            if (targetAudience) {
                query.targetAudience = targetAudience;
            }
            if (brandName) {
                query.brandName = { $regex: brandName, $options: 'i' };
            }
            if (startDateFrom || startDateTo) {
                query.startDate = {};
                if (startDateFrom) query.startDate.$gte = new Date(startDateFrom);
                if (startDateTo) query.startDate.$lte = new Date(startDateTo);
            }

            if (endDateFrom || endDateTo) {
                query.endDate = {};
                if (endDateFrom) query.endDate.$gte = new Date(endDateFrom);
                if (endDateTo) query.endDate.$lte = new Date(endDateTo);
            }

            const challenges = await Challenge.find(query)
                .populate('createdBy', 'brandName')
                .populate('specificCustomers', 'name instagramId')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            const totalCount = await Challenge.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            const response = {
                totalCount,
                totalPages,
                currentPage: parseInt(page),
                challenges
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching challenges:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_challenges", components: {} });
        }
    },

    get_challenge: async (req, res) => {
        try {
            const { challengeId } = req.params;

            const challenge = await Challenge.findOne({
                _id: challengeId,
                isDeleted: false
            })
                .populate('createdBy', 'brandName logo')
                .populate('specificCustomers', 'name email instagramId profilePicture')
                .populate('participationHistory.customer', 'name instagramId profilePicture');

            if (!challenge) {
                return sendResponse(req, res, 404, 0, { keyword: "challenge_not_found", components: {} });
            }

            return sendResponse(req, res, 200, 1, { keyword: "success" }, { challenge });
        } catch (err) {
            console.error("Error fetching challenge:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_challenge", components: {} });
        }
    },

    update_challenge: async (req, res) => {
        try {
            const { challengeId } = req.params;
            const updateData = req.body;

            const existingChallenge = await Challenge.findOne({
                _id: challengeId,
                isDeleted: false
            });

            if (!existingChallenge) {
                return sendResponse(req, res, 404, 0, { keyword: "challenge_not_found", components: {} });
            }

            delete updateData._id;
            delete updateData.createdBy;
            delete updateData.createdAt;
            delete updateData.currentParticipationCount;
            delete updateData.participationHistory;
            delete updateData.viewCount;
            delete updateData.participationCount;
            delete updateData.shareCount;

            const updatedChallenge = await Challenge.findByIdAndUpdate(
                challengeId,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            return sendResponse(req, res, 200, 1, { keyword: "challenge_updated", components: {} });
        } catch (err) {
            console.error("Error updating challenge:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_challenge", components: {} });
        }
    },

    delete_challenges: async (req, res) => {
        const { challengeId } = req.body;
        try {
            const existingChallenge = await Challenge.findOne({
                _id: challengeId,
                isDeleted: false
            });

            if (!existingChallenge) {
                return sendResponse(req, res, 200, 0, { keyword: "challenge_not_found", components: {} });
            }

            await Challenge.findByIdAndUpdate(challengeId, {
                isDeleted: true,
                isActive: false,
                status: 'cancelled'
            });

            return sendResponse(req, res, 200, 1, { keyword: "challenge_deleted", components: {} });
        } catch (err) {
            console.error("Error deleting challenge:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_delete_challenge", components: {} });
        }
    },

    update_challenges_status: async (req, res) => {
        const { challengeId, isActive } = req.body;
        try {
            const existingChallenge = await Challenge.findOne({
                _id: challengeId,
                isDeleted: false
            });

            if (!existingChallenge) {
                return sendResponse(req, res, 200, 0, { keyword: "challenge_not_found", components: {} });
            }

            await Challenge.findByIdAndUpdate(
                challengeId,
                {
                    isActive: isActive,
                    status: isActive ? 'active' : 'paused'
                }
            );

            return sendResponse(req, res, 200, 1, { keyword: "challenge_status_updated", components: {} });
        } catch (err) {
            console.error("Error updating challenge status:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_challenge_status", components: {} });
        }
    },

    participate_in_challenge: async (req, res) => {
        try {
            const { challengeId } = req.params;
            const { customerId, submission, customerName, customerInstaId } = req.body;

            const challenge = await Challenge.findOne({
                _id: challengeId,
                isDeleted: false,
                isActive: true,
                status: 'active'
            });

            if (!challenge) {
                return sendResponse(req, res, 404, 0, { keyword: "challenge_not_found_or_inactive", components: {} });
            }

            if (challenge.endDate && new Date() > challenge.endDate) {
                return sendResponse(req, res, 400, 0, { keyword: "challenge_has_ended", components: {} });
            }

            if (challenge.startDate && new Date() < challenge.startDate) {
                return sendResponse(req, res, 400, 0, { keyword: "challenge_not_started", components: {} });
            }

            if (challenge.totalParticipationLimit &&
                challenge.currentParticipationCount >= challenge.totalParticipationLimit) {
                return sendResponse(req, res, 400, 0, { keyword: "challenge_participation_limit_reached", components: {} });
            }

            const alreadyParticipated = challenge.participationHistory.some(
                participation => participation.customer.toString() === customerId
            );

            if (alreadyParticipated && challenge.perCustomerLimit <= 1) {
                return sendResponse(req, res, 400, 0, { keyword: "already_participated", components: {} });
            }

            // Check per customer limit
            const customerParticipations = challenge.participationHistory.filter(
                participation => participation.customer.toString() === customerId
            ).length;

            if (customerParticipations >= challenge.perCustomerLimit) {
                return sendResponse(req, res, 400, 0, { keyword: "participation_limit_reached", components: {} });
            }

            // Add participation to history
            challenge.participationHistory.push({
                customer: customerId,
                customerName,
                customerInstaId,
                submission,
                status: 'submitted'
            });

            // Update participation count
            challenge.currentParticipationCount += 1;
            challenge.participationCount += 1;

            await challenge.save();

            return sendResponse(req, res, 200, 1, { keyword: "participation_recorded", components: {} });
        } catch (err) {
            console.error("Error recording participation:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_record_participation", components: {} });
        }
    },

    update_participation_status: async (req, res) => {
        try {
            const { challengeId, participationId } = req.params;
            const { status, notes } = req.body;

            const challenge = await Challenge.findOne({
                _id: challengeId,
                isDeleted: false
            });

            if (!challenge) {
                return sendResponse(req, res, 404, 0, { keyword: "challenge_not_found", components: {} });
            }

            const participation = challenge.participationHistory.id(participationId);
            if (!participation) {
                return sendResponse(req, res, 404, 0, { keyword: "participation_not_found", components: {} });
            }

            participation.status = status;
            if (notes) participation.notes = notes;

            await challenge.save();

            return sendResponse(req, res, 200, 1, { keyword: "participation_status_updated", components: {} });
        } catch (err) {
            console.error("Error updating participation status:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_participation_status", components: {} });
        }
    },


    // admin //



    admin_create_challenge: async (req, res) => {
        const {
            title,
            description,
            shortDescription,
            brandId,
            brandName,
            images,
            link,
            startDate,
            endDate,
            targetAudience,
            verifiedCustomersOnly,
            specificCustomers,
            minFollowersRequired,
            maxFollowersAllowed,
            targetCategories,
            targetLocations,
            reward,
            rewardType,
            totalParticipationLimit,
            perCustomerLimit,
            requirements,
            submissionGuidelines,
            socialMediaRequirements,
            status,
            isActive,
            priority,
            isFeatured,
            autoExpire,
            approvalStatus
        } = req.body;

        try {
            const adminId = req.user?.adminId || req.user?._id;

            if (!brandId) {
                return sendResponse(req, res, 400, 0, { keyword: "brand_required", components: {} });
            }

            const newChallenge = new Challenge({
                title,
                description,
                shortDescription,
                brandId,
                brandName,
                images,
                link,
                startDate,
                endDate,
                targetAudience,
                verifiedCustomersOnly,
                specificCustomers,
                minFollowersRequired,
                maxFollowersAllowed,
                targetCategories,
                targetLocations,
                reward,
                rewardType,
                totalParticipationLimit,
                perCustomerLimit,
                requirements,
                submissionGuidelines,
                socialMediaRequirements,
                status: status || 'active',
                isActive: isActive !== undefined ? isActive : true,
                priority: priority || 5,
                isFeatured: isFeatured || false,
                autoExpire,
                approvalStatus: approvalStatus || 'approved',
                approvedBy: adminId
            });

            const result = await newChallenge.save();

            if (!result) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_add_challenge", components: {} });
            }

            return sendResponse(req, res, 200, 1, { keyword: "challenge_created", components: { id: result._id } });
        } catch (err) {
            console.error("Error creating challenge:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_add_challenge", components: {} });
        }
    },

    admin_update_challenge: async (req, res) => {
        try {
            const { challengeId } = req.params;
            const updateData = req.body;
            const adminId = req.user?.adminId || req.user?._id;

            const existingChallenge = await Challenge.findOne({
                _id: challengeId,
                isDeleted: false
            });

            if (!existingChallenge) {
                return sendResponse(req, res, 404, 0, { keyword: "challenge_not_found", components: {} });
            }

            delete updateData._id;
            delete updateData.createdAt;
            delete updateData.currentParticipationCount;
            delete updateData.participationHistory;
            delete updateData.viewCount;
            delete updateData.participationCount;
            delete updateData.shareCount;

            if (updateData.approvalStatus && updateData.approvalStatus !== existingChallenge.approvalStatus) {
                updateData.approvedBy = adminId;
            }

            const updatedChallenge = await Challenge.findByIdAndUpdate(
                challengeId,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            return sendResponse(req, res, 200, 1, { keyword: "challenge_updated", components: {} });
        } catch (err) {
            console.error("Error updating challenge:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_challenge", components: {} });
        }
    },

    admin_list_all_challenges: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                isActive,
                status,
                targetAudience,
                brandName,
                startDateFrom,
                startDateTo,
                endDateFrom,
                endDateTo,
                approvalStatus,
                priority,
                isFeatured
            } = req.body;

            const skip = (page - 1) * limit;

            let query = { isDeleted: false };

            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { shortDescription: { $regex: search, $options: 'i' } },
                    { brandName: { $regex: search, $options: 'i' } }
                ];
            }

            if (isActive !== null && typeof isActive !== 'undefined') {
                query.isActive = isActive;
            }

            if (status) {
                query.status = status;
            }

            if (targetAudience) {
                query.targetAudience = targetAudience;
            }

            if (brandName) {
                query.brandName = { $regex: brandName, $options: 'i' };
            }

            if (approvalStatus) {
                query.approvalStatus = approvalStatus;
            }

            if (priority !== null && typeof priority !== 'undefined') {
                query.priority = priority;
            }

            if (isFeatured !== null && typeof isFeatured !== 'undefined') {
                query.isFeatured = isFeatured;
            }

            if (startDateFrom || startDateTo) {
                query.startDate = {};
                if (startDateFrom) query.startDate.$gte = new Date(startDateFrom);
                if (startDateTo) query.startDate.$lte = new Date(startDateTo);
            }

            if (endDateFrom || endDateTo) {
                query.endDate = {};
                if (endDateFrom) query.endDate.$gte = new Date(endDateFrom);
                if (endDateTo) query.endDate.$lte = new Date(endDateTo);
            }

            const challenges = await Challenge.find(query)
                .populate('brandId', 'brandName logo email')
                .populate('approvedBy', 'name email')
                .populate('specificCustomers', 'name instagramId')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            const totalCount = await Challenge.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            const response = {
                totalCount,
                totalPages,
                currentPage: parseInt(page),
                challenges
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching challenges:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_challenges", components: {} });
        }
    },

    admin_get_challenge_details: async (req, res) => {
        try {
            const { challengeId } = req.params;

            const challenge = await Challenge.findOne({
                _id: challengeId,
                isDeleted: false
            })
                .populate('brandId', 'brandName logo email phone')
                .populate('approvedBy', 'name email')
                .populate('specificCustomers', 'name email instagramId profilePicture')
                .populate('participationHistory.customer', 'name instagramId profilePicture email');

            if (!challenge) {
                return sendResponse(req, res, 404, 0, { keyword: "challenge_not_found", components: {} });
            }

            return sendResponse(req, res, 200, 1, { keyword: "success" }, { challenge });
        } catch (err) {
            console.error("Error fetching challenge:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_challenge", components: {} });
        }
    },

    admin_approve_challenge: async (req, res) => {
        try {
            const { challengeId } = req.params;
            const { approvalStatus, approvalNotes } = req.body;
            const adminId = req.user?.adminId || req.user?._id;

            const challenge = await Challenge.findOne({
                _id: challengeId,
                isDeleted: false
            });

            if (!challenge) {
                return sendResponse(req, res, 404, 0, { keyword: "challenge_not_found", components: {} });
            }

            const updateData = {
                approvalStatus,
                approvedBy: adminId,
                approvalNotes
            };

            if (approvalStatus === 'approved') {
                updateData.isActive = true;
                updateData.status = 'active';
            } else if (approvalStatus === 'rejected') {
                updateData.isActive = false;
                updateData.status = 'cancelled';
            }

            await Challenge.findByIdAndUpdate(challengeId, updateData);

            return sendResponse(req, res, 200, 1, { keyword: "challenge_approval_updated", components: {} });
        } catch (err) {
            console.error("Error updating challenge approval:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_approval", components: {} });
        }
    },

    admin_update_challenge_priority: async (req, res) => {
        try {
            const { challengeId } = req.params;
            const { priority } = req.body;

            const challenge = await Challenge.findOne({
                _id: challengeId,
                isDeleted: false
            });

            if (!challenge) {
                return sendResponse(req, res, 404, 0, { keyword: "challenge_not_found", components: {} });
            }

            await Challenge.findByIdAndUpdate(challengeId, { priority });

            return sendResponse(req, res, 200, 1, { keyword: "challenge_priority_updated", components: {} });
        } catch (err) {
            console.error("Error updating challenge priority:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_priority", components: {} });
        }
    },

    admin_toggle_featured: async (req, res) => {
        try {
            const { challengeId } = req.params;
            const { isFeatured } = req.body;

            const challenge = await Challenge.findOne({
                _id: challengeId,
                isDeleted: false
            });

            if (!challenge) {
                return sendResponse(req, res, 404, 0, { keyword: "challenge_not_found", components: {} });
            }

            await Challenge.findByIdAndUpdate(challengeId, { isFeatured });

            return sendResponse(req, res, 200, 1, { keyword: "challenge_featured_updated", components: {} });
        } catch (err) {
            console.error("Error updating featured status:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_featured", components: {} });
        }
    },

    admin_deactivate_challenge: async (req, res) => {
        try {
            const { challengeId } = req.params;
            const { reason } = req.body;

            const challenge = await Challenge.findOne({
                _id: challengeId,
                isDeleted: false
            });

            if (!challenge) {
                return sendResponse(req, res, 404, 0, { keyword: "challenge_not_found", components: {} });
            }

            await Challenge.findByIdAndUpdate(challengeId, {
                isActive: false,
                status: 'cancelled',
                approvalNotes: reason
            });

            return sendResponse(req, res, 200, 1, { keyword: "challenge_deactivated", components: {} });
        } catch (err) {
            console.error("Error deactivating challenge:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_deactivate_challenge", components: {} });
        }
    },

    admin_force_delete_challenge: async (req, res) => {
        try {
            const { challengeId } = req.params;

            const challenge = await Challenge.findOne({
                _id: challengeId,
                isDeleted: false
            });

            if (!challenge) {
                return sendResponse(req, res, 404, 0, { keyword: "challenge_not_found", components: {} });
            }

            await Challenge.findByIdAndUpdate(challengeId, {
                isDeleted: true,
                isActive: false,
                status: 'cancelled'
            });

            return sendResponse(req, res, 200, 1, { keyword: "challenge_deleted", components: {} });
        } catch (err) {
            console.error("Error deleting challenge:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_delete_challenge", components: {} });
        }
    },

    admin_get_challenge_analytics: async (req, res) => {
        try {
            const { challengeId } = req.params;

            const challenge = await Challenge.findOne({
                _id: challengeId,
                isDeleted: false
            }).populate('participationHistory.customer', 'name instagramId profilePicture');

            if (!challenge) {
                return sendResponse(req, res, 404, 0, { keyword: "challenge_not_found", components: {} });
            }

            const analytics = {
                totalViews: challenge.viewCount || 0,
                totalParticipations: challenge.participationCount || 0,
                totalShares: challenge.shareCount || 0,
                conversionRate: challenge.conversionRate || 0,
                participationByStatus: {
                    submitted: challenge.participationHistory.filter(p => p.status === 'submitted').length,
                    under_review: challenge.participationHistory.filter(p => p.status === 'under_review').length,
                    approved: challenge.participationHistory.filter(p => p.status === 'approved').length,
                    rejected: challenge.participationHistory.filter(p => p.status === 'rejected').length,
                    winner: challenge.participationHistory.filter(p => p.status === 'winner').length,
                    rewarded: challenge.participationHistory.filter(p => p.status === 'rewarded').length
                },
                recentParticipations: challenge.participationHistory
                    .sort((a, b) => new Date(b.participatedAt) - new Date(a.participatedAt))
                    .slice(0, 10)
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, { analytics });
        } catch (err) {
            console.error("Error fetching challenge analytics:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_analytics", components: {} });
        }
    },

    admin_get_dashboard_stats: async (req, res) => {
        try {
            const totalChallenges = await Challenge.countDocuments({ isDeleted: false });
            const activeChallenges = await Challenge.countDocuments({
                isDeleted: false,
                isActive: true,
                status: 'active'
            });
            const pendingApproval = await Challenge.countDocuments({
                isDeleted: false,
                approvalStatus: 'pending'
            });
            const featuredChallenges = await Challenge.countDocuments({
                isDeleted: false,
                isFeatured: true
            });

            const totalParticipations = await Challenge.aggregate([
                { $match: { isDeleted: false } },
                { $group: { _id: null, total: { $sum: "$participationCount" } } }
            ]);

            const recentChallenges = await Challenge.find({ isDeleted: false })
                .populate('brandId', 'brandName')
                .sort({ createdAt: -1 })
                .limit(5)
                .select('title brandName status createdAt participationCount');

            const stats = {
                totalChallenges,
                activeChallenges,
                pendingApproval,
                featuredChallenges,
                totalParticipations: totalParticipations[0]?.total || 0,
                recentChallenges
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, { stats });
        } catch (err) {
            console.error("Error fetching dashboard stats:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_stats", components: {} });
        }
    },

    admin_bulk_update_challenges: async (req, res) => {
        try {
            const { challengeIds, updateData } = req.body;

            if (!Array.isArray(challengeIds) || challengeIds.length === 0) {
                return sendResponse(req, res, 400, 0, { keyword: "invalid_challenge_ids", components: {} });
            }

            const allowedFields = ['status', 'isActive', 'priority', 'isFeatured', 'approvalStatus'];
            const filteredUpdateData = {};

            Object.keys(updateData).forEach(key => {
                if (allowedFields.includes(key)) {
                    filteredUpdateData[key] = updateData[key];
                }
            });

            if (Object.keys(filteredUpdateData).length === 0) {
                return sendResponse(req, res, 400, 0, { keyword: "no_valid_update_fields", components: {} });
            }

            await Challenge.updateMany(
                { _id: { $in: challengeIds }, isDeleted: false },
                { $set: filteredUpdateData }
            );

            return sendResponse(req, res, 200, 1, { keyword: "challenges_updated", components: {} });
        } catch (err) {
            console.error("Error bulk updating challenges:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_challenges", components: {} });
        }
    }

};

module.exports = challenge_controller;