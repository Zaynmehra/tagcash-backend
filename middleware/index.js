const { ENCRYPTION_BYPASS } = require('../config/constants.js');
const en = require('../languages/en.js');
const cryptoLib = require('cryptlib');
const shaKey = cryptoLib.getHashSha256(process.env.KEY, 32);
const { default: localizify } = require('localizify');
const { t } = require('localizify');
const jwt = require('jsonwebtoken');
const Admin = require('../models/v1/Admin');
const Brand = require('../models/v1/Brand');
const Customer = require('../models/v1/Customer');

const checkApiKey = function (req, res, next) {
    if (req.headers['api-key'] == process.env.API_KEY) {
        next();
    } else {
        sendResponse(req, res, 401, '-1', { keyword: 'invalid_api_key', components: {} }, {});
    }
};

const checkToken = async function (req, res, next) {
    try {
        req.loginUser = {};
        const { data, expiresIn, iat } = jwt.verify(req.headers['token'], process.env.JWT_SECRET_KEY);
        req.loginUser.admin_id = data.admin_id;
        req.loginUser.language = req.headers['accept-language'] || 'en';
        req.loginUser.name = data?.name;

        let userData = await Admin.findOne({
            _id: data.admin_id,
            token: req.headers['token']
        });

        if (userData) {
            next();
        } else {
            let keyword = 'token_invalid';
            sendResponse(req, res, 401, '-1', { keyword: keyword, components: {} }, {});
        }
    } catch (e) {
        let keyword = 'token_invalid';
        sendResponse(req, res, 401, '-1', { keyword: keyword, components: {} }, {});
    }
};

const checkTokenBrand = async function (req, res, next) {
    try {
        req.loginUser = {};
        const { data, expiresIn, iat } = jwt.verify(req.headers['token'], process.env.JWT_SECRET_KEY);
        req.loginUser.admin_id = data.admin_id;
        req.loginUser.language = req.headers['accept-language'] || 'en';
        req.loginUser.name = data?.name;
        let userData = await Brand.findOne({
            _id: data.admin_id,
            token: req.headers['token']
        });
        if (userData) {
            next();
        } else {
            let keyword = 'token_invalid';
            sendResponse(req, res, 401, '-1', { keyword: keyword, components: {} }, {});
        }
    } catch (e) {
        let keyword = 'token_invalid';
        sendResponse(req, res, 401, '-1', { keyword: keyword, components: {} }, {});
    }
};

const checkTokenCustomer = async function (req, res, next) {
    try {
        req.loginUser = {};
        const token = req.headers['authorization']?.replace('Bearer ', '') || req.headers['token'];

        if (!token) {
            return sendResponse(req, res, 401, '-1', { keyword: 'token_invalid', components: {} }, {});
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        if (decoded.type !== 'access') {
            return sendResponse(req, res, 401, '-1', { keyword: 'token_invalid', components: {} }, {});
        }

        const customer = await Customer.findOne({
            _id: decoded.customerId,
            isDeleted: false,
            isActive: true
        });

        if (!customer) {
            return sendResponse(req, res, 401, '-1', { keyword: 'token_invalid', components: {} }, {});
        }

        req.loginUser = {
            id: customer._id,
            customerId: customer._id,
            email: customer.email,
            name: customer.name
        };

        next();
    } catch (e) {
        let keyword = 'token_invalid';
        sendResponse(req, res, 401, '-1', { keyword: keyword, components: {} }, {});
    }
};

const validateJoi = (schema) => {
    return (req, res, next) => {
        const options = {
            errors: {
                wrap: {
                    label: false
                }
            },
            stripUnknown: true
        };

        const { error } = schema.validate(req.body, options);

        if (error) {
            return res.status(200).json(encryption({ code: 0, message: error.details[0].message }));
        }

        next();
    };
};

const sendResponse = function (req, res, statuscode, responsecode, { keyword = 'failed', components = {} }, responsedata) {
    let formatmsg = getMessage(req.headers?.['accept-language'], keyword, components);

    if (keyword == 'no_data') {
        responsecode = 2;
    }

    let encrypted_data = encryption({ code: responsecode, message: formatmsg, data: responsedata });

    res.status(statuscode);
    res.send(encrypted_data);
};

const decryption = function (req, res, next) {
    if (!ENCRYPTION_BYPASS) {
        try {
            if (req.body != undefined && Object.keys(req.body).length !== 0) {
                req.body = JSON.parse(cryptoLib.decrypt(req.body, shaKey, process.env.IV));
                next();
            } else {
                next();
            }
        } catch (e) {
            res.status(200);
            res.json({ code: 0, message: "badEncrypt" });
        }
    } else {
        next();
    }
};

const encryption = function (response_data) {
    if (!ENCRYPTION_BYPASS) {
        return cryptoLib.encrypt(JSON.stringify(response_data), shaKey, process.env.IV);
    } else {
        return response_data;
    }
};

const getMessage = function (requestLanguage = 'en', key, value) {
    try {
        localizify
            .add('en', en)
            .setLocale(requestLanguage);

        let message = t(key, value);

        return message;
    } catch (e) {
        return "Something went wrong";
    }
};

module.exports = {
    checkApiKey,
    checkToken,
    checkTokenBrand,
    checkTokenCustomer,
    sendResponse,
    decryption,
    encryption,
    validateJoi
};