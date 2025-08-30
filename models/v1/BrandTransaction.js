const mongoose = require('mongoose');

const brandTransact = new mongoose.Schema({
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'newBrand',
    required: [true, 'Brand ID is required']
  },
  amount: {
    type: Number,
    required: [true, 'Bill amount is required']
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
  status: {
    type: String,
    enum: ['pending', 'completed', 'declined'],
    default: 'pending'
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('brandTransact', brandTransact);