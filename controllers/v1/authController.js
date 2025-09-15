const Admin = require('../../models/v1/Admin');
const Customer = require('../../models/v1/Customer');
const Bill = require('../../models/v1/Bill');
const Brand = require('../../models/v1/Brand');
const Category = require('../../models/v1/Category');
const { sendResponse } = require('../../middleware');
const common = require('../../utils/common');
const moment = require('moment');
const cryptoLib = require('cryptlib');
const shaKey = cryptoLib.getHashSha256(process.env.PASSWORD_ENC_KEY, 32);
const { APP_NAME } = require('../../config/constants');
const { sendMail } = require('../../utils/configEmailSMTP');

let auth_controller = {
    access_account: async (req, res) => {
        try {
            let { email, password, device_name: deviceName, device_type: deviceType, device_token: deviceToken } = req.body;
            let user = await Admin.findOne({
                email: email,
                isDeleted: false
            }).select('+password');

            if (!user) {
                return sendResponse(req, res, 200, 0, { keyword: "invalid_credentials", components: {} });
            }

            let { _id, password: storedPassword, name, profileImage, isActive, isLocked } = user;

            if (!isActive) {
                return sendResponse(req, res, 200, 0, { keyword: "account_inactive", components: {} });
            }

            if (isLocked) {
                return sendResponse(req, res, 200, 0, { keyword: "account_locked", components: {} });
            }

            let enPassword = cryptoLib.encrypt(password, shaKey, process.env.PASSWORD_ENC_IV);

            if (storedPassword === enPassword) {
                let adminDetails = {};

                let token = common.jwt_sign({ admin_id: _id, name: name, email: email, profileImage: profileImage }, '12h');

                await Admin.findByIdAndUpdate(_id, {
                    deviceName: deviceName,
                    deviceType: deviceType,
                    deviceToken: deviceToken,
                    token: token,
                    lastActive: moment().utc().format('YYYY-MM-DD HH:mm:ss')
                });

                adminDetails = await common.admin_details(_id);

                console.log({ adminDetails })

                return sendResponse(req, res, 200, 1, { keyword: "login_success", components: {} }, adminDetails);
            } else {
                return sendResponse(req, res, 200, 0, { keyword: "invalid_password", components: {} });
            }
        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "invalid_credentials", components: {} });
        }
    },

    logout: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;

            await Admin.findByIdAndUpdate(admin_id, {
                $unset: { token: 1, deviceToken: 1 }
            });

            return sendResponse(req, res, 200, 1, { keyword: "logout_success", components: {} });
        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed", components: {} });
        }
    },

    change_password: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { oldPassword, newPassword } = req.body;

            let result = await Admin.findOne({
                _id: admin_id,
                isActive: true,
                isDeleted: false,
                isLocked: false
            }).select('+password');

            let enPassword = cryptoLib.encrypt(oldPassword, shaKey, process.env.PASSWORD_ENC_IV);

            if (result.password === enPassword) {
                let enNewPassword = cryptoLib.encrypt(newPassword, shaKey, process.env.PASSWORD_ENC_IV);

                await Admin.findByIdAndUpdate(admin_id, {
                    password: enNewPassword
                });

                return sendResponse(req, res, 200, 1, { keyword: "password_changed", components: {} });
            } else {
                return sendResponse(req, res, 200, 0, { keyword: "invalid_old_password", components: {} });
            }
        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed", components: {} });
        }
    },

    user_details: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let user = await Admin.findById(admin_id);
            return sendResponse(req, res, 200, 1, { keyword: "success" }, user);
        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || "failed_to_fetch" });
        }
    },

    edit_profile: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { name, profileImage, isActive, isLocked, isDeleted } = req.body;

            let updateFields = {};

            if (name) updateFields.name = name;
            if (profileImage) updateFields.profileImage = profileImage;
            if (typeof isActive !== 'undefined') updateFields.isActive = isActive;
            if (typeof isLocked !== 'undefined') updateFields.isLocked = isLocked;
            if (typeof isDeleted !== 'undefined') updateFields.isDeleted = isDeleted;

            if (Object.keys(updateFields).length > 0) {
                await Admin.findByIdAndUpdate(admin_id, updateFields);
            }

            return sendResponse(req, res, 200, 1, { keyword: "updated", components: {} });
        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_update", components: {} });
        }
    },

    send_otp: async (req, res) => {
        try {
            let { email } = req.body;

            let user = await Admin.findOne({
                email: email,
                isActive: true,
                isDeleted: false,
                isLocked: false
            });

            if (user) {
                let otp = await common.generateOtp();

                let response = await sendMail({
                    from: `"${APP_NAME}" <${process.env.EMAIL_SMTP_USERNAME}>`,
                    to: email,
                    subject: `OTP for ${APP_NAME}`,
                    html: `
                        <p>Dear ${user.name},</p>
                        <p>Your OTP for ${APP_NAME} is <strong>${otp}</strong>.</p>
                        <p>Please use this OTP to verify your account.</p>
                        <p>Thank you,</p>
                        <p>${APP_NAME} Team</p>
                    `
                });

                await Admin.findByIdAndUpdate(user._id, {
                    otp: otp,
                    otpExpires: new Date(Date.now() + 10 * 60 * 1000)
                });

                return sendResponse(req, res, 200, 1, { keyword: "otp_send", components: {} });
            } else {
                return sendResponse(req, res, 200, 0, { keyword: "email_not_exist", components: {} });
            }
        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_send_otp", components: {} });
        }
    },

    verify_otp: async (req, res) => {
        try {
            let { email, otp } = req.body;

            let user = await Admin.findOne({
                email: email,
                otp: otp,
                isActive: true,
                isDeleted: false,
                isLocked: false
            });

            if (user && user.otpExpires > new Date()) {
                await Admin.findByIdAndUpdate(user._id, {
                    $unset: { otp: 1, otpExpires: 1 },
                    isVerified: true
                });

                return sendResponse(req, res, 200, 1, { keyword: "otp_verified", components: {} });
            } else {
                return sendResponse(req, res, 200, 0, { keyword: "invalid_otp", components: {} });
            }
        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_verify_otp", components: {} });
        }
    },

    reset_password: async (req, res) => {
        try {
            let { email, newPassword } = req.body;

            let user = await Admin.findOne({
                email: email,
                isActive: true,
                isDeleted: false,
                isLocked: false
            });

            if (user) {
                let enNewPassword = cryptoLib.encrypt(newPassword, shaKey, process.env.PASSWORD_ENC_IV);

                await Admin.findByIdAndUpdate(user._id, {
                    password: enNewPassword
                });

                return sendResponse(req, res, 200, 1, { keyword: "password_changed", components: {} });
            } else {
                return sendResponse(req, res, 200, 0, { keyword: "email_not_exist", components: {} });
            }
        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_reset_password", components: {} });
        }
    },

    list_customer: async (req, res) => {
        const { page = 1, limit = 10, search, isActive, isLocked } = req.body;
        const skip = (page - 1) * limit;
        try {
            let query = { isDeleted: false };
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { instaId: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } }
                ];
            }

            if (typeof isActive !== 'undefined') query.isActive = isActive;
            if (typeof isLocked !== 'undefined') query.isLocked = isLocked;

            const customers = await Customer.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            const totalCount = await Customer.countDocuments(query);
            const customerIds = customers.map(customer => customer._id);
            const lastBills = await Bill.aggregate([
                { $match: { customerId: { $in: customerIds } } },
                { $sort: { customerId: 1, createdAt: -1 } },
                {
                    $group: {
                        _id: '$customerId',
                        lastBillId: { $first: '$_id' }
                    }
                }
            ]);
            const billMap = new Map();
            lastBills.forEach(bill => {
                billMap.set(bill._id.toString(), bill.lastBillId);
            });

            const totalPages = Math.ceil(totalCount / limit);
            const response = {
                totalCount,
                totalPages,
                currentPage: page,
                users: customers.map(customer => ({
                    id: customer._id,
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email,
                    profileImage: customer.profileImage,
                    instaId: customer.instaId,
                    instaDetails: customer.instaDetails,
                    upiId: customer.upiId,
                    category: customer.category,
                    isVerified: customer.isVerified,
                    isActive: customer.isActive,
                    isLocked: customer.isLocked,
                    lastActive: customer.lastActive,
                    lastBillId: billMap.get(customer._id.toString()) || null,
                    createdAt: customer.createdAt,
                    updatedAt: customer.updatedAt
                }))
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching customers:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch", components: {} });
        }
    },

    get_customer_bills: async (req, res) => {
        const { page = 1, limit = 10, startDate, endDate, status, customerId } = req.body;
        try {
            if (!customerId) {
                return sendResponse(req, res, 400, 0, { keyword: "customer_id_required" });
            }
            const customer = await Customer.findOne({ _id: customerId, isDeleted: false });
            if (!customer) {
                return sendResponse(req, res, 404, 0, { keyword: "customer_not_found" });
            }
            const skip = (page - 1) * limit;
            let query = { customerId: customerId };
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }
            if (status) {
                query.status = status;
            }

            const bills = await Bill.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 })

            const totalCount = await Bill.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            const response = {
                customer: {
                    id: customer._id,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone
                },
                bills: bills,
                pagination: {
                    totalCount,
                    totalPages,
                    currentPage: parseInt(page),
                    limit: parseInt(limit)
                }
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);

        } catch (err) {
            console.error("Error fetching customer bills:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_bills" });
        }
    },

    get_customer_by_id: async (req, res) => {
        const { userId } = req.body;

        try {
            const customer = await Customer.findOne({
                _id: userId,
                isDeleted: false
            }).populate({
                path: 'brandVerified',
                select: 'brandname brandlogo email phone category subcategory averageRating totalReviews isActive isVerified'
            });

            if (!customer) {
                return sendResponse(req, res, 200, 0, { keyword: "user_not_found", components: {} });
            }
            const bills = await Bill.find({
                customerId: userId,
                isDeleted: false
            }).populate({
                path: 'brandId',
                select: 'brandname brandlogo email phone category subcategory averageRating totalReviews rateOfTwo paymentType'
            }).sort({ createdAt: -1 });
            const billingStats = {
                totalBills: bills.length,
                totalAmount: bills.reduce((sum, bill) => sum + (bill.billAmount || 0), 0),
                pendingBills: bills.filter(bill => bill.status === 'pending for approval').length,
                approvedBills: bills.filter(bill => bill.status === 'approved').length,
                rejectedBills: bills.filter(bill => bill.status === 'rejected').length,
                totalRefunds: bills.reduce((sum, bill) => sum + (bill.refundAmount || 0), 0),
                successfulPayments: bills.filter(bill => bill.paymentStatus === 'verified').length
            };
            const engagementStats = {
                totalViews: bills.reduce((sum, bill) => sum + (bill.views || 0), 0),
                totalLikes: bills.reduce((sum, bill) => sum + (bill.likes || 0), 0),
                totalComments: bills.reduce((sum, bill) => sum + (bill.comments || 0), 0),
                avgViews: bills.length > 0 ? Math.round(bills.reduce((sum, bill) => sum + (bill.views || 0), 0) / bills.length) : 0,
                avgLikes: bills.length > 0 ? Math.round(bills.reduce((sum, bill) => sum + (bill.likes || 0), 0) / bills.length) : 0,
                avgComments: bills.length > 0 ? Math.round(bills.reduce((sum, bill) => sum + (bill.comments || 0), 0) / bills.length) : 0
            };
            const workedWithBrands = [...new Set(bills.map(bill => bill.brandId?._id?.toString()))].length;

            const response = {
                id: customer._id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                profileImage: customer.profileImage,
                instaId: customer.instaId,
                upiId: customer.upiId,
                category: customer.category,
                isVerified: customer.isVerified,
                isActive: customer.isActive,
                isLocked: customer.isLocked,
                isTagVerified: customer.isTagVerified,
                isEmailVerified: customer.isEmailVerified,
                isVerifiedPhoneNo: customer.isVerifiedPhoneNo,
                authProvider: customer.authProvider,
                accountStatus: customer.accountStatus,
                instaDetails: {
                    followersCount: customer.instaDetails?.followersCount || 0,
                    followingCount: customer.instaDetails?.followingCount || 0,
                    postsCount: customer.instaDetails?.postsCount || 0,
                    avgViews: customer.instaDetails?.avgViews || 0,
                    avgLikes: customer.instaDetails?.avgLikes || 0,
                    avgComments: customer.instaDetails?.avgComments || 0,
                    profile_pic_url: customer.instaDetails?.profile_pic_url || '',
                    full_name: customer.instaDetails?.full_name || '',
                    memberType: customer.instaDetails?.memberType || 'Starter Member'
                },
                brandVerified: customer.brandVerified || [],
                totalBrandsVerified: customer.brandVerified?.length || 0,
                preferences: {
                    language: customer.preferences?.language || 'en',
                    notifications: {
                        email: customer.preferences?.notifications?.email !== false,
                        push: customer.preferences?.notifications?.push !== false
                    },
                    theme: customer.preferences?.theme || 'light'
                },
                deviceName: customer.deviceName,
                deviceType: customer.deviceType,
                lastActive: customer.lastActive,
                billingStats,
                engagementStats,
                workedWithBrands,
                recentBills: bills.slice(0, 10).map(bill => ({
                    id: bill._id,
                    brandInfo: {
                        id: bill.brandId?._id,
                        name: bill.brandId?.brandname,
                        logo: bill.brandId?.brandlogo,
                        category: bill.brandId?.category,
                        subcategory: bill.brandId?.subcategory,
                        rating: bill.brandId?.averageRating,
                        paymentType: bill.brandId?.paymentType
                    },
                    billNo: bill.billNo,
                    billAmount: bill.billAmount,
                    paymentType: bill.paymentType,
                    contentType: bill.contentType,
                    contentUrl: bill.contentUrl,
                    instaContentUrl: bill.instaContentUrl,
                    paymentStatus: bill.paymentStatus,
                    status: bill.status,
                    refundAmount: bill.refundAmount,
                    refundStatus: bill.refundStatus,
                    likes: bill.likes,
                    comments: bill.comments,
                    views: bill.views,
                    createdAt: bill.createdAt,
                    updatedAt: bill.updatedAt,
                    brandStatusDate: bill.brandStatusDate,
                    refundDate: bill.refundDate
                })),
                createdAt: customer.createdAt,
                updatedAt: customer.updatedAt
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching customer by ID:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch", components: {} });
        }
    },

    update_customer: async (req, res) => {
        const { userId, isActive, isLocked, isDeleted } = req.body;

        try {
            let updateFields = {};

            if (typeof isActive !== 'undefined') updateFields.isActive = isActive;
            if (typeof isLocked !== 'undefined') updateFields.isLocked = isLocked;
            if (typeof isDeleted !== 'undefined') updateFields.isDeleted = isDeleted;

            if (Object.keys(updateFields).length > 0) {
                await Customer.findByIdAndUpdate(userId, updateFields);
            }

            if (isActive === false || isLocked === true || isDeleted === true) {
                await Customer.findByIdAndUpdate(userId, {
                    $unset: { token: 1, deviceToken: 1 }
                });
            }

            return sendResponse(req, res, 200, 1, { keyword: "user_updated", components: {} });
        } catch (err) {
            console.error("Error updating customer:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_user", components: {} });
        }
    },

    dashboard: async (req, res) => {
        try {
            const { startDate, endDate } = req.body;

            let dateQuery = {};
            if (startDate || endDate) {
                dateQuery.createdAt = {};
                if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
                if (endDate) dateQuery.createdAt.$lte = new Date(endDate);
            }

            const totalCustomers = await Customer.countDocuments({
                isDeleted: false,
                isActive: true,
                isLocked: false,
                ...dateQuery
            });

            const activeCustomers = await Customer.countDocuments({
                isDeleted: false,
                isActive: true,
                isLocked: false,
                ...dateQuery
            });

            const verifiedCustomers = await Customer.countDocuments({
                isDeleted: false,
                isVerified: true,
                ...dateQuery
            });

            const Brand = require('../../models/v1/Brand');
            const totalBrands = await Brand.countDocuments({
                isDeleted: false,
                isActive: true,
                isLocked: false,
                ...dateQuery
            });

            const activeBrands = await Brand.countDocuments({
                isDeleted: false,
                isActive: true,
                isLocked: false,
                ...dateQuery
            });

            const verifiedBrands = await Brand.countDocuments({
                isDeleted: false,
                isVerified: true,
                ...dateQuery
            });

            const totalBills = await Bill.countDocuments({
                isDeleted: false,
                ...dateQuery
            });

            const approvedBills = await Bill.countDocuments({
                isDeleted: false,
                status: 'approved',
                ...dateQuery
            });

            const pendingBills = await Bill.countDocuments({
                isDeleted: false,
                status: 'pending for approval',
                ...dateQuery
            });

            const uploadContentBills = await Bill.countDocuments({
                isDeleted: false,
                status: 'upload content',
                ...dateQuery
            });

            const rejectedBills = await Bill.countDocuments({
                isDeleted: false,
                status: 'rejected',
                ...dateQuery
            });

            const verifiedPayments = await Bill.countDocuments({
                isDeleted: false,
                paymentStatus: 'verified',
                ...dateQuery
            });

            const pendingPayments = await Bill.countDocuments({
                isDeleted: false,
                paymentStatus: 'pending',
                ...dateQuery
            });

            const failedPayments = await Bill.countDocuments({
                isDeleted: false,
                paymentStatus: 'failed',
                ...dateQuery
            });

            const totalRevenue = await Bill.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        paymentStatus: 'verified',
                        ...dateQuery
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$billAmount' }
                    }
                }
            ]);

            const totalRefunds = await Bill.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        refundStatus: 'success',
                        ...dateQuery
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRefundAmount: { $sum: '$refundAmount' }
                    }
                }
            ]);

            const pendingRefunds = await Bill.countDocuments({
                isDeleted: false,
                refundStatus: 'pending',
                ...dateQuery
            });

            const processingRefunds = await Bill.countDocuments({
                isDeleted: false,
                refundStatus: 'processing',
                ...dateQuery
            });

            const successRefunds = await Bill.countDocuments({
                isDeleted: false,
                refundStatus: 'success',
                ...dateQuery
            });

            const contentTypeStats = await Bill.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        ...dateQuery
                    }
                },
                {
                    $group: {
                        _id: '$contentType',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const paymentTypeStats = await Bill.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        ...dateQuery
                    }
                },
                {
                    $group: {
                        _id: '$paymentType',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const memberTypeStats = await Customer.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        ...dateQuery
                    }
                },
                {
                    $group: {
                        _id: '$instaDetails.memberType',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const topBrandsByBills = await Bill.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        ...dateQuery
                    }
                },
                {
                    $group: {
                        _id: '$brandId',
                        totalBills: { $sum: 1 },
                        totalAmount: { $sum: '$billAmount' }
                    }
                },
                {
                    $lookup: {
                        from: 'newbrands',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'brand'
                    }
                },
                {
                    $unwind: '$brand'
                },
                {
                    $sort: { totalBills: -1 }
                },
                {
                    $limit: 10
                },
                {
                    $project: {
                        brandName: '$brand.brandname',
                        totalBills: 1,
                        totalAmount: 1
                    }
                }
            ]);

            const topInfluencersByBills = await Bill.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        ...dateQuery
                    }
                },
                {
                    $group: {
                        _id: '$customerId',
                        totalBills: { $sum: 1 },
                        totalAmount: { $sum: '$billAmount' }
                    }
                },
                {
                    $lookup: {
                        from: 'customers',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'customer'
                    }
                },
                {
                    $unwind: '$customer'
                },
                {
                    $sort: { totalBills: -1 }
                },
                {
                    $limit: 10
                },
                {
                    $project: {
                        customerName: '$customer.name',
                        instaId: '$customer.instaId',
                        totalBills: 1,
                        totalAmount: 1
                    }
                }
            ]);

            const response = {
                overview: {
                    totalCustomers,
                    activeCustomers,
                    verifiedCustomers,
                    totalBrands,
                    activeBrands,
                    verifiedBrands,
                    totalBills
                },
                bills: {
                    total: totalBills,
                    approved: approvedBills,
                    pending: pendingBills,
                    uploadContent: uploadContentBills,
                    rejected: rejectedBills
                },
                payments: {
                    verified: verifiedPayments,
                    pending: pendingPayments,
                    failed: failedPayments,
                    totalRevenue: totalRevenue[0]?.totalAmount || 0
                },
                refunds: {
                    pending: pendingRefunds,
                    processing: processingRefunds,
                    success: successRefunds,
                    totalRefundAmount: totalRefunds[0]?.totalRefundAmount || 0
                },
                analytics: {
                    contentTypeStats,
                    paymentTypeStats,
                    memberTypeStats,
                    topBrandsByBills,
                    topInfluencersByBills
                }
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_dashboard", components: {} });
        }
    }
};

module.exports = auth_controller;