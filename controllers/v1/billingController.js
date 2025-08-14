const Bill = require('../../models/v1/Bill');
const Customer = require('../../models/v1/Customer');
const { sendResponse } = require('../../middleware');
const { USER_IMAGE_PATH } = require('../../config/constants');
const common = require('../../utils/common');

let billing_controller = {
    list_billing: async (req, res) => {
        const { page = 1, limit = 10, search, brandId, brandStatus, brandRefundStatus, customerRefundStatus, claimStatus, startDate, endDate } = req.body;
        const skip = (page - 1) * limit;

        try {
            let query = { isDeleted: false };

            if (brandStatus) query.status = brandStatus;
            if (brandRefundStatus) query.brandRefundStatus = brandRefundStatus;
            if (customerRefundStatus) query.refundStatus = customerRefundStatus;
            if (claimStatus) query.refundClaimDate = { $ne: null };
            if (brandId) query.brandId = brandId;

            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            const bills = await Bill.find(query)
                .populate('customerId', 'name')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            let filteredBills = bills;

            if (search) {
                filteredBills = bills.filter(bill => {
                    const customerName = bill.customerId ? bill.customerId.name : '';
                    return customerName.toLowerCase().includes(search.toLowerCase()) ||
                           (bill.instaId && bill.instaId.toLowerCase().includes(search.toLowerCase())) ||
                           (bill.billNo && bill.billNo.toLowerCase().includes(search.toLowerCase()));
                });
            }

            const totalCount = await Bill.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            const response = {
                totalCount,
                totalPages,
                currentPage: page,
                bills: filteredBills.map(bill => ({
                    id: bill._id,
                    customerName: bill.customerId ? bill.customerId.name : '',
                    instaId: bill.instaId,
                    billNo: bill.billNo,
                    status: bill.status,
                    billAmount: bill.billAmount,
                    billUrl: bill.billUrl ? USER_IMAGE_PATH + bill.billUrl : USER_IMAGE_PATH + '',
                    contentUrl: bill.contentUrl ? USER_IMAGE_PATH + bill.contentUrl : USER_IMAGE_PATH + '',
                    instaContentUrl: bill.instaContentUrl,
                    refundClaimDate: bill.refundClaimDate,
                    refundAmount: bill.refundAmount,
                    refundStatus: bill.refundStatus,
                    brandRefundStatus: bill.brandRefundStatus,
                    brandRefundDate: bill.brandRefundDate,
                    refundDate: bill.refundDate,
                    likes: bill.likes,
                    comments: bill.comments,
                    views: bill.views,
                    metaFetch: bill.metaFetch,
                    createdAt: bill.createdAt,
                    updatedAt: bill.updatedAt,
                }))
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching bill records:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_billing", components: {} });
        }
    },

    get_billing_by_id: async (req, res) => {
        const { billingId } = req.body;
        try {
            const bill = await Bill.findOne({
                _id: billingId,
                isDeleted: false
            }).populate('customerId', 'name');

            if (!bill) {
                return sendResponse(req, res, 200, 0, { keyword: "bill_not_found", components: {} });
            }

            const response = {
                id: bill._id,
                customerId: bill.customerId._id,
                customerName: bill.customerId ? bill.customerId.name : '',
                instaId: bill.instaId,
                billNo: bill.billNo,
                billAmount: bill.billAmount,
                billUrl: bill.billUrl ? USER_IMAGE_PATH + bill.billUrl : USER_IMAGE_PATH + '',
                contentUrl: bill.contentUrl ? USER_IMAGE_PATH + bill.contentUrl : USER_IMAGE_PATH + '',
                status: bill.status,
                brandId: bill.brandId,
                createdAt: bill.createdAt,
                updatedAt: bill.updatedAt,
                lastActive: bill.lastActive,
                instaContentUrl: bill.instaContentUrl,
                refundClaimDate: bill.refundClaimDate,
                refundAmount: bill.refundAmount,
                refundStatus: bill.refundStatus,
                brandRefundStatus: bill.brandRefundStatus,
                brandRefundDate: bill.brandRefundDate,
                refundDate: bill.refundDate,
                likes: bill.likes,
                comments: bill.comments,
                views: bill.views,
                metaFetch: bill.metaFetch,
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching bill by ID:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_billing", components: {} });
        }
    },

    add_billing: async (req, res) => {
        const { customerId, instaId, billNo, billUrl, contentUrl, status, billAmount, brandId } = req.body;
        let { admin_id } = req.loginUser;

        try {
            const newBill = new Bill({
                customerId,
                instaId,
                billNo,
                billUrl,
                contentUrl,
                status,
                billAmount,
                brandId
            });

            const result = await newBill.save();

            if (!result) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_add_billing", components: {} });
            }

            return sendResponse(req, res, 200, 1, { keyword: "billing_added", components: { id: result._id } });
        } catch (err) {
            console.error("Error inserting billing:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_add_billing", components: {} });
        }
    },

    update_billing: async (req, res) => {
        const { billId, customerId, instaId, billNo, billUrl, contentUrl, status, billAmount, brandId, instaContentUrl, refundClaimDate, refundAmount, refundStatus, brandRefundStatus, brandRefundDate, refundDate, likes, comments, views, metaFetch } = req.body;

        try {
            const existingBill = await Bill.findOne({
                _id: billId,
                isDeleted: false
            });

            if (!existingBill) {
                return sendResponse(req, res, 200, 0, { keyword: "bill_not_found", components: {} });
            }

            let updateFields = {};

            if (customerId) updateFields.customerId = customerId;
            if (instaId) updateFields.instaId = instaId;
            if (billNo) updateFields.billNo = billNo;
            if (billUrl) updateFields.billUrl = billUrl;
            if (contentUrl) updateFields.contentUrl = contentUrl;
            if (status) updateFields.status = status;
            if (billAmount) updateFields.billAmount = billAmount;
            if (brandId) updateFields.brandId = brandId;
            if (instaContentUrl) updateFields.instaContentUrl = instaContentUrl;
            if (refundClaimDate) updateFields.refundClaimDate = refundClaimDate;
            if (refundAmount) updateFields.refundAmount = refundAmount;
            if (refundStatus) updateFields.refundStatus = refundStatus;
            if (brandRefundStatus) updateFields.brandRefundStatus = brandRefundStatus;
            if (brandRefundDate) updateFields.brandRefundDate = brandRefundDate;
            if (refundDate) updateFields.refundDate = refundDate;
            if (likes) updateFields.likes = likes;
            if (comments) updateFields.comments = comments;
            if (views) updateFields.views = views;
            if (metaFetch) updateFields.metaFetch = metaFetch;

            if (Object.keys(updateFields).length > 0) {
                await Bill.findByIdAndUpdate(billId, updateFields);
            }

            return sendResponse(req, res, 200, 1, { keyword: "billing_updated", components: {} });
        } catch (err) {
            console.error("Error updating billing:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_billing", components: {} });
        }
    },

    delete_billing: async (req, res) => {
        const { billingId } = req.body;
        try {
            const existingBill = await Bill.findOne({
                _id: billingId,
                isDeleted: false
            });

            if (!existingBill) {
                return sendResponse(req, res, 200, 0, { keyword: "bill_not_found", components: {} });
            }

            await Bill.findByIdAndUpdate(billingId, { isDeleted: true });

            return sendResponse(req, res, 200, 1, { keyword: "billing_deleted", components: {} });
        } catch (err) {
            console.error("Error deleting billing:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_delete_billing", components: {} });
        }
    },

    fetch_meta_data: async (req, res) => {
        const { billId, fetchDate } = req.body;
        try {
            const bill = await Bill.findOne({
                _id: billId,
                isDeleted: false
            }).populate('customerId', 'name');

            if (!bill || !bill.instaContentUrl) {
                return sendResponse(req, res, 200, 0, { keyword: "bill_not_found", components: {} });
            }

            let fetchData = await common.fetchMetaData(bill.instaContentUrl, billId, fetchDate);

            if (fetchData.meta.code == 200) {
                return sendResponse(req, res, 200, 1, { keyword: "success" }, fetchData);
            } else {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_fetch_metadata", components: {} });
            }

        } catch (err) {
            console.error("Error fetching billing with customer:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_billing", components: {} });
        }
    },

    list_content: async (req, res) => {
        const { page = 1, limit = 10, search, brandId, brandStatus, brandRefundStatus, customerRefundStatus, claimStatus, startDate, endDate } = req.body;
        const skip = (page - 1) * limit;

        try {
            let query = { isDeleted: false };

            if (brandStatus) query.status = brandStatus;
            if (brandRefundStatus) query.brandRefundStatus = brandRefundStatus;
            if (customerRefundStatus) query.refundStatus = customerRefundStatus;
            if (claimStatus) query.refundClaimDate = { $ne: null };
            if (brandId) query.brandId = brandId;

            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            const bills = await Bill.find(query)
                .populate('customerId', 'name')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            let filteredBills = bills;

            if (search) {
                filteredBills = bills.filter(bill => {
                    const customerName = bill.customerId ? bill.customerId.name : '';
                    return customerName.toLowerCase().includes(search.toLowerCase()) ||
                           (bill.instaId && bill.instaId.toLowerCase().includes(search.toLowerCase())) ||
                           (bill.billNo && bill.billNo.toLowerCase().includes(search.toLowerCase()));
                });
            }

            const totalCount = await Bill.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            const response = {
                totalCount,
                totalPages,
                currentPage: page,
                bills: filteredBills.map(bill => ({
                    id: bill._id,
                    customerName: bill.customerId ? bill.customerId.name : '',
                    instaId: bill.instaId,
                    billNo: bill.billNo,
                    status: bill.status,
                    billAmount: bill.billAmount,
                    billUrl: bill.billUrl ? USER_IMAGE_PATH + bill.billUrl : USER_IMAGE_PATH + '',
                    contentUrl: bill.contentUrl ? USER_IMAGE_PATH + bill.contentUrl : USER_IMAGE_PATH + '',
                    createdAt: bill.createdAt,
                    updatedAt: bill.updatedAt,
                    instaContentUrl: bill.instaContentUrl,
                    refundClaimDate: bill.refundClaimDate,
                    refundAmount: bill.refundAmount,
                    refundStatus: bill.refundStatus,
                    brandRefundStatus: bill.brandRefundStatus,
                    brandRefundDate: bill.brandRefundDate,
                    refundDate: bill.refundDate,
                    likes: bill.likes,
                    comments: bill.comments,
                    views: bill.views,
                    metaFetch: bill.metaFetch,
                }))
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching bill records:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_billing", components: {} });
        }
    },

    get_content_by_id: async (req, res) => {
        const { billingId } = req.body;
        try {
            const bill = await Bill.findOne({
                _id: billingId,
                isDeleted: false
            }).populate('customerId', 'name');

            if (!bill) {
                return sendResponse(req, res, 200, 0, { keyword: "bill_not_found", components: {} });
            }

            const response = {
                id: bill._id,
                customerId: bill.customerId._id,
                customerName: bill.customerId ? bill.customerId.name : '',
                instaId: bill.instaId,
                billNo: bill.billNo,
                billAmount: bill.billAmount,
                billUrl: bill.billUrl ? USER_IMAGE_PATH + bill.billUrl : USER_IMAGE_PATH + '',
                contentUrl: bill.contentUrl ? USER_IMAGE_PATH + bill.contentUrl : USER_IMAGE_PATH + '',
                status: bill.status,
                brandId: bill.brandId,
                createdAt: bill.createdAt,
                updatedAt: bill.updatedAt,
                lastActive: bill.lastActive,
                instaContentUrl: bill.instaContentUrl,
                refundClaimDate: bill.refundClaimDate,
                refundAmount: bill.refundAmount,
                refundStatus: bill.refundStatus,
                brandRefundStatus: bill.brandRefundStatus,
                brandRefundDate: bill.brandRefundDate,
                refundDate: bill.refundDate,
                likes: bill.likes,
                comments: bill.comments,
                views: bill.views,
                metaFetch: bill.metaFetch,
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching bill by ID:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_billing", components: {} });
        }
    },

    update_content: async (req, res) => {
        const { billId, status, instaContentUrl, refundClaimDate, refundAmount, refundStatus, brandRefundStatus, brandRefundDate, refundDate, likes, comments, views, metaFetch, brandStatusDate } = req.body;

        try {
            const existingBill = await Bill.findOne({
                _id: billId,
                isDeleted: false
            });

            if (!existingBill) {
                return sendResponse(req, res, 200, 0, { keyword: "bill_not_found", components: {} });
            }

            let updateFields = {};

            if (status) updateFields.status = status;
            if (instaContentUrl) updateFields.instaContentUrl = instaContentUrl;
            if (refundClaimDate) updateFields.refundClaimDate = refundClaimDate;
            if (refundAmount) updateFields.refundAmount = refundAmount;
            if (refundStatus) updateFields.refundStatus = refundStatus;
            if (brandRefundStatus) updateFields.brandRefundStatus = brandRefundStatus;
            if (brandRefundDate) updateFields.brandRefundDate = brandRefundDate;
            if (refundDate) updateFields.refundDate = refundDate;
            if (likes) updateFields.likes = likes;
            if (comments) updateFields.comments = comments;
            if (views) updateFields.views = views;
            if (metaFetch) updateFields.metaFetch = metaFetch;
            if (brandStatusDate) updateFields.brandStatusDate = brandStatusDate;

            if (Object.keys(updateFields).length > 0) {
                await Bill.findByIdAndUpdate(billId, updateFields);
            }

            return sendResponse(req, res, 200, 1, { keyword: "billing_updated", components: {} });
        } catch (err) {
            console.error("Error updating billing:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_billing", components: {} });
        }
    },

    fetch_meta_data_brand: async (req, res) => {
        const { billId, fetchDate } = req.body;
        try {
            const bill = await Bill.findOne({
                _id: billId,
                isDeleted: false
            }).populate('customerId', 'name');

            if (!bill || !bill.instaContentUrl) {
                return sendResponse(req, res, 200, 0, { keyword: "bill_not_found", components: {} });
            }

            let fetchData = await common.fetchMetaData(bill.instaContentUrl, billId, fetchDate);

            if (fetchData.meta.code == 200) {
                return sendResponse(req, res, 200, 1, { keyword: "success" }, fetchData);
            } else {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_fetch_metadata", components: {} });
            }

        } catch (err) {
            console.error("Error fetching billing with customer:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_billing", components: {} });
        }
    }
};

module.exports = billing_controller;