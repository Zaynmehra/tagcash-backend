const mongoose = require('mongoose');
const { DEVICE_TYPES } = require('../../config/constants');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false
  },
  profileImage: {
    type: String,
    default: 'default.png'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    type: String,
    select: false
  },
  otpExpires: {
    type: Date,
    select: false
  },
  token: {
    type: String,
    select: false
  },
  deviceName: {
    type: String,
    trim: true
  },
  deviceType: {
    type: String,
    enum: Object.values(DEVICE_TYPES)
  },
  deviceToken: {
    type: String,
    trim: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  permissions: [{
    type: String
  }],
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'moderator'],
    default: 'admin'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('tagcashAdmins', adminSchema);