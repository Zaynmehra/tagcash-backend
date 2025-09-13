const mongoose = require('mongoose');

const requestedBrands = new mongoose.Schema({

    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'customers',
        required: [true, 'Customer ID is required']
    },
    brandName: {
        type: String,
        required: [true, 'Brand Name is required'],
        trim: true,
        maxlength: 200
    },
    hasActionTaken: {
        type: Boolean,
        default: false
    },
    isIncluded: {
        type: Boolean,
        default: false
    },
    remark: {
        type: String,
        trim: true,
    },

}, {
    timestamps: true
});

module.exports = mongoose.model('RequestedBrands', requestedBrands);