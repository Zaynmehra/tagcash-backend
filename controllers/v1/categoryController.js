const Category = require('../../models/v1/Category');
const { sendResponse } = require('../../middleware');

let category_controller = {
    add_category: async (req, res) => {
        const { category, subcategory, isActive } = req.body;

        console.log({ category, subcategory, isActive })

        try {
            const newCategory = new Category({
                category,
                subcategory: subcategory || [],
                isActive: isActive !== undefined ? isActive : true
            });

            const result = await newCategory.save();

            if (!result) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_add_category", components: {} });
            }

            return sendResponse(req, res, 200, 1, { keyword: "category_added", components: { id: result._id } });
        } catch (err) {
            console.error("Error inserting category:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_add_category", components: {} });
        }
    },

    edit_category: async (req, res) => {
        const { categoryId, category, subcategory, isActive } = req.body;
        try {
            const existingCategory = await Category.findOne({
                _id: categoryId,
                isDeleted: false
            });

            if (!existingCategory) {
                return sendResponse(req, res, 200, 0, { keyword: "category_not_found", components: {} });
            }

            let updateFields = {};
            
            // Fix: Check if category is provided (not just truthy)
            if (category !== undefined && category !== null) {
                updateFields.category = category;
            }
            
            // Fix: Check if subcategory is provided (including empty arrays)
            if (subcategory !== undefined && subcategory !== null) {
                updateFields.subcategory = subcategory;
            }
            
            // Fix: Proper boolean check
            if (isActive !== undefined && isActive !== null) {
                updateFields.isActive = isActive;
            }

            const result = await Category.findByIdAndUpdate(
                categoryId, 
                updateFields,
                { new: true } // Return updated document
            );

            if (!result) {
                return sendResponse(req, res, 200, 0, { keyword: "category_not_found", components: {} });
            }

            return sendResponse(req, res, 200, 1, { keyword: "category_updated", components: {} });
        } catch (err) {
            console.error("Error updating category:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_category", components: {} });
        }
    },

    add_subcategory: async (req, res) => {
        const { categoryId, subcategory } = req.body;
        try {
            const existingCategory = await Category.findOne({
                _id: categoryId,
                isDeleted: false
            });

            if (!existingCategory) {
                return sendResponse(req, res, 200, 0, { keyword: "category_not_found", components: {} });
            }

            // Fix: Handle both string and array for subcategory
            const subcategoriesToAdd = Array.isArray(subcategory) ? subcategory : [subcategory];

            await Category.findByIdAndUpdate(categoryId, {
                $push: { subcategory: { $each: subcategoriesToAdd } }
            });

            return sendResponse(req, res, 200, 1, { keyword: "subcategory_added", components: {} });
        } catch (err) {
            console.error("Error adding subcategory:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_add_subcategory", components: {} });
        }
    },

    remove_subcategory: async (req, res) => {
        const { categoryId, subcategory } = req.body;
        try {
            const existingCategory = await Category.findOne({
                _id: categoryId,
                isDeleted: false
            });

            if (!existingCategory) {
                return sendResponse(req, res, 200, 0, { keyword: "category_not_found", components: {} });
            }

            // Fix: Handle both string and array for subcategory removal
            const subcategoriesToRemove = Array.isArray(subcategory) ? subcategory : [subcategory];

            await Category.findByIdAndUpdate(categoryId, {
                $pull: { subcategory: { $in: subcategoriesToRemove } }
            });

            return sendResponse(req, res, 200, 1, { keyword: "subcategory_removed", components: {} });
        } catch (err) {
            console.error("Error removing subcategory:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_remove_subcategory", components: {} });
        }
    },

    list_category: async (req, res) => {
        // Fix: Use req.body instead of req.query since route uses POST
        const { page = 1, limit = 10, search } = req.body;
        try {
            const skip = (page - 1) * limit;
            let query = { isDeleted: false };
            
            if (search && search.trim()) {
                query.category = { $regex: search.trim(), $options: 'i' };
            }
            
            const categories = await Category.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            const totalCount = await Category.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            const response = {
                totalCount,
                totalPages,
                currentPage: parseInt(page),
                categories
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching categories:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_categories", components: {} });
        }
    },

    delete_category: async (req, res) => {
        const { categoryId } = req.body;
        try {
            const existingCategory = await Category.findOne({
                _id: categoryId,
                isDeleted: false
            });

            if (!existingCategory) {
                return sendResponse(req, res, 200, 0, { keyword: "category_not_found", components: {} });
            }

            await Category.findByIdAndUpdate(categoryId, { isDeleted: true });

            return sendResponse(req, res, 200, 1, { keyword: "category_deleted", components: {} });
        } catch (err) {
            console.error("Error deleting category:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_delete_category", components: {} });
        }
    }
};

module.exports = category_controller;