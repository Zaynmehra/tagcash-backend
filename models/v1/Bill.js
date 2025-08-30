const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'customers',
    required: [true, 'Customer ID is required']
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'newBrand',
    required: [true, 'Brand ID is required']
  },
  paymentType: {
    type: String,
    enum: ['upload bill', 'pay now'],
    required: [true, 'Payment type is required']
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
  contentType: {
    type: String,
    enum: ['post', 'story', 'reel'],
    default: 'reel'
  },
  contentUrl: {
    type: String,
    trim: true
  },
  instaContentUrl: {
    type: String,
    trim: true
  },
  razorpayOrderId: {
    type: String,
    trim: true
  },
  razorpayPaymentId: {
    type: String,
    trim: true
  },
  razorpaySignature: {
    type: String,
    trim: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending for approval', 'upload content', 'approved', 'rejected'],
    default: 'upload content'
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
  conversation: [{
      remark: String,
      reply: String,
  }],
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

module.exports = mongoose.model('billing', billSchema);