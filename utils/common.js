require('dotenv').config();
const moment = require('moment');
const moment_tz = require('moment-timezone');
const jwt = require('jsonwebtoken');
const Admin = require('../models/v1/Admin');
const Brand = require('../models/v1/Brand');
const Customer = require('../models/v1/Customer');
const request = require('request');

const common = {
    jwt_validate: async (token) => {
        try {
            const verified = jwt.verify(token, process.env.JWT_SECRET_KEY);
            if (verified) {
                return verified;
            } else {
                throw new Error("token_invalid");
            }
        } catch (error) {
            throw new Error("token_invalid");
        }
    },

    jwt_sign: (data, expiresIn = "365days") => {
        const enc_data = {
            expiresIn,
            data: data
        };
        const token = jwt.sign(enc_data, process.env.JWT_SECRET_KEY);
        return token;
    },

    admin_details: async (admin_id) => {
        try {
            let admin_details = await Admin.findById(admin_id).select('-password, +token');
            if (!admin_details) {
                throw new Error("user_not_found");
            }
            return { admin_details };
        } catch (e) {
            throw new Error("user_not_found");
        }
    },

    brand_details: async (admin_id) => {
        try {
            let admin_details = await Brand.findById(admin_id).select('+token');
            if (!admin_details) {
                throw new Error("user_not_found");
            }
            return { admin_details };
        } catch (e) {
            throw new Error("user_not_found");
        }
    },

    customer_details: async (customer_id) => {
        try {
            let customer_details = await Customer.findById(customer_id).select('-password -refreshToken');
            if (!customer_details) {
                throw new Error("user_not_found");
            }
            return { customer_details };
        } catch (e) {
            throw new Error("user_not_found");
        }
    },

    generateOtp: async () => {
        let otp = Math.floor(100000 + Math.random() * 900000).toString();
        return otp;
    },

    utcToLocal: (utcTime, timezone, inputTimeFormat = undefined, outputTimeFormat = undefined) => {
        utcTime = moment.utc(utcTime, inputTimeFormat);
        const timezoneTime = utcTime.tz(timezone);
        return timezoneTime.format(outputTimeFormat);
    },

    localToUtc: (localTime, timezone, inputTimeFormat = undefined, outputTimeFormat = undefined) => {
        return moment_tz.tz(localTime, inputTimeFormat, timezone).utc().format(outputTimeFormat);
    },

    check_file_format: (files, allowd_media_files) => {
        let invalidFiles = files.filter(file => {
            let ext = file.split('.').pop() || '';
            return !allowd_media_files.includes(ext);
        });
        return invalidFiles.length > 0;
    },

    convertNumberToSuffix: (num) => {
        if (num < 1e3) return num;
        const suffixes = ["", "K", "M", "B", "T"];
        const magnitude = Math.floor(Math.log10(num) / 3);
        const scaledNum = num / Math.pow(1000, magnitude);
        const formattedNum = (scaledNum % 1 === 0) ? scaledNum.toFixed(0) : scaledNum.toFixed(1);
        return formattedNum + suffixes[magnitude];
    },

    genrateRandompassword: (length = 6) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    },

    fetchMetaData: async (insta_content_url, billId, fetchDate) => {
        try {
            const options = {
                method: 'GET',
                url: 'https://instagram-statistics-api.p.rapidapi.com/posts/one',
                qs: {
                    postUrl: insta_content_url
                },
                headers: {
                    'x-rapidapi-key': process.env.RAPIDAPI_KEY,
                    'x-rapidapi-host': 'instagram-statistics-api.p.rapidapi.com'
                }
            };

            return new Promise((resolve, reject) => {
                request(options, async function (error, response, body) {
                    if (error) {
                        console.error("Error parsing metadata response:", parseError);
                        reject(new Error("metadata_parse_error"));
                    }
                });
            });
        } catch (error) {
            console.error("Error fetching metadata:", error);
            throw new Error("metadata_fetch_error");
        }
    }
};

module.exports = common;