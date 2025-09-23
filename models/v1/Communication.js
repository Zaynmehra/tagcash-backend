const mongoose = require('mongoose');

const communication = new mongoose.Schema({
    brandIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'newBrand'
    }],

    isAllBrands: {
        type: Boolean,
        default: false
    },

    brandId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'newBrand'
    },

    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true,
        maxlength: 200
    },

    type: {
        type: String,
        enum: ['support', 'complaint', 'inquiry', 'feedback', 'technical', 'billing', 'general'],
        default: 'general',
        required: true
    },

    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },

    status: {
        type: String,
        enum: ['open', 'in_progress', 'pending_brand', 'pending_admin', 'resolved', 'closed'],
        default: 'open'
    },

    messages: [{
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'messages.senderType'
        },
        senderType: {
            type: String,
            required: true,
            enum: ['newBrand', 'tagcashAdmins']
        },
        message: {
            type: String,
            required: [true, 'Message content is required'],
            trim: true,
            maxlength: 2000
        },
        messageType: {
            type: String,
            enum: ['text', 'image', 'file', 'link'],
            default: 'text'
        },
        attachments: {
            type: String,
        },
        isRead: {
            type: Boolean,
            default: false
        },
        readAt: {
            type: Date
        },
        sentAt: {
            type: Date,
            default: Date.now
        },
        isEdited: {
            type: Boolean,
            default: false
        },
        editedAt: {
            type: Date
        }
    }],
}, {
    timestamps: true
});

communication.pre('validate', function () {
    if (!this.isAllBrands && (!this.brandIds || this.brandIds.length === 0) && !this.brandId) {
        this.invalidate('brandIds', 'Either brandIds must be provided or isAllBrands must be true');
    }
});

module.exports = mongoose.model('BrandAdminCommunication', communication);