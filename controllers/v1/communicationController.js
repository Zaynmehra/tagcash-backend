const Communication = require('../../models/v1/Communication');
const { sendResponse } = require('../../middleware');

let communication_controller = {
    create_communication: async (req, res) => {
        const { brandId, adminId, subject, type, priority, message, senderType, senderName, messageType, attachments } = req.body;
        try {
            const ticketId = 'COMM_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

            const newCommunication = new Communication({
                brandId,
                adminId,
                subject,
                ticketId,
                type: type || 'general',
                priority: priority || 'medium',
                status: 'open',
                messages: [{
                    senderId: senderType === 'newBrand' ? brandId : adminId,
                    senderType,
                    senderName,
                    message,
                    messageType: messageType || 'text',
                    attachments: attachments || []
                }]
            });

            const result = await newCommunication.save();

            if (!result) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_create_communication", components: {} });
            }

            return sendResponse(req, res, 200, 1, { keyword: "communication_created", components: { ticketId: result.ticketId, id: result._id } });
        } catch (err) {
            console.error("Error creating communication:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_create_communication", components: {} });
        }
    },

    add_message: async (req, res) => {
        const { communicationId, senderId, senderType, senderName, message, messageType, attachments } = req.body;
        try {
            const existingCommunication = await Communication.findById(communicationId);

            if (!existingCommunication) {
                return sendResponse(req, res, 200, 0, { keyword: "communication_not_found", components: {} });
            }

            const newMessage = {
                senderId,
                senderType,
                senderName,
                message,
                messageType: messageType || 'text',
                attachments: attachments || []
            };

            await Communication.findByIdAndUpdate(communicationId, {
                $push: { messages: newMessage },
                status: senderType === 'newBrand' ? 'pending_admin' : 'pending_brand'
            });

            return sendResponse(req, res, 200, 1, { keyword: "message_added", components: {} });
        } catch (err) {
            console.error("Error adding message:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_add_message", components: {} });
        }
    },

    edit_message: async (req, res) => {
        const { communicationId, messageId, message } = req.body;
        try {
            const existingCommunication = await Communication.findById(communicationId);

            if (!existingCommunication) {
                return sendResponse(req, res, 200, 0, { keyword: "communication_not_found", components: {} });
            }

            const messageIndex = existingCommunication.messages.findIndex(msg => msg._id.toString() === messageId);

            if (messageIndex === -1) {
                return sendResponse(req, res, 200, 0, { keyword: "message_not_found", components: {} });
            }

            await Communication.updateOne(
                { _id: communicationId, 'messages._id': messageId },
                {
                    $set: {
                        'messages.$.message': message,
                        'messages.$.isEdited': true,
                        'messages.$.editedAt': new Date()
                    }
                }
            );

            return sendResponse(req, res, 200, 1, { keyword: "message_updated", components: {} });
        } catch (err) {
            console.error("Error updating message:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_message", components: {} });
        }
    },

    mark_message_read: async (req, res) => {
        const { communicationId, messageId } = req.body;
        try {
            const existingCommunication = await Communication.findById(communicationId);

            if (!existingCommunication) {
                return sendResponse(req, res, 200, 0, { keyword: "communication_not_found", components: {} });
            }

            const messageIndex = existingCommunication.messages.findIndex(msg => msg._id.toString() === messageId);

            if (messageIndex === -1) {
                return sendResponse(req, res, 200, 0, { keyword: "message_not_found", components: {} });
            }

            await Communication.updateOne(
                { _id: communicationId, 'messages._id': messageId },
                {
                    $set: {
                        'messages.$.isRead': true,
                        'messages.$.readAt': new Date()
                    }
                }
            );

            return sendResponse(req, res, 200, 1, { keyword: "message_marked_read", components: {} });
        } catch (err) {
            console.error("Error marking message as read:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_mark_read", components: {} });
        }
    },

    update_status: async (req, res) => {
        const { communicationId, status } = req.body;
        try {
            const existingCommunication = await Communication.findById(communicationId);

            if (!existingCommunication) {
                return sendResponse(req, res, 200, 0, { keyword: "communication_not_found", components: {} });
            }

            const validStatuses = ['open', 'in_progress', 'pending_brand', 'pending_admin', 'resolved', 'closed'];
            if (!validStatuses.includes(status)) {
                return sendResponse(req, res, 200, 0, { keyword: "invalid_status", components: {} });
            }

            await Communication.findByIdAndUpdate(communicationId, { status });

            return sendResponse(req, res, 200, 1, { keyword: "status_updated", components: {} });
        } catch (err) {
            console.error("Error updating status:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_status", components: {} });
        }
    },

    update_priority: async (req, res) => {
        const { communicationId, priority } = req.body;
        try {
            const existingCommunication = await Communication.findById(communicationId);

            if (!existingCommunication) {
                return sendResponse(req, res, 200, 0, { keyword: "communication_not_found", components: {} });
            }

            const validPriorities = ['low', 'medium', 'high', 'urgent'];
            if (!validPriorities.includes(priority)) {
                return sendResponse(req, res, 200, 0, { keyword: "invalid_priority", components: {} });
            }

            await Communication.findByIdAndUpdate(communicationId, { priority });

            return sendResponse(req, res, 200, 1, { keyword: "priority_updated", components: {} });
        } catch (err) {
            console.error("Error updating priority:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_priority", components: {} });
        }
    },

    get_communication: async (req, res) => {
        const { communicationId } = req.params;
        try {
            const communication = await Communication.findById(communicationId)
                .populate('brandId', 'name email')
                .populate('adminId', 'name email')
                .populate('messages.senderId');

            if (!communication) {
                return sendResponse(req, res, 200, 0, { keyword: "communication_not_found", components: {} });
            }

            return sendResponse(req, res, 200, 1, { keyword: "success" }, communication);
        } catch (err) {
            console.error("Error fetching communication:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_communication", components: {} });
        }
    },

    list_communications: async (req, res) => {
        const { page = 1, limit = 10, brandId, adminId, status, type, priority, search } = req.query;
        try {
            const skip = (page - 1) * limit;
            let query = {};

            if (brandId) query.brandId = brandId;
            if (adminId) query.adminId = adminId;
            if (status) query.status = status;
            if (type) query.type = type;
            if (priority) query.priority = priority;
            if (search) {
                query.$or = [
                    { subject: { $regex: search, $options: 'i' } },
                    { ticketId: { $regex: search, $options: 'i' } }
                ];
            }

            const communications = await Communication.find(query)
                .populate('brandId', 'name email')
                .populate('adminId', 'name email')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ updatedAt: -1 });

            const totalCount = await Communication.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            const response = {
                totalCount,
                totalPages,
                currentPage: parseInt(page),
                communications
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching communications:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_communications", components: {} });
        }
    },

    list_brand_communications: async (req, res) => {
        const { brandId } = req.params;
        const { page = 1, limit = 10, status, type, priority } = req.query;
        try {
            const skip = (page - 1) * limit;
            let query = { brandId };

            if (status) query.status = status;
            if (type) query.type = type;
            if (priority) query.priority = priority;

            const communications = await Communication.find(query)
                .populate('adminId', 'name email')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ updatedAt: -1 });

            const totalCount = await Communication.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            const response = {
                totalCount,
                totalPages,
                currentPage: parseInt(page),
                communications
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching brand communications:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_brand_communications", components: {} });
        }
    },

    list_admin_communications: async (req, res) => {
        const { adminId } = req.params;
        const { page = 1, limit = 10, status, type, priority } = req.query;
        try {
            const skip = (page - 1) * limit;
            let query = { adminId };

            if (status) query.status = status;
            if (type) query.type = type;
            if (priority) query.priority = priority;

            const communications = await Communication.find(query)
                .populate('brandId', 'name email')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ updatedAt: -1 });

            const totalCount = await Communication.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            const response = {
                totalCount,
                totalPages,
                currentPage: parseInt(page),
                communications
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching admin communications:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_admin_communications", components: {} });
        }
    },

    get_unread_count: async (req, res) => {
        const { userId, userType } = req.params;
        try {
            let query = {};
            let matchCondition = {};

            if (userType === 'brand') {
                query.brandId = userId;
                matchCondition = { 'messages.senderType': 'tagcashAdmins', 'messages.isRead': false };
            } else if (userType === 'admin') {
                query.adminId = userId;
                matchCondition = { 'messages.senderType': 'newBrand', 'messages.isRead': false };
            } else {
                return sendResponse(req, res, 200, 0, { keyword: "invalid_user_type", components: {} });
            }

            const unreadCount = await Communication.aggregate([
                { $match: query },
                { $unwind: '$messages' },
                { $match: matchCondition },
                { $count: 'unreadMessages' }
            ]);

            const count = unreadCount.length > 0 ? unreadCount[0].unreadMessages : 0;

            return sendResponse(req, res, 200, 1, { keyword: "success" }, { unreadCount: count });
        } catch (err) {
            console.error("Error fetching unread count:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_unread_count", components: {} });
        }
    },

    get_statistics: async (req, res) => {
        const { startDate, endDate } = req.query;
        try {
            let matchQuery = {};
            
            if (startDate && endDate) {
                matchQuery.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const statistics = await Communication.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalCommunications: { $sum: 1 },
                        openTickets: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
                        inProgressTickets: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                        resolvedTickets: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
                        closedTickets: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
                        urgentTickets: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
                        highTickets: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
                        mediumTickets: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
                        lowTickets: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } }
                    }
                }
            ]);

            const typeStats = await Communication.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const result = {
                summary: statistics[0] || {
                    totalCommunications: 0,
                    openTickets: 0,
                    inProgressTickets: 0,
                    resolvedTickets: 0,
                    closedTickets: 0,
                    urgentTickets: 0,
                    highTickets: 0,
                    mediumTickets: 0,
                    lowTickets: 0
                },
                typeBreakdown: typeStats
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, result);
        } catch (err) {
            console.error("Error fetching statistics:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_statistics", components: {} });
        }
    },

    search_communications: async (req, res) => {
        const { query: searchQuery, page = 1, limit = 10 } = req.query;
        try {
            if (!searchQuery) {
                return sendResponse(req, res, 200, 0, { keyword: "search_query_required", components: {} });
            }

            const skip = (page - 1) * limit;
            const searchRegex = { $regex: searchQuery, $options: 'i' };

            const communications = await Communication.find({
                $or: [
                    { subject: searchRegex },
                    { ticketId: searchRegex },
                    { 'messages.message': searchRegex }
                ]
            })
                .populate('brandId', 'name email')
                .populate('adminId', 'name email')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ updatedAt: -1 });

            const totalCount = await Communication.countDocuments({
                $or: [
                    { subject: searchRegex },
                    { ticketId: searchRegex },
                    { 'messages.message': searchRegex }
                ]
            });

            const totalPages = Math.ceil(totalCount / limit);

            const response = {
                totalCount,
                totalPages,
                currentPage: parseInt(page),
                communications
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error searching communications:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_search_communications", components: {} });
        }
    }
};

module.exports = communication_controller;