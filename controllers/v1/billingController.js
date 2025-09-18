const Bill = require('../../models/v1/Bill');
const Customer = require('../../models/v1/Customer');
const { sendResponse } = require('../../middleware');
const common = require('../../utils/common');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const RateClassification = require('../../models/v1/RateClassification');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

let billing_controller = {
    list_billing: async (req, res) => {
        const { page = 1, limit = 10, search, brandId, brandStatus, brandRefundStatus, customerRefundStatus, claimStatus, startDate, endDate, status } = req.body;
        const skip = (page - 1) * limit;

        try {
            let query = { isDeleted: false };
            if (brandStatus) query.status = brandStatus;
            if (brandRefundStatus) query.brandRefundStatus = brandRefundStatus;
            if (customerRefundStatus) query.refundStatus = customerRefundStatus;
            if (claimStatus) query.refundClaimDate = { $ne: null };
            if (brandId) query.brandId = brandId;
            if (status) query.status = status;
            if (startDate || endDate) query.brandId = brandId;
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            const bills = await Bill.find(query)
                .populate('customerId', 'name instaDetails profileImage email instaId')
                .populate('brandId', 'brandname brandlogo')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            console.log(bills);
            let filteredBills = bills;


            if (search) {
                filteredBills = bills.filter(bill => {
                    const customerName = bill.customerId ? bill.customerId.name : '';
                    return customerName.toLowerCase().includes(search.toLowerCase()) ||
                        (bill.instaId && bill.instaId.toLowerCase().includes(search.toLowerCase())) ||
                        (bill._id && bill._id.toString().includes(search.toLowerCase()));
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
                    billUrl: bill.billUrl,
                    contentUrl: bill.contentUrl,
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
                    instaDetails: bill.customerId ? bill.customerId.instaDetails : null,
                    upiId: bill.customerId ? bill.customerId.upiId : null,
                    profileImage: bill.customerId ? bill.customerId.profileImage : null,
                    email: bill.customerId ? bill.customerId.email : null,
                    instaId: bill.customerId ? bill.customerId.instaId : null,
                    brandId: bill.brandId ? bill.brandId._id : null,
                    brandName: bill.brandId ? bill.brandId.brandname : null,
                    brandLogo: bill.brandId ? bill.brandId.brandlogo : null,
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
                billUrl: bill.billUrl,
                contentUrl: bill.contentUrl,
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
        const { page = 1, limit = 10, search, brandStatus, brandRefundStatus, customerRefundStatus, claimStatus, startDate, endDate, status } = req.body;
        const skip = (page - 1) * limit;
        const { admin_id: brandId } = req.loginUser;
        try {
            let query = { isDeleted: false };
            if (brandStatus) query.status = brandStatus;
            if (brandRefundStatus) query.brandRefundStatus = brandRefundStatus;
            if (customerRefundStatus) query.refundStatus = customerRefundStatus;
            if (claimStatus) query.refundClaimDate = { $ne: null };
            if (brandId) query.brandId = brandId;
            if (status) query.status = status;

            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            const bills = await Bill.find(query)
                .populate('customerId', 'instaId name profileImage email, instaDetails')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            let filteredBills = bills;

            if (search) {
                filteredBills = bills.filter(bill => {
                    const customerName = bill.customerId ? bill.customerId.name : '';
                    const customerId = bill.customerId ? bill.customerId._id.toString() : '';
                    return customerName.toLowerCase().includes(search.toLowerCase()) ||
                        (bill.instaId && bill.instaId.toLowerCase().includes(search.toLowerCase())) ||
                        (bill.billNo && bill.billNo.toLowerCase().includes(search.toLowerCase())) ||
                        customerId.toLowerCase().includes(search.toLowerCase());
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
                    instaId: bill.customerId ? bill.customerId.instaId : '',
                    followersCount: bill.customerId && bill.customerId.instaDetails ? bill.customerId.instaDetails.followersCount : 0,
                    memberType: bill.customerId && bill.customerId.instaDetails ? bill.customerId.instaDetails.memberType : '',
                    billNo: bill.billNo,
                    status: bill.status,
                    billAmount: bill.billAmount,
                    billUrl: bill.billUrl,
                    contentUrl: bill.contentUrl,
                    contentType: bill.contentType,
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
            }).populate('customerId', 'name instaDetails profileImage email instaId brandVerified');

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
                billUrl: bill.billUrl,
                contentUrl: bill.contentUrl,
                contentType: bill.contentType,
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
                conversation: bill.conversation || [],
                paymentType: bill.paymentType,
                customerDetails: bill.customerId,
                likes: bill.likes,
                comments: bill.comments,
                views: bill.views,
                metaFetch: bill.metaFetch,
                brandVerified: bill.brandVerified,

            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching bill by ID:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_billing", components: {} });
        }
    },

    update_insta_content_url: async (req, res) => {
        const { billingId, instaUrl } = req.body;
        const { id } = req.loginUser;
        try {

            const existingBill = await Bill.findOne({
                _id: billingId,
                customerId: id,
                isDeleted: false
            });

            if (!existingBill) {
                return sendResponse(req, res, 200, 0, { keyword: "bill_not_found", components: {} });
            }
            await Bill.findByIdAndUpdate(billingId, { instaContentUrl: instaUrl, refundStatus: "processing" });
            return sendResponse(req, res, 200, 1, { keyword: "billing_updated", components: {} });
        } catch (err) {
            console.error("Error updating billing:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_billing", components: {} });
        }
    },

    update_content_status: async (req, res) => {
        const { billingId, status, conversation } = req.body;

        try {
            const existingBill = await Bill.findOne({
                _id: billingId,
                isDeleted: false
            });

            if (!existingBill) {
                return sendResponse(req, res, 200, 0, { keyword: "bill_not_found", components: {} });
            }

            if (!status) {
                return sendResponse(req, res, 200, 0, { keyword: "status_required", components: {} });
            };

            await Bill.findByIdAndUpdate(billingId, { status: status, conversation });
            return sendResponse(req, res, 200, 1, { keyword: "billing_updated", components: {} });
        } catch (err) {
            console.error("Error updating billing:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_billing", components: {} });
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
    },

    upload_bill: async (req, res) => {
        const { brandId, billNo, billAmount, uploadedBill } = req.body;
        const { id } = req.loginUser;

        try {
            const newBill = new Bill({
                customerId: id,
                brandId,
                billNo,
                billAmount,
                billUrl: uploadedBill,
                paymentType: 'upload bill',
                status: 'upload content'
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

    pay_bill: async (req, res) => {
        const { brandId, billAmount } = req.body;
        const { id } = req.loginUser;

        try {
            const options = {
                amount: billAmount * 100,
                currency: 'INR',
                receipt: `bill_${Date.now()}`,
                payment_capture: 1
            };

            const order = await razorpay.orders.create(options);

            const newBill = new Bill({
                customerId: id,
                brandId,
                billAmount,
                paymentType: 'pay now',
                status: 'pending for approval',
                razorpayOrderId: order.id
            });

            const result = await newBill.save();

            if (!result) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_create_order", components: {} });
            }


            return sendResponse(req, res, 200, 1, { keyword: "success", }, {
                RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
                orderId: order.id,
                amount: order.amount,
                billId: result._id
            }
            );
        } catch (err) {
            console.error("Error creating order:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_create_order", components: {} });
        }
    },

    verify_payment: async (req, res) => {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, billId } = req.body;

        try {
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest("hex");

            const isAuthentic = expectedSignature === razorpay_signature;

            if (isAuthentic) {
                await Bill.findByIdAndUpdate(billId, {
                    razorpayPaymentId: razorpay_payment_id,
                    razorpaySignature: razorpay_signature,
                    status: 'upload content',
                    paymentStatus: "verified"
                });

                return sendResponse(req, res, 200, 1, { keyword: "payment_verified", components: {} });
            } else {
                await Bill.findByIdAndUpdate(billId, {
                    status: 'rejected'
                });

                return sendResponse(req, res, 200, 0, { keyword: "payment_verification_failed", components: {} });
            }
        } catch (err) {
            console.error("Error verifying payment:", err);
            return sendResponse(req, res, 500, 0, { keyword: "payment_verification_error", components: {} });
        }
    },
    get_bills: async (req, res) => {
        const { id } = req.loginUser;
        const { page = 1, limit = 10, status, paymentType } = req.query;

        try {
            const pageNumber = parseInt(page);
            const limitNumber = parseInt(limit);
            const skip = (pageNumber - 1) * limitNumber;

            let query = {
                customerId: id,
                isDeleted: false
            };

            if (status) {
                query.status = status;
            }

            if (paymentType) {
                query.paymentType = paymentType;
            }

            const [bills, totalCount] = await Promise.all([
                Bill.find(query)
                    .populate('brandId', 'brandname brandlogo')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNumber)
                    .lean(),
                Bill.countDocuments(query)
            ]);

            const totalPages = Math.ceil(totalCount / limitNumber);
            const hasNextPage = pageNumber < totalPages;
            const hasPrevPage = pageNumber > 1;

            const pagination = {
                currentPage: pageNumber,
                totalPages,
                totalCount,
                hasNextPage,
                hasPrevPage,
                limit: limitNumber
            };

            if (!bills || bills.length === 0) {
                return sendResponse(req, res, 200, 1, {
                    keyword: "no_bills_found",
                    components: {
                        bills: [],
                        pagination
                    }
                });
            }

            return sendResponse(req, res, 200, 1, {
                keyword: "bills_retrieved",
            }, {
                bills,
                pagination
            });
        } catch (err) {
            console.error("Error retrieving bills:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_retrieve_bills", components: {} });
        }
    },

    get_bill_by_id: async (req, res) => {
        const { id } = req.loginUser;
        const { billingId } = req.params;

        try {
            const bill = await Bill.findOne({
                _id: billingId,
                customerId: id,
                isDeleted: false
            }).populate('brandId', 'name logo description').lean();

            if (!bill) {
                return sendResponse(req, res, 200, 0, { keyword: "bill_not_found", components: {} });
            }

            return sendResponse(req, res, 200, 1, {
                keyword: "bill_retrieved",
                components: { bill }
            });
        } catch (err) {
            console.error("Error retrieving bill:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_retrieve_bill", components: {} });
        }
    },

    get_bills_stats: async (req, res) => {
        const { id } = req.loginUser;
        try {
            const stats = await Bill.aggregate([
                {
                    $match: {
                        customerId: id,
                        isDeleted: false
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalBills: { $sum: 1 },
                        totalAmount: { $sum: "$billAmount" },
                        pendingBills: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "pending for approval"] }, 1, 0]
                            }
                        },
                        approvedBills: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "approved"] }, 1, 0]
                            }
                        },
                        rejectedBills: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "rejected"] }, 1, 0]
                            }
                        },
                        uploadContentBills: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "upload content"] }, 1, 0]
                            }
                        },
                        uploadBillType: {
                            $sum: {
                                $cond: [{ $eq: ["$paymentType", "upload bill"] }, 1, 0]
                            }
                        },
                        payNowType: {
                            $sum: {
                                $cond: [{ $eq: ["$paymentType", "pay now"] }, 1, 0]
                            }
                        }
                    }
                }
            ]);

            const billStats = stats.length > 0 ? stats[0] : {
                totalBills: 0,
                totalAmount: 0,
                pendingBills: 0,
                approvedBills: 0,
                rejectedBills: 0,
                uploadContentBills: 0,
                uploadBillType: 0,
                payNowType: 0
            };

            return sendResponse(req, res, 200, 1, {
                keyword: "bills_stats_retrieved",
            }, { stats: billStats });
        } catch (err) {
            console.error("Error retrieving bills stats:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_retrieve_bills_stats", components: {} });
        }
    },




    upload_content: async (req, res) => {
        const { billingId, uploadContent, contentType } = req.body;
        const { id } = req.loginUser;

        try {
            const existingBill = await Bill.findOne({
                _id: billingId,
                customerId: id,
                isDeleted: false
            });

            if (!existingBill) {
                return sendResponse(req, res, 200, 0, { keyword: "bill_not_found", components: {} });
            }

            if (existingBill.status !== 'upload content') {
                return sendResponse(req, res, 200, 0, { keyword: "invalid_bill_status", components: {} });
            }

            const updateFields = {
                status: 'pending for approval',
                brandStatusDate: new Date()
            };

            if (uploadContent) {
                updateFields.contentUrl = uploadContent;
            }

            if (contentType) {
                updateFields.contentType = contentType;
            }

            if (contentType === "story") {

                const refundRate = await RateClassification.find({})


                const refundAmount = refundRate[0];
                updateFields.refundAmount = refundAmount.range[0].amount;

            }

            const updatedBill = await Bill.findByIdAndUpdate(
                billingId,
                updateFields,
                { new: true }
            ).populate('brandId', 'name logo');

            if (!updatedBill) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_update_bill", components: {} });
            }

            return sendResponse(req, res, 200, 1, {
                keyword: "content_uploaded",
                components: {
                    bill: updatedBill,
                    message: "Content uploaded successfully. Bill is now pending for approval."
                }
            });
        } catch (err) {
            console.error("Error uploading content:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_upload_content", components: {} });
        }
    }
};

module.exports = billing_controller;