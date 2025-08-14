const Admin = require('../../models/v1/Admin');
const Customer = require('../../models/v1/Customer');
const { sendResponse } = require('../../middleware');
const common = require('../../utils/common');
const moment = require('moment');
const cryptoLib = require('cryptlib');
const shaKey = cryptoLib.getHashSha256(process.env.PASSWORD_ENC_KEY, 32);
const { USER_IMAGE_PATH, APP_NAME } = require('../../config/constants');
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

            profileImage = (profileImage && profileImage != '') ? USER_IMAGE_PATH + profileImage : USER_IMAGE_PATH + 'default.png';

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

                console.log({adminDetails})

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

            user.profileImage = (user.profileImage && user.profileImage != '') ? USER_IMAGE_PATH + user.profileImage : USER_IMAGE_PATH + 'default.png';

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
                    profileImage: customer.profileImage ? USER_IMAGE_PATH + customer.profileImage : USER_IMAGE_PATH + 'default.png',
                    instaId: customer.instaId,
                    instaDetails : customer.instaDetails,
                    upiId: customer.upiId,
                    category: customer.category,
                    isVerified: customer.isVerified,
                    isActive: customer.isActive,
                    isLocked: customer.isLocked,
                    lastActive: customer.lastActive,
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

    get_customer_by_id: async (req, res) => {
        const { userId } = req.body;

        try {
            const customer = await Customer.findOne({
                _id: userId,
                isDeleted: false
            });

            if (!customer) {
                return sendResponse(req, res, 200, 0, { keyword: "user_not_found", components: {} });
            }

            const response = {
                id: customer._id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                profileImage: customer.profileImage,
                instaId: customer.instaId,
                instaDetails : customer.instaDetails,
                upiId: customer.upiId,
                category: customer.category,
                isVerified: customer.isVerified,
                isActive: customer.isActive,
                isLocked: customer.isLocked,
                lastActive: customer.lastActive,
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

            const Brand = require('../../models/v1/Brand');
            const totalBrands = await Brand.countDocuments({
                isDeleted: false,
                isActive: true,
                isLocked: false,
                ...dateQuery
            });

            const Bill = require('../../models/v1/Bill');
            const totalBills = await Bill.countDocuments({
                isDeleted: false,
                ...dateQuery
            });

            const response = {
                totalCustomers,
                totalBrands,
                totalBills,
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_dashboard", components: {} });
        }
    }
};

module.exports = auth_controller;