const Challenge = require('../../models/v1/Challenge');
const { sendResponse } = require('../../middleware');

let challenge_controller = {
    add_challenges: async (req, res) => {
        const { challengesname, challengesimage, challengesurl, isActive } = req.body;
        
        try {
            const newChallenge = new Challenge({
                challengesname,
                challengesimage,
                challengesurl,
                isActive
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
            const { page = 1, limit = 10, search, isActive } = req.body;
            const skip = (page - 1) * limit;

            let query = { isDeleted: false };

            if (search) {
                query.challengesname = { $regex: search, $options: 'i' };
            }

            if (isActive !== null && typeof isActive !== 'undefined') {
                query.isActive = isActive;
            }

            const challenges = await Challenge.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            const totalCount = await Challenge.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            const challengesWithImages = challenges.map(challenge => ({
                ...challenge.toJSON(),
                challengesimage: challenge.challengesimage
            }));

            const response = {
                totalCount,
                totalPages,
                currentPage: page,
                challenges: challengesWithImages
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching challenges:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_challenges", components: {} });
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
                isActive: false 
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

            await Challenge.findByIdAndUpdate(challengeId, { isActive: isActive });

            return sendResponse(req, res, 200, 1, { keyword: "challenge_status_updated", components: {} });
        } catch (err) {
            console.error("Error updating challenge status:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_challenge_status", components: {} });
        }
    }
};

module.exports = challenge_controller;