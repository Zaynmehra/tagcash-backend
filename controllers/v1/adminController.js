const Admin = require('../../models/v1/Admin');
const { sendResponse } = require('../../middleware');
const cryptoLib = require('cryptlib');
const shaKey = cryptoLib.getHashSha256(process.env.PASSWORD_ENC_KEY, 32);

let admin_controller = {
    create_admin: async (req, res) => {
        try {
            const { name, email, password, role, permissions } = req.body;

            const existingAdmin = await Admin.findOne({ email: email, isDeleted: false });

            if (existingAdmin) {
                return sendResponse(req, res, 200, 0, { keyword: "email_exist", components: {} });
            }

            const encryptedPassword = cryptoLib.encrypt(password, shaKey, process.env.PASSWORD_ENC_IV);

            const newAdmin = new Admin({
                name,
                email,
                password: encryptedPassword,
                role: role || 'admin',
                permissions: permissions || []
            });

            const result = await newAdmin.save();

            if (!result) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_add", components: {} });
            }

            return sendResponse(req, res, 200, 1, { keyword: "added", components: { id: result._id } });
        } catch (err) {
            console.error("Error creating admin:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_add", components: {} });
        }
    },

    list_admin: async (req, res) => {
        const { page = 1, limit = 10, search, isActive } = req.body;
        const skip = (page - 1) * limit;

        try {
            let query = { isDeleted: false };

            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ];
            }

            if (typeof isActive !== 'undefined') query.isActive = isActive;

            const admins = await Admin.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            const totalCount = await Admin.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            const response = {
                totalCount,
                totalPages,
                currentPage: page,
                admins: admins.map(admin => ({
                    id: admin._id,
                    name: admin.name,
                    email: admin.email,
                    profileImage: admin.profileImage,
                    isActive: admin.isActive,
                    isLocked: admin.isLocked,
                    isVerified: admin.isVerified,
                    role: admin.role,
                    permissions: admin.permissions,
                    lastActive: admin.lastActive,
                    createdAt: admin.createdAt,
                    updatedAt: admin.updatedAt
                }))
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching admins:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch", components: {} });
        }
    },

    get_admin_by_id: async (req, res) => {
        const { adminId } = req.body;

        try {
            const admin = await Admin.findOne({
                _id: adminId,
                isDeleted: false
            });

            if (!admin) {
                return sendResponse(req, res, 200, 0, { keyword: "user_not_found", components: {} });
            }

            const response = {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                profileImage: admin.profileImage,
                isLocked: admin.isLocked,
                isVerified: admin.isVerified,
                role: admin.role,
                permissions: admin.permissions,
                lastActive: admin.lastActive,
                createdAt: admin.createdAt,
                updatedAt: admin.updatedAt
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching admin by ID:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch", components: {} });
        }
    },

    update_admin: async (req, res) => {
        const { adminId, name, email, role, permissions, isActive, isLocked, isDeleted } = req.body;

        try {
            const existingAdmin = await Admin.findOne({
                _id: adminId,
                isDeleted: false
            });

            if (!existingAdmin) {
                return sendResponse(req, res, 200, 0, { keyword: "user_not_found", components: {} });
            }

            if (email) {
                const duplicateAdmin = await Admin.findOne({
                    email: email,
                    isDeleted: false,
                    _id: { $ne: adminId }
                });

                if (duplicateAdmin) {
                    return sendResponse(req, res, 200, 0, { keyword: "email_exist", components: {} });
                }
            }

            let updateFields = {};

            if (name) updateFields.name = name;
            if (email) updateFields.email = email;
            if (role) updateFields.role = role;
            if (permissions) updateFields.permissions = permissions;
            if (typeof isActive !== 'undefined') updateFields.isActive = isActive;
            if (typeof isLocked !== 'undefined') updateFields.isLocked = isLocked;
            if (typeof isDeleted !== 'undefined') updateFields.isDeleted = isDeleted;

            if (Object.keys(updateFields).length > 0) {
                await Admin.findByIdAndUpdate(adminId, updateFields);
            }

            if (isActive === false || isLocked === true || isDeleted === true) {
                await Admin.findByIdAndUpdate(adminId, {
                    $unset: { token: 1, deviceToken: 1 }
                });
            }

            return sendResponse(req, res, 200, 1, { keyword: "updated", components: {} });
        } catch (err) {
            console.error("Error updating admin:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update", components: {} });
        }
    },

    delete_admin: async (req, res) => {
        const { adminId } = req.body;
        try {
            const existingAdmin = await Admin.findOne({
                _id: adminId,
                isDeleted: false
            });

            if (!existingAdmin) {
                return sendResponse(req, res, 200, 0, { keyword: "user_not_found", components: {} });
            }

            await Admin.findByIdAndUpdate(adminId, { isDeleted: true });

            return sendResponse(req, res, 200, 1, { keyword: "deleted", components: {} });
        } catch (err) {
            console.error("Error deleting admin:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_delete", components: {} });
        }
    }
};

module.exports = admin_controller;