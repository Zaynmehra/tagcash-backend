const Brand = require('../../models/v1/Brand');
const Bill = require('../../models/v1/Bill');
const Costumer = require('../../models/v1/Customer');
const { sendResponse } = require('../../middleware');
const common = require('../../utils/common');
const moment = require('moment');
const BrandTransaction = require('../../models/v1/BrandTransaction');
const cryptoLib = require('cryptlib');
const shaKey = cryptoLib.getHashSha256(process.env.PASSWORD_ENC_KEY, 32);
const { sendWelcomeEmail, sendVerificationEmail } = require('../../utils/sendOtp');
const crypto = require('crypto');
const mongoose = require('mongoose');

const Razorpay = require('razorpay');
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

let brand_controller = {
    register_brand: async (req, res) => {
        try {
            const { brandname, email, password, phone, managername, brandurl, category, subcategory, instaId } = req.body;

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
                instaId,
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
        const { page = 1, limit = 10, search, isActive, isLocked } = req.body;
        const skip = (page - 1) * limit;
        try {
            let query = { isDeleted: false };
            if (search) {
                query.$or = [
                    { brandname: { $regex: search, $options: 'i' } },
                    { managername: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } }
                ];
            }

            if (typeof isActive !== 'undefined') query.isActive = isActive;
            if (typeof isLocked !== 'undefined') query.isLocked = isLocked;

            const brands = await Brand.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            const totalCount = await Brand.countDocuments(query);
            const brandIds = brands.map(brand => brand._id);
            const lastBills = await Bill.aggregate([
                { $match: { brandId: { $in: brandIds } } },
                { $sort: { brandId: 1, createdAt: -1 } },
                {
                    $group: {
                        _id: '$brandId',
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
                brands: brands.map(brand => ({
                    id: brand._id,
                    brandname: brand.brandname,
                    phone: brand.phone,
                    email: brand.email,
                    brandlogo: brand.brandlogo,
                    managername: brand.managername,
                    category: brand.category,
                    subcategory: brand.subcategory,
                    isVerified: brand.isVerified,
                    isActive: brand.isActive,
                    isLocked: brand.isLocked,
                    lastActive: brand.lastActive,
                    lastBillId: billMap.get(brand._id.toString()) || null,
                    createdAt: brand.createdAt,
                    updatedAt: brand.updatedAt,
                    brandArchive: brand.archive,
                    paymentType: brand.paymentType,
                    balance: brand.balance,
                    totalAddedBalance: brand?.totalAddedBalance || brand?.balance,
                }))
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching brands:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch", components: {} });
        }
    },

    get_brand_bills: async (req, res) => {
        const { page = 1, limit = 10, startDate, endDate, status, brandId } = req.body;
        try {
            if (!brandId) {
                return sendResponse(req, res, 400, 0, { keyword: "brand_id_required" });
            }
            const brand = await Brand.findOne({ _id: brandId, isDeleted: false });
            if (!brand) {
                return sendResponse(req, res, 404, 0, { keyword: "brand_not_found" });
            }
            const skip = (page - 1) * limit;
            let query = { brandId: brandId };
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
                brand: {
                    id: brand._id,
                    brandname: brand.brandname,
                    email: brand.email,
                    phone: brand.phone,
                    managername: brand.managername
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
            console.error("Error fetching brand bills:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_bills" });
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
                brandlogo: brand.brandlogo,
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


    get_brands: async (req, res) => {
        const { page = 1, limit = 10, search, isActive = true } = req.body;
        const skip = (page - 1) * limit;

        try {
            let query = {
                isDeleted: false,
                about: { $exists: true, $ne: null, $ne: '' },
                posterImages: { $exists: true, $not: { $size: 0 } },
                carouselImages: { $exists: true, $ne: null },
                paymentType: { $exists: true, $ne: null, $ne: '' },
                rateOfTwo: { $exists: true, $ne: null },
                address: { $exists: true, $ne: null }
            };
            query.$and = [
                {
                    $or: [
                        { 'carouselImages.desktop': { $exists: true, $not: { $size: 0 } } },
                        { 'carouselImages.mobile': { $exists: true, $not: { $size: 0 } } }
                    ]
                }
            ];

            if (search) {
                query.$or = [
                    { brandname: { $regex: search, $options: 'i' } },
                    { managername: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ];
            }

            if (typeof isActive !== 'undefined') query.isActive = isActive;

            const brands = await Brand.find(query)
                .select('brandname about averageRating totalReviews brandlogo carouselImages posterImages category subcategory isVerified paymentType rateOfTwo address')
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
                    about: brand.about,
                    averageRating: brand.averageRating,
                    totalReviews: brand.totalReviews,
                    brandlogo: brand.brandlogo,
                    carouselImages: brand.carouselImages,
                    posterImages: brand.posterImages,
                    mustTryItems: brand.mustTryItems,
                    category: brand.category,
                    subcategory: brand.subcategory,
                    isVerified: brand.isVerified,
                    paymentType: brand.paymentType,
                    rateOfTwo: brand.rateOfTwo,
                    address: brand.address,
                    createdAt: brand.createdAt
                }))
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching brands:", err);
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
            if (req.body.minimumFollowers !== undefined) updateFields.minimumFollowers = req.body.minimumFollowers;
            if (req.body.procedure) updateFields.procedure = req.body.procedure;
            if (req.body.mustTryItems) {
                try {
                    const incomingMustTryItems = typeof req.body.mustTryItems === 'string'
                        ? JSON.parse(req.body.mustTryItems)
                        : req.body.mustTryItems;

                    if (Array.isArray(incomingMustTryItems)) {
                        const existingMustTryItems = existingBrand.mustTryItems || [];

                        const mergedMustTryItems = incomingMustTryItems.map((item, index) => {
                            if (item.image && item.image.startsWith('http')) {
                                return item;
                            }
                            if (existingMustTryItems[index] && existingMustTryItems[index].image) {
                                return {
                                    ...item,
                                    image: existingMustTryItems[index].image
                                };
                            }
                            return item;
                        });

                        updateFields.mustTryItems = mergedMustTryItems;
                    }
                } catch (e) {
                    console.error('Error parsing mustTryItems:', e);
                }
            }
            if (req.body.brandGuidelines) {
                try {
                    const parsedBrandGuidelines = typeof req.body.brandGuidelines === 'string'
                        ? JSON.parse(req.body.brandGuidelines)
                        : req.body.brandGuidelines;
                    if (Array.isArray(parsedBrandGuidelines)) {
                        updateFields.brandGuidelines = parsedBrandGuidelines;
                    }
                } catch (e) {
                    console.error('Error parsing brandGuidelines:', e);
                }
            }

            if (req.body.viewAndRefund) {
                if (req.body.viewAndRefund.policy) updateFields['viewAndRefund.policy'] = req.body.viewAndRefund.policy;
                if (req.body.viewAndRefund.refundPercentage !== undefined) updateFields['viewAndRefund.refundPercentage'] = req.body.viewAndRefund.refundPercentage;
                if (req.body.viewAndRefund.refundDays !== undefined) updateFields['viewAndRefund.refundDays'] = req.body.viewAndRefund.refundDays;
                if (req.body.viewAndRefund.upToRefundAmount) updateFields['viewAndRefund.upToRefundAmount'] = req.body.viewAndRefund.upToRefundAmount;
                if (req.body.viewAndRefund.minimumViews) updateFields['viewAndRefund.minimumViews'] = req.body.viewAndRefund.minimumViews;
            }

            if (req.body.tryThisOut) {
                try {
                    const incomingTryThisOut = typeof req.body.tryThisOut === 'string'
                        ? JSON.parse(req.body.tryThisOut)
                        : req.body.tryThisOut;

                    if (Array.isArray(incomingTryThisOut)) {
                        const existingTryThisOut = existingBrand.tryThisOut || [];

                        const mergedTryThisOut = incomingTryThisOut.map((item, index) => {
                            if (item.images && Array.isArray(item.images) &&
                                item.images.length > 0 && item.images[0].startsWith('http')) {
                                return item;
                            }
                            if (existingTryThisOut[index] && existingTryThisOut[index].images) {
                                return {
                                    ...item,
                                    images: existingTryThisOut[index].images
                                };
                            }
                            return item;
                        });

                        updateFields.tryThisOut = mergedTryThisOut;
                    }
                } catch (e) {
                    console.error('Error parsing tryThisOut:', e);
                }
            }

            if (req.body.carouselImages) {
                if (req.body.carouselImages.desktop) updateFields['carouselImages.desktop'] = req.body.carouselImages.desktop;
                if (req.body.carouselImages.mobile) updateFields['carouselImages.mobile'] = req.body.carouselImages.mobile;
            }
            if (req.body.posterImages) {
                if (Array.isArray(req.body.posterImages)) {
                    updateFields.posterImages = req.body.posterImages;
                }
            }
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
                await Brand.findByIdAndUpdate(brandId, { $set: updateFields }, { new: true });
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
            const { admin_id: brandId } = req.loginUser;
            let { startDate, endDate } = req.body;

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

            const totalSalesResult = await Bill.aggregate([
                {
                    $match: {
                        brandId: new mongoose.Types.ObjectId(brandId)
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: '$billAmount' }
                    }
                }
            ]);

            const totalSales = totalSalesResult.length > 0 ? totalSalesResult[0].totalSales : 0;

            const brandData = await Brand.findById(brandId);

            const response = {
                totalBilling,
                totalApproved,
                totalDisapproved: totalRejected,
                totalPending,
                totalRefund,
                totalSales, // Added total sales amount
                brandArchive: brandData?.archive === false ? false : true,
                paymentType: brandData?.paymentType || "",
                balance: brandData?.balance,
                averageRating: brandData?.averageRating || 0,
                totalReviews: brandData?.totalReviews || 0,
                totalCampaigns: brandData?.totalCampaigns || 0,
                totalInfluencers: brandData?.totalInfluencers || 0,
                totalAddedBalance: brandData?.totalAddedBalance || brandData?.balance,
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_dashboard", components: {} });
        }
    },

    archive_brand: async (req, res) => {
        const { archive } = req.body;
        const { admin_id: brandId } = req.loginUser;
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
    },

    get_open_brand_by_id: async (req, res) => {
        const { id } = req.params;
        try {
            const brand = await Brand.findOne({ _id: id, isDeleted: false })
                .populate('reviews.reviewBy', 'name email');

            if (!brand) {
                return sendResponse(req, res, 404, 0, { keyword: "brand_not_found", components: {} });
            }

            const response = {
                id: brand._id,
                brandname: brand.brandname,
                managername: brand.managername,
                email: brand.email,
                phone: brand.phone,
                brandlogo: brand.brandlogo,
                brandurl: brand.brandurl,
                instaId: brand.instaId,
                website: brand.website,
                about: brand.about,
                address: brand.address,
                location: brand.location,
                category: brand.category,
                subcategory: brand.subcategory,
                rateOfTwo: brand.rateOfTwo,
                paymentType: brand.paymentType,
                mustTryItems: brand.mustTryItems,
                brandGuidelines: brand.brandGuidelines,
                minimumFollowers: brand.minimumFollowers,
                viewAndRefund: brand.viewAndRefund,
                procedure: brand.procedure,
                tryThisOut: brand.tryThisOut,
                reviews: brand.reviews,
                carouselImages: brand.carouselImages,
                posterImages: brand.posterImages,
                isActive: brand.isActive,
                isLocked: brand.isLocked,
                isVerified: brand.isVerified,
                archive: brand.archive,
                deviceName: brand.deviceName,
                deviceType: brand.deviceType,
                lastActive: brand.lastActive,
                totalCampaigns: brand.totalCampaigns,
                totalInfluencers: brand.totalInfluencers,
                averageRating: brand.averageRating,
                totalReviews: brand.totalReviews,
                createdAt: brand.createdAt,
                updatedAt: brand.updatedAt
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching brand:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch", components: {} });
        }
    },


    add_balance: async (req, res) => {

        const { amount } = req.body;
        const { admin_id: brandId, } = req.loginUser;
        try {
            const options = {
                amount: amount * 100,
                currency: 'INR',
                receipt: `bill_${Date.now()}`,
                payment_capture: 1
            };

            const order = await razorpay.orders.create(options);

            const newBill = new BrandTransaction({
                brandId,
                amount,
                status: 'pending',
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
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        try {
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest("hex");

            const isAuthentic = expectedSignature === razorpay_signature;

            const transactions = await BrandTransaction.findOne({ razorpayOrderId: razorpay_order_id });

            if (isAuthentic) {

                if (!transactions) {
                    return sendResponse(req, res, 404, 0, { keyword: "brand_not_found", components: {} });
                }

                await BrandTransaction.findByIdAndUpdate(transactions._id.toString(), {
                    razorpayPaymentId: razorpay_payment_id,
                    razorpaySignature: razorpay_signature,
                    status: 'completed'
                });

                await Brand.findByIdAndUpdate(transactions.brandId.toString(), {
                    $inc: { balance: transactions.amount, totalAddedBalance: transactions.amount }
                });

                return sendResponse(req, res, 200, 1, { keyword: "payment_verified", components: {} });
            } else {
                await BrandTransaction.findByIdAndUpdate(transactions._id, {
                    status: 'declined',
                    razorpayPaymentId: razorpay_payment_id,
                    razorpaySignature: razorpay_signature
                });
                return sendResponse(req, res, 200, 0, { keyword: "payment_verification_failed", components: {} });
            }
        } catch (err) {
            console.error("Error verifying payment:", err);
            return sendResponse(req, res, 500, 0, { keyword: "payment_verification_error", components: {} });
        }
    },


    get_brand_customers: async (req, res) => {
        try {
            const { admin_id: brandId } = req.loginUser;
            const { page = 1, limit = 10, search, isVerified, isActive } = req.body;
            const skip = (page - 1) * limit;

            const billQuery = {
                brandId: new mongoose.Types.ObjectId(brandId),
                isDeleted: false
            };

            let customerMatch = { isDeleted: false };

            if (search) {
                customerMatch.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } }
                ];
            }

            if (!!isVerified) {
                customerMatch.isVerified = isVerified;
            }

            if (!!isActive) {
                customerMatch.isActive = isActive;
            }

            const getData = await Bill.find(billQuery)
                .select('customerId billAmount status paymentType createdAt')
                .populate({
                    path: 'customerId',
                    match: customerMatch,
                    select: 'name email phone profileImage instaId instaDetails upiId category isActive isVerified isTagVerified brandVerified lastActive createdAt'
                })
                .lean();

            const filteredData = getData.filter(item => item.customerId !== null);

            const uniqueCustomers = [];
            const customerIds = new Set();

            filteredData.forEach(item => {
                const customerId = item.customerId._id.toString();
                if (!customerIds.has(customerId)) {
                    customerIds.add(customerId);
                    uniqueCustomers.push(item.customerId);
                }
            });

            const total = uniqueCustomers.length;
            const paginatedCustomers = uniqueCustomers.slice(skip, skip + parseInt(limit));

            res.status(200).json({
                success: true,
                data: paginatedCustomers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    verify_brand_customer: async (req, res) => {
        try {
            const { admin_id: brandId } = req.loginUser;
            const { customerId } = req.body;

            const Customer = require('../../models/v1/Customer');

            const customer = await Customer.findOne({
                _id: customerId,
                isDeleted: false,
                isActive: true
            });

            if (!customer) {
                return sendResponse(req, res, 200, 0, { keyword: "customer_not_found", components: {} });
            }
            if (customer.brandVerified?.includes(brandId)) {
                return sendResponse(req, res, 200, 1, { keyword: "customer_already_verified", components: {} });
            }
            await Customer.findByIdAndUpdate(customerId, {
                $addToSet: { brandVerified: brandId }
            });

            return sendResponse(req, res, 200, 1, { keyword: "customer_verified_successfully", components: {} });
        } catch (err) {
            console.error("Error verifying customer:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_verify_customer", components: {} });
        }
    },


    unverify_brand_customer: async (req, res) => {
        try {
            const { admin_id: brandId } = req.loginUser;
            const { customerId } = req.body;

            const Customer = require('../../models/v1/Customer');

            const customer = await Customer.findOne({
                _id: customerId,
                isDeleted: false
            });

            if (!customer) {
                return sendResponse(req, res, 200, 0, { keyword: "customer_not_found", components: {} });
            }
            if (!customer.brandVerified?.includes(brandId)) {
                return sendResponse(req, res, 200, 0, { keyword: "customer_not_verified_by_brand", components: {} });
            }
            await Customer.findByIdAndUpdate(customerId, {
                $pull: { brandVerified: brandId }
            });

            return sendResponse(req, res, 200, 1, { keyword: "customer_unverified_successfully", components: {} });
        } catch (err) {
            console.error("Error unverifying customer:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_unverify_customer", components: {} });
        }
    },

    get_verified_brand: async (req, res) => {
        try {
            const { id } = req.loginUser;

            const getBrands = await Costumer.findById(id).select('brandVerified').populate('brandVerified', 'brandname brandlogo');
            if (!getBrands) {
                return sendResponse(req, res, 200, 0, { keyword: "Brands_not_found", components: {} });
            }
            return sendResponse(req, res, 200, 1, { keyword: "success" }, { brands: getBrands });
        } catch (err) {
            console.error("Error fetching verified brands:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch", components: {} });
        }
    },

    get_brand_customer_details: async (req, res) => {
        try {
            const { admin_id: brandId } = req.loginUser;
            const { customerId } = req.body;

            const Customer = require('../../models/v1/Customer');

            const customer = await Customer.findOne({
                _id: customerId,
                isDeleted: false
            }).select('-password -emailVerificationOTP -passwordResetOTP -phoneOtp -token -refreshToken');

            if (!customer) {
                return sendResponse(req, res, 200, 0, { keyword: "customer_not_found", components: {} });
            }

            const response = {
                id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                profileImage: customer.profileImage,
                instaId: customer.instaId,
                instaDetails: customer.instaDetails,
                upiId: customer.upiId,
                category: customer.category,
                isActive: customer.isActive,
                isVerified: customer.isVerified,
                isTagVerified: customer.isTagVerified,
                isBrandVerified: customer.brandVerified?.includes(brandId) || false,
                authProvider: customer.authProvider,
                accountStatus: customer.accountStatus,
                isEmailVerified: customer.isEmailVerified,
                isVerifiedPhoneNo: customer.isVerifiedPhoneNo,
                deviceName: customer.deviceName,
                deviceType: customer.deviceType,
                lastActive: customer.lastActive,
                preferences: customer.preferences,
                createdAt: customer.createdAt,
                updatedAt: customer.updatedAt
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching customer details:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch", components: {} });
        }
    },


    search_customers_for_brand: async (req, res) => {
        try {
            const { admin_id: brandId } = req.loginUser;
            const { searchTerm, page = 1, limit = 10 } = req.body;
            const skip = (page - 1) * limit;

            if (!searchTerm || searchTerm.length < 2) {
                return sendResponse(req, res, 200, 0, { keyword: "search_term_too_short", components: {} });
            }

            const Customer = require('../../models/v1/Customer');

            const query = {
                $or: [
                    { email: { $regex: searchTerm, $options: 'i' } },
                    { instaId: { $regex: searchTerm, $options: 'i' } },
                    { name: { $regex: searchTerm, $options: 'i' } }
                ],
                isDeleted: false,
                isActive: true
            };

            const customers = await Customer.find(query)
                .select('name email instaId profileImage instaDetails brandVerified isVerified isTagVerified createdAt')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            const totalCount = await Customer.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            const response = {
                totalCount,
                totalPages,
                currentPage: page,
                customers: customers.map(customer => ({
                    id: customer._id,
                    name: customer.name,
                    email: customer.email,
                    instaId: customer.instaId,
                    profileImage: customer.profileImage,
                    followersCount: customer.instaDetails?.followersCount || 0,
                    memberType: customer.instaDetails?.memberType || 'Starter Member',
                    isVerified: customer.isVerified,
                    isTagVerified: customer.isTagVerified,
                    isBrandVerified: customer.brandVerified?.includes(brandId) || false,
                    createdAt: customer.createdAt
                }))
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error searching customers:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_search", components: {} });
        }
    },


    export_brand_customers: async (req, res) => {
        try {
            const { admin_id: brandId } = req.loginUser;
            const { format = 'json', isVerified } = req.body;

            let query = {
                brandVerified: brandId,
                isDeleted: false
            };

            if (typeof isVerified !== 'undefined') {
                if (isVerified) {
                    query.brandVerified = brandId;
                } else {
                    query.brandVerified = { $ne: brandId };
                }
            }

            const Customer = require('../../models/v1/Customer');

            const customers = await Customer.find(query)
                .select('name email phone instaId instaDetails upiId category isActive isVerified isTagVerified lastActive createdAt')
                .sort({ createdAt: -1 });

            const exportData = customers.map(customer => ({
                name: customer.name,
                email: customer.email,
                phone: customer.phone || '',
                instaId: customer.instaId,
                followersCount: customer.instaDetails?.followersCount || 0,
                followingCount: customer.instaDetails?.followingCount || 0,
                postsCount: customer.instaDetails?.postsCount || 0,
                memberType: customer.instaDetails?.memberType || 'Starter Member',
                upiId: customer.upiId || '',
                category: customer.category || '',
                isActive: customer.isActive,
                isVerified: customer.isVerified,
                isTagVerified: customer.isTagVerified,
                joinedAt: customer.createdAt,
                lastActive: customer.lastActive
            }));

            if (format === 'csv') {
                const csvHeader = Object.keys(exportData[0] || {}).join(',');
                const csvRows = exportData.map(row =>
                    Object.values(row).map(value =>
                        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
                    ).join(',')
                );
                const csvContent = [csvHeader, ...csvRows].join('\n');

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="brand-customers-${Date.now()}.csv"`);
                return res.send(csvContent);
            }

            return sendResponse(req, res, 200, 1, { keyword: "success" }, {
                customers: exportData,
                totalCount: exportData.length,
                exportedAt: new Date()
            });
        } catch (err) {
            console.error("Error exporting customers:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_export", components: {} });
        }
    },

    get_brand_customer_bills: async (req, res) => {
        try {
            const { admin_id: brandId } = req.loginUser;
            const { page = 1, limit = 10, search, status, paymentType, startDate, endDate, customerId, format = 'json' } = req.body;
            const skip = (page - 1) * limit;

            const billQuery = {
                brandId: new mongoose.Types.ObjectId(brandId),
                customerId: customerId ? new mongoose.Types.ObjectId(customerId) : { $exists: true },
                isDeleted: false
            };

            if (status) {
                billQuery.status = status;
            }

            if (paymentType) {
                billQuery.paymentType = paymentType;
            }

            if (startDate || endDate) {
                billQuery.createdAt = {};
                if (startDate) {
                    billQuery.createdAt.$gte = new Date(startDate);
                }
                if (endDate) {
                    billQuery.createdAt.$lte = new Date(endDate);
                }
            }

            let customerMatch = { isDeleted: false };

            if (search) {
                customerMatch.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                    { instaId: { $regex: search, $options: 'i' } }
                ];
            }

            const bills = await Bill.find(billQuery)
                .populate({
                    path: 'customerId',
                    match: customerMatch,
                    select: 'name email phone profileImage instaId instaDetails isActive isVerified createdAt'
                })
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 })
                .lean();

            const validBills = bills.filter(bill => bill.customerId);

            const totalBills = await Bill.countDocuments(billQuery);

            const billsWithCustomerInfo = validBills.map(bill => ({
                id: bill._id,
                billNo: bill.billNo,
                billAmount: bill.billAmount,
                billUrl: bill.billUrl,
                paymentType: bill.paymentType,
                contentType: bill.contentType,
                contentUrl: bill.contentUrl,
                instaContentUrl: bill.instaContentUrl,
                status: bill.status,
                likes: bill.likes,
                comments: bill.comments,
                views: bill.views,
                refundAmount: bill.refundAmount,
                refundStatus: bill.refundStatus,
                brandRefundStatus: bill.brandRefundStatus,
                createdAt: bill.createdAt,
                updatedAt: bill.updatedAt,
                customer: {
                    id: bill.customerId._id,
                    name: bill.customerId.name,
                    email: bill.customerId.email,
                    phone: bill.customerId.phone,
                    profileImage: bill.customerId.profileImage,
                    instaId: bill.customerId.instaId,
                    followersCount: bill.customerId.instaDetails?.followersCount || 0,
                    memberType: bill.customerId.instaDetails?.memberType || 'Starter Member',
                    isActive: bill.customerId.isActive,
                    isVerified: bill.customerId.isVerified,
                    createdAt: bill.customerId.createdAt
                }
            }));

            return sendResponse(req, res, 200, 1, { keyword: "success" }, {
                bills: billsWithCustomerInfo,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalBills,
                    totalPages: Math.ceil(totalBills / limit),
                    hasNextPage: page < Math.ceil(totalBills / limit),
                    hasPrevPage: page > 1
                }
            });

        } catch (error) {
            console.error("Error fetching brand customer bills:", error);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch", components: {} });
        }
    }
};

module.exports = brand_controller;