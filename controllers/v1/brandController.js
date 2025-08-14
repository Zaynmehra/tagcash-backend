const Brand = require('../../models/v1/Brand');
const Bill = require('../../models/v1/Bill');
const { sendResponse } = require('../../middleware');
const common = require('../../utils/common');
const moment = require('moment');
const cryptoLib = require('cryptlib');
const shaKey = cryptoLib.getHashSha256(process.env.PASSWORD_ENC_KEY, 32);
const { USER_IMAGE_PATH, APP_NAME } = require('../../config/constants');
const { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetOTPEmail } = require('../../utils/sendOtp');

let brand_controller = {
    register_brand: async (req, res) => {
        try {
            const { brandname, email, password, phone, managername, brandurl, category, subcategory } = req.body;

            const existingBrand = await Brand.findOne({
                $or: [{ email: email }, { phone: phone }],
                isDeleted: false
            });

            if (existingBrand) {
                if (!existingBrand.isVerified && !existingBrand.isActive) {
                    const encryptedPassword = cryptoLib.encrypt(password, shaKey, process.env.PASSWORD_ENC_IV);
                    const response = await sendVerificationEmail(email);
                    existingBrand.brandname = brandname;
                    existingBrand.password = encryptedPassword;
                    existingBrand.phone = phone;
                    existingBrand.managername = managername;
                    existingBrand.brandurl = brandurl;
                    existingBrand.category = category;
                    existingBrand.subcategory = subcategory;
                    existingBrand.otp = response.otp;
                    existingBrand.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
                    existingBrand.isVerified = false;
                    existingBrand.isActive = false;

                    const result = await existingBrand.save();
                    if (!result) {
                        return sendResponse(req, res, 200, 0, { keyword: "failed_to_register", components: {} });
                    }
                    return sendResponse(req, res, 200, 1, { keyword: "registration_success_verify_email", components: {} });
                } else {
                    return sendResponse(req, res, 200, 0, { keyword: "email_or_phone_exists", components: {} });
                }
            }

            const encryptedPassword = cryptoLib.encrypt(password, shaKey, process.env.PASSWORD_ENC_IV);
            const response = await sendVerificationEmail(email);
            const newBrand = new Brand({
                brandname,
                email,
                password: encryptedPassword,
                phone,
                managername,
                brandurl,
                category,
                subcategory,
                otp: response.otp,
                otpExpires: new Date(Date.now() + 10 * 60 * 1000),
                isVerified: false,
                isActive: false
            });

            const result = await newBrand.save();
            if (!result) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_register", components: {} });
            }
            return sendResponse(req, res, 200, 1, { keyword: "registration_success_verify_email", components: {} });
        } catch (err) {
            console.error("Error registering brand:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_register", components: {} });
        }
    },

    verify_registration_otp: async (req, res) => {
        try {
            let { email, otp } = req.body;
            let user = await Brand.findOne({
                email: email,
                isDeleted: false
            }).select('+otp +otpExpires');
            if (user && user.otpExpires > new Date() && user.otp === otp) {
                await Brand.findByIdAndUpdate(user._id, {
                    $unset: { otp: 1, otpExpires: 1 },
                    isVerified: true,
                    isActive: true
                });
                return sendResponse(req, res, 200, 1, { keyword: "email_verified_successfully", components: {} });
            } else {
                return sendResponse(req, res, 200, 0, { keyword: "invalid_otp", components: {} });
            }
        } catch (e) {
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_verify_otp", components: {} });
        }
    },

    access_account_brand: async (req, res) => {
        try {
            let { email, password, deviceName, deviceType, deviceToken } = req.body;
            let user = await Brand.findOne({
                email: email,
                isDeleted: false
            }).select('+password');

            if (!user) {
                return sendResponse(req, res, 200, 0, { keyword: "invalid_credentials", components: {} });
            }

            let { _id, password: storedPassword, brandname, brandlogo, isActive, isLocked } = user;

            if (!isActive) {
                return sendResponse(req, res, 200, 0, { keyword: "account_inactive", components: {} });
            }

            if (isLocked) {
                return sendResponse(req, res, 200, 0, { keyword: "account_locked", components: {} });
            }

            brandlogo = (brandlogo && brandlogo != '') ? USER_IMAGE_PATH + brandlogo : USER_IMAGE_PATH + 'default.png';

            let enPassword = cryptoLib.encrypt(password, shaKey, process.env.PASSWORD_ENC_IV);

            if (storedPassword === enPassword) {
                let adminDetails = {};

                const token = common.jwt_sign({ admin_id: _id, brandname: brandname, email: email, brandlogo: brandlogo }, '12h');

                await Brand.findByIdAndUpdate(_id, {
                    deviceName: deviceName,
                    deviceType: deviceType,
                    deviceToken: deviceToken,
                    token: token,
                    lastActive: moment().utc().format('YYYY-MM-DD HH:mm:ss')
                });

                adminDetails = await common.brand_details(_id);

                console.log({ adminDetails })

                return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, adminDetails);
            } else {
                return sendResponse(req, res, 200, 0, { keyword: "invalid_password", components: {} });
            }
        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "invalid_credentials", components: {} });
        }
    },

    logout_brand: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;

            await Brand.findByIdAndUpdate(admin_id, {
                $unset: { token: 1, deviceToken: 1 }
            });

            return sendResponse(req, res, 200, 1, { keyword: "logout_success", components: {} });
        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed", components: {} });
        }
    },

    change_password_brand: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { oldPassword, newPassword } = req.body;

            let result = await Brand.findOne({
                _id: admin_id,
                isActive: true,
                isDeleted: false,
                isLocked: false
            }).select('+password');

            let enPassword = cryptoLib.encrypt(oldPassword, shaKey, process.env.PASSWORD_ENC_IV);

            if (result.password === enPassword) {
                let enNewPassword = cryptoLib.encrypt(newPassword, shaKey, process.env.PASSWORD_ENC_IV);

                await Brand.findByIdAndUpdate(admin_id, {
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

    brand_details: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;

            let user = await Brand.findById(admin_id);

            user.brandlogo = (user.brandlogo && user.brandlogo != '') ? USER_IMAGE_PATH + user.brandlogo : USER_IMAGE_PATH + 'default.png';

            return sendResponse(req, res, 200, 1, { keyword: "success" }, user);
        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || "failed_to_fetch" });
        }
    },

    send_otp_brand: async (req, res) => {
        try {
            let { email } = req.body;

            let user = await Brand.findOne({
                email: email,
                isActive: true,
                isDeleted: false,
                isLocked: false
            });

            if (user) {
                let otp = await common.generateOtp();

                let response = await sendVerificationEmail(email);

                await Brand.findByIdAndUpdate(user._id, {
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

    verify_otp_brand: async (req, res) => {
        try {
            let { email, otp } = req.body;

            let user = await Brand.findOne({
                email: email,
                otp: otp,
                isActive: true,
                isDeleted: false,
                isLocked: false
            });

            if (user && user.otpExpires > new Date()) {
                await Brand.findByIdAndUpdate(user._id, {
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

    reset_password_brand: async (req, res) => {
        try {
            let { email, newPassword } = req.body;

            let user = await Brand.findOne({
                email: email,
                isActive: true,
                isDeleted: false,
                isLocked: false
            });

            if (user) {
                let enNewPassword = cryptoLib.encrypt(newPassword, shaKey, process.env.PASSWORD_ENC_IV);

                await Brand.findByIdAndUpdate(user._id, {
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

    list_brand: async (req, res) => {
        const { page = 1, limit = 10, search, isActive = true } = req.body;
        const skip = (page - 1) * limit;

        try {
            let query = { isDeleted: false };

            if (search) {
                query.$or = [
                    { brandname: { $regex: search, $options: 'i' } },
                    { managername: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ];
            }

            if (typeof isActive !== 'undefined') query.isActive = isActive;

            const brands = await Brand.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            const totalCount = await Brand.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            const response = {
                totalCount,
                totalPages,
                currentPage: page,
                brands: brands.map(brand => ({
                    id: brand._id,
                    brandname: brand.brandname,
                    phone: brand.phone,
                    email: brand.email,
                    brandurl: brand.brandurl,
                    brandlogo: brand.brandlogo ? USER_IMAGE_PATH + brand.brandlogo : USER_IMAGE_PATH + 'brandlogo.jpeg',
                    managername: brand.managername,
                    category: brand.category,
                    subcategory: brand.subcategory,
                    isVerified: brand.isVerified,
                    isActive: brand.isActive,
                    isLocked: brand.isLocked,
                    lastActive: brand.lastActive,
                    createdAt: brand.createdAt,
                    updatedAt: brand.updatedAt,
                    brandArchive: brand.archive
                }))
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching brands:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch", components: {} });
        }
    },

    get_brand_by_id: async (req, res) => {
        const { brandId } = req.body;
        try {
            const brand = await Brand.findOne({
                _id: brandId,
                isDeleted: false
            }).populate('category subcategory');

            if (!brand) {
                return sendResponse(req, res, 200, 0, { keyword: "brand_not_found", components: {} });
            }

            const response = {
                id: brand._id,
                brandname: brand.brandname,
                phone: brand.phone,
                email: brand.email,
                brandurl: brand.brandurl,
                brandlogo: brand.brandlogo ? USER_IMAGE_PATH + brand.brandlogo : USER_IMAGE_PATH + 'brandlogo.jpeg',
                managername: brand.managername,
                category: brand.category,
                subcategory: brand.subcategory,
                isVerified: brand.isVerified,
                isActive: brand.isActive,
                isLocked: brand.isLocked,
                lastActive: brand.lastActive,
                createdAt: brand.createdAt,
                updatedAt: brand.updatedAt,
                brandArchive: brand.archive
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching brand by ID:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch", components: {} });
        }
    },

    add_brand: async (req, res) => {
        const { brandname, phone, email, brandlogo, managername, category, subcategory, brandurl } = req.body;
        let { admin_id } = req.loginUser;

        const password = common.genrateRandompassword();
        const encryptedPassword = cryptoLib.encrypt(password, shaKey, process.env.PASSWORD_ENC_IV);

        try {
            const existingBrand = await Brand.findOne({
                $or: [{ email: email }, { phone: phone }],
                isDeleted: false
            });

            if (existingBrand) {
                return sendResponse(req, res, 200, 0, { keyword: "email_or_phone_exists", components: {} });
            }

            const newBrand = new Brand({
                brandname,
                phone,
                email,
                brandlogo,
                managername,
                category,
                subcategory,
                brandurl,
                password: encryptedPassword
            });

            const result = await newBrand.save();

            if (!result) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_add_brand", components: {} });
            }

            await sendWelcomeEmail(email, managername, password);

            return sendResponse(req, res, 200, 1, { keyword: "brand_added", components: { id: result._id } });
        } catch (err) {
            console.error("Error inserting brand:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_add_brand", components: {} });
        }
    },

    update_brand: async (req, res) => {
        const { brandId } = req.body;
        try {
            const existingBrand = await Brand.findOne({
                _id: brandId,
                isDeleted: false
            });
            if (!existingBrand) {
                return sendResponse(req, res, 200, 0, { keyword: "brand_not_found", components: {} });
            }
            if (req.body.email || req.body.phone) {
                const duplicateBrand = await Brand.findOne({
                    $or: [
                        req.body.email ? { email: req.body.email } : {},
                        req.body.phone ? { phone: req.body.phone } : {}
                    ].filter(condition => Object.keys(condition).length > 0),
                    isDeleted: false,
                    _id: { $ne: brandId }
                });

                if (duplicateBrand) {
                    return sendResponse(req, res, 200, 0, { keyword: "email_or_phone_exists", components: {} });
                }
            }

            let updateFields = {};
            if (req.body.brandname) updateFields.brandname = req.body.brandname;
            if (req.body.managername) updateFields.managername = req.body.managername;
            if (req.body.email) updateFields.email = req.body.email;
            if (req.body.phone) updateFields.phone = req.body.phone;
            if (req.body.brandlogo) updateFields.brandlogo = req.body.brandlogo;
            if (req.body.brandurl) updateFields.brandurl = req.body.brandurl;
            if (req.body.website) updateFields.website = req.body.website;
            if (req.body.about) updateFields.about = req.body.about;

            if (req.body.address) {
                updateFields.address = {};
                if (req.body.address.street) updateFields['address.street'] = req.body.address.street;
                if (req.body.address.city) updateFields['address.city'] = req.body.address.city;
                if (req.body.address.state) updateFields['address.state'] = req.body.address.state;
                if (req.body.address.country) updateFields['address.country'] = req.body.address.country;
                if (req.body.address.zipCode) updateFields['address.zipCode'] = req.body.address.zipCode;
                if (req.body.address.fullAddress) updateFields['address.fullAddress'] = req.body.address.fullAddress;
            }
            if (req.body.location) {
                if (req.body.location.lat) updateFields['location.lat'] = req.body.location.lat;
                if (req.body.location.lon) updateFields['location.lon'] = req.body.location.lon;
            }
            if (req.body.category) updateFields.category = req.body.category;
            if (req.body.subcategory) updateFields.subcategory = req.body.subcategory;
            if (req.body.rateOfTwo !== undefined) updateFields.rateOfTwo = req.body.rateOfTwo;
            if (req.body.paymentType) updateFields.paymentType = req.body.paymentType;
            if (req.body.mustTryItems) updateFields.mustTryItems = req.body.mustTryItems;
            if (req.body.brandGuidelines) updateFields.brandGuidelines = req.body.brandGuidelines;
            if (req.body.minimumFollowers !== undefined) updateFields.minimumFollowers = req.body.minimumFollowers;
            if (req.body.viewAndRefund) {
                if (req.body.viewAndRefund.policy) updateFields['viewAndRefund.policy'] = req.body.viewAndRefund.policy;
                if (req.body.viewAndRefund.refundPercentage !== undefined) updateFields['viewAndRefund.refundPercentage'] = req.body.viewAndRefund.refundPercentage;
                if (req.body.viewAndRefund.refundDays !== undefined) updateFields['viewAndRefund.refundDays'] = req.body.viewAndRefund.refundDays;
            }
            if (req.body.procedure) updateFields.procedure = req.body.procedure;
            if (req.body.tryThisOut) updateFields.tryThisOut = req.body.tryThisOut;
            if (req.body.carouselImages) {
                if (req.body.carouselImages.desktop) updateFields['carouselImages.desktop'] = req.body.carouselImages.desktop;
                if (req.body.carouselImages.mobile) updateFields['carouselImages.mobile'] = req.body.carouselImages.mobile;
            }
            if (req.body.posterImages) updateFields.posterImages = req.body.posterImages;
            if (typeof req.body.isActive !== 'undefined') updateFields.isActive = req.body.isActive;
            if (typeof req.body.isLocked !== 'undefined') updateFields.isLocked = req.body.isLocked;
            if (typeof req.body.isDeleted !== 'undefined') updateFields.isDeleted = req.body.isDeleted;
            if (typeof req.body.isVerified !== 'undefined') updateFields.isVerified = req.body.isVerified;
            if (typeof req.body.archive !== 'undefined') updateFields.archive = req.body.archive;
            if (req.body.deviceName) updateFields.deviceName = req.body.deviceName;
            if (req.body.deviceType) updateFields.deviceType = req.body.deviceType;
            if (req.body.deviceToken) updateFields.deviceToken = req.body.deviceToken;
            if (req.body.totalCampaigns !== undefined) updateFields.totalCampaigns = req.body.totalCampaigns;
            if (req.body.totalInfluencers !== undefined) updateFields.totalInfluencers = req.body.totalInfluencers;
            if (req.body.averageRating !== undefined) updateFields.averageRating = req.body.averageRating;
            if (req.body.totalReviews !== undefined) updateFields.totalReviews = req.body.totalReviews;
            if (Object.keys(updateFields).length > 0) {
                await Brand.findByIdAndUpdate(brandId, updateFields, { new: true });
            }
            if (req.body.isActive === false || req.body.isLocked === true || req.body.isDeleted === true) {
                await Brand.findByIdAndUpdate(brandId, {
                    $unset: { token: 1, deviceToken: 1 }
                });
            }

            return sendResponse(req, res, 200, 1, { keyword: "brand_updated", components: {} });
        } catch (err) {
            console.error("Error updating brand:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_brand", components: {} });
        }
    },

    delete_brand: async (req, res) => {
        const { brandId } = req.body;
        try {
            const existingBrand = await Brand.findOne({
                _id: brandId,
                isDeleted: false
            });

            if (!existingBrand) {
                return sendResponse(req, res, 200, 0, { keyword: "brand_not_found", components: {} });
            }

            await Brand.findByIdAndUpdate(brandId, { isDeleted: true });

            return sendResponse(req, res, 200, 1, { keyword: "brand_deleted", components: {} });
        } catch (err) {
            console.error("Error deleting brand:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_delete_brand", components: {} });
        }
    },

    dashboard_brand: async (req, res) => {
        try {
            const { admin_id } = req.loginUser;
            let { brandId, startDate, endDate } = req.body;

            let dateQuery = {};
            if (startDate || endDate) {
                dateQuery.createdAt = {};
                if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
                if (endDate) dateQuery.createdAt.$lte = new Date(endDate);
            }

            const totalBilling = await Bill.countDocuments({
                brandId: brandId,
                isDeleted: false,
                ...dateQuery
            });

            let approvedDateQuery = {};
            if (startDate || endDate) {
                approvedDateQuery.brandStatusDate = {};
                if (startDate) approvedDateQuery.brandStatusDate.$gte = new Date(startDate);
                if (endDate) approvedDateQuery.brandStatusDate.$lte = new Date(endDate);
            }

            const totalApproved = await Bill.countDocuments({
                brandId: brandId,
                status: 'approved',
                isDeleted: false,
                ...approvedDateQuery
            });

            const totalRejected = await Bill.countDocuments({
                brandId: brandId,
                status: 'rejected',
                isDeleted: false,
                ...approvedDateQuery
            });

            const totalPending = await Bill.countDocuments({
                brandId: brandId,
                status: 'pending for approval',
                isDeleted: false,
                ...dateQuery
            });

            let refundDateQuery = {};
            if (startDate || endDate) {
                refundDateQuery.brandRefundDate = {};
                if (startDate) refundDateQuery.brandRefundDate.$gte = new Date(startDate);
                if (endDate) refundDateQuery.brandRefundDate.$lte = new Date(endDate);
            }

            const totalRefundResult = await Bill.aggregate([
                {
                    $match: {
                        brandId: brandId,
                        brandRefundStatus: 'success',
                        isDeleted: false,
                        ...refundDateQuery
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRefund: { $sum: '$refundAmount' }
                    }
                }
            ]);

            const totalRefund = totalRefundResult.length > 0 ? totalRefundResult[0].totalRefund : 0;

            const brandData = await Brand.findById(brandId);
            const archive = brandData ? brandData.archive : false;

            const response = {
                totalBilling,
                totalApproved,
                totalDisapproved: totalRejected,
                totalPending,
                totalRefund,
                brandArchive: archive
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_dashboard", components: {} });
        }
    },

    archive_brand: async (req, res) => {
        const { brandId, archive } = req.body;
        try {
            const existingBrand = await Brand.findOne({
                _id: brandId,
                isDeleted: false
            });

            if (!existingBrand) {
                return sendResponse(req, res, 200, 0, { keyword: "brand_not_found", components: {} });
            }

            await Brand.findByIdAndUpdate(brandId, { archive: archive });

            return sendResponse(req, res, 200, 1, { keyword: "brand_archived", components: {} });
        } catch (err) {
            console.error("Error archiving brand:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_archive_brand", components: {} });
        }
    }
};

module.exports = brand_controller;