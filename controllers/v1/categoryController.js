const { Category, SubCategory } = require('../../models/v1/Category');
const { sendResponse } = require('../../middleware');

let category_controller = {
    add_category: async (req, res) => {
        const { name, isActive } = req.body;
        try {
            const newCategory = new Category({
                name,
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

    add_subcategory: async (req, res) => {
        const { name, categoryId } = req.body;
        try {
            const newSubCategory = new SubCategory({
                name,
                categoryId
            });

            const result = await newSubCategory.save();

            if (!result) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_add_subcategory", components: {} });
            }

            return sendResponse(req, res, 200, 1, { keyword: "subcategory_added", components: { id: result._id } });
        } catch (err) {
            console.error("Error inserting subcategory:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_add_subcategory", components: {} });
        }
    },

    edit_category: async (req, res) => {
        const { categoryId, name, isActive } = req.body;
        try {
            const existingCategory = await Category.findOne({
                _id: categoryId,
                isDeleted: false
            });

            if (!existingCategory) {
                return sendResponse(req, res, 200, 0, { keyword: "category_not_found", components: {} });
            }

            let updateFields = {};
            if (name) updateFields.name = name;
            if (typeof isActive !== 'undefined') updateFields.isActive = isActive;

            await Category.findByIdAndUpdate(categoryId, updateFields);

            return sendResponse(req, res, 200, 1, { keyword: "category_updated", components: {} });
        } catch (err) {
            console.error("Error updating category:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_category", components: {} });
        }
    },

    edit_subcategory: async (req, res) => {
        const { subCategoryId, name, categoryId, isActive } = req.body;
        try {
            const existingSubCategory = await SubCategory.findOne({
                _id: subCategoryId,
                isDeleted: false
            });

            if (!existingSubCategory) {
                return sendResponse(req, res, 200, 0, { keyword: "subcategory_not_found", components: {} });
            }

            let updateFields = {};
            if (name) updateFields.name = name;
            if (categoryId) updateFields.categoryId = categoryId;
            if (typeof isActive !== 'undefined') updateFields.isActive = isActive;

            await SubCategory.findByIdAndUpdate(subCategoryId, updateFields);

            return sendResponse(req, res, 200, 1, { keyword: "subcategory_updated", components: {} });
        } catch (err) {
            console.error("Error updating subcategory:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_update_subcategory", components: {} });
        }
    },

    list_category: async (req, res) => {
        try {
            const { page = 1, limit = 10, search } = req.body;
            const skip = (page - 1) * limit;

            let query = { isDeleted: false };

            if (search) {
                query.name = { $regex: search, $options: 'i' };
            }

            const categories = await Category.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            const totalCount = await Category.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            const categoriesWithSubcategories = await Promise.all(
                categories.map(async (category) => {
                    const subcategories = await SubCategory.find({
                        categoryId: category._id,
                        isDeleted: false
                    }).sort({ createdAt: -1 });

                    return {
                        ...category.toJSON(),
                        subcategories
                    };
                })
            );

            const response = {
                totalCount,
                totalPages,
                currentPage: page,
                categories: categoriesWithSubcategories
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching categories with subcategories:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_categories", components: {} });
        }
    },

    list_subcategory: async (req, res) => {
        try {
            const { page = 1, limit = 10, search, categoryId } = req.body;
            const skip = (page - 1) * limit;

            let query = { isDeleted: false };

            if (search) {
                query.name = { $regex: search, $options: 'i' };
            }

            if (categoryId) {
                query.categoryId = categoryId;
            }

            const subcategories = await SubCategory.find(query)
                .populate('categoryId', 'name')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            const totalCount = await SubCategory.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            const response = {
                totalCount,
                totalPages,
                currentPage: page,
                subcategories: subcategories.map(subcategory => ({
                    ...subcategory.toJSON(),
                    categoryName: subcategory.categoryId ? subcategory.categoryId.name : null
                }))
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, response);
        } catch (err) {
            console.error("Error fetching subcategories:", err);
            return sendResponse(req, res, 500, 0, { keyword: "failed_to_fetch_subcategories", components: {} });
        }
    }
};

module.exports = category_controller;