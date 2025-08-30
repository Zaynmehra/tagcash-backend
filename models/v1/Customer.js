const mongoose = require('mongoose');
const { DEVICE_TYPES, ACCOUNT_STATUS, AUTH_PROVIDERS, MEMBER_TYPES } = require('../../config/constants');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  password: {
    type: String,
    minlength: 6,
    select: false
  },
  profileImage: {
    type: String,
    default: 'default.png'
  },
  instaId: {
    type: String,
    required: [true, 'Instagram ID is required'],
    trim: true,
    unique: true
  },
  instaDetails: {
    followersCount: {
      type: Number,
      default: 0
    },
    followingCount: {
      type: Number,
      default: 0
    },
    profile_pic_url: {
      type: String,
    },
    full_name: {
      type: String,
    },
    postsCount: {
      type: Number,
      default: 0
    },
    memberType: {
      type: String,
      enum: MEMBER_TYPES,
      default: "Starter Member"
    }
  },
  upiId: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  brandVerified: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'newBrand'
  }],
  isTagVerified: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  authProvider: {
    type: String,
    enum: Object.values(AUTH_PROVIDERS),
    default: "email"
  },
  accountStatus: {
    type: String,
    enum: Object.values(ACCOUNT_STATUS),
    default: "pending"
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationOTP: {
    type: String,
    select: false
  },
  emailVerificationOTPExpires: {
    type: Date,
    select: false
  },
  passwordResetOTP: {
    type: String,
    select: false
  },
  passwordResetOTPExpires: {
    type: Date,
    select: false
  },
  passwordChangeOTP: {
    type: String,
    select: false
  },
  passwordChangeOTPExpires: {
    type: Date,
    select: false
  },
  newPasswordTemp: {
    type: String,
    select: false
  },
  emailOtp: {
    type: String,
    select: false
  },
  emailOtpExpiry: {
    type: Date,
    select: false
  },
  isVerifiedPhoneNo: {
    type: Boolean,
    default: false
  },
  phoneOtp: {
    type: String,
    select: false
  },
  phoneOtpExpiry: {
    type: Date,
    select: false
  },
  token: {
    type: String,
    select: false
  },
  refreshToken: {
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
  loginHistory: [{
    deviceInfo: String,
    ipAddress: String,
    location: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('customers', customerSchema);