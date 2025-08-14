const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID is required']
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: [true, 'Brand ID is required']
  },
  instaId: {
    type: String,
    trim: true
  },
  billNo: {
    type: String,
    trim: true
  },
  billAmount: {
    type: Number,
    required: [true, 'Bill amount is required']
  },
  billUrl: {
    type: String,
    trim: true
  },
  contentUrl: {
    type: String,
    trim: true
  },
  instaContentUrl: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending for approval', 'approved', 'rejected'],
    default: 'pending for approval'
  },
  brandStatusDate: {
    type: Date
  },
  refundClaimDate: {
    type: Date
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundStatus: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed'],
    default: 'pending'
  },
  brandRefundStatus: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed'],
    default: 'pending'
  },
  brandRefundDate: {
    type: Date
  },
  refundDate: {
    type: Date
  },
  likes: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  metaFetch: {
    type: String
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('bills', billSchema);