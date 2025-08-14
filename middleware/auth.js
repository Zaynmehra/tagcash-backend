const jwt = require('jsonwebtoken');
const Admin = require('../models/v1/Admin');
const Brand = require('../models/v1/Brand');
const Customer = require('../models/v1/Customer');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.headers['token'];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        
        const admin = await Admin.findOne({
            _id: decoded.data.admin_id,
            token: token,
            isActive: true,
            isDeleted: false,
            isLocked: false
        });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token or admin not found'
            });
        }

        req.admin = {
            id: admin._id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            permissions: admin.permissions
        };

        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

const authenticateBrand = async (req, res, next) => {
    try {
        const token = req.headers['token'];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        
        const brand = await Brand.findOne({
            _id: decoded.data.admin_id,
            token: token,
            isActive: true,
            isDeleted: false,
            isLocked: false
        });

        if (!brand) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token or brand not found'
            });
        }

        req.brand = {
            id: brand._id,
            email: brand.email,
            brandname: brand.brandname,
            managername: brand.managername
        };

        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

const authenticateCustomer = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        
        if (decoded.type !== 'access') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token type'
            });
        }

        const customer = await Customer.findOne({
            _id: decoded.customerId,
            isDeleted: false,
            isActive: true
        });

        if (!customer) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token or customer not found'
            });
        }

        req.customer = {
            id: customer._id,
            email: customer.email,
            name: customer.name
        };

        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (roles.length && !roles.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        next();
    };
};

const checkPermission = (permission) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (req.admin.role === 'super_admin') {
            return next();
        }

        if (!req.admin.permissions.includes(permission)) {
            return res.status(403).json({
                success: false,
                message: 'Permission denied'
            });
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    authenticateAdmin,
    authenticateBrand,
    authenticateCustomer,
    authorize,
    checkPermission
};