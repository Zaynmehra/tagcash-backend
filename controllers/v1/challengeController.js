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
    }
};

module.exports = challenge_controller;