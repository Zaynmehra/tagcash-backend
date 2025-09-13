const mongoose = require('mongoose');

const communication = new mongoose.Schema({
    brandId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'newBrand',
        required: [true, 'Brand ID is required']
    },

    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tagcashAdmins',
        required: [true, 'Admin ID is required']
    },

    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true,
        maxlength: 200
    },

    ticketId: {
        type: String,
        unique: true,
        required: true,
        trim: true
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
        senderName: {
            type: String,
            required: true,
            trim: true
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
        attachments: [{
            filename: {
                type: String,
                trim: true
            },
            fileUrl: {
                type: String,
                trim: true
            },
            fileType: {
                type: String,
                trim: true
            },
            fileSize: {
                type: Number
            }
        }],
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

module.exports = mongoose.model('BrandAdminCommunication', communication);