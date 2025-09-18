const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Offer title is required'],
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: [true, 'Offer description is required'],
    trim: true,
    maxlength: 1000
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: 150
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'newBrand',
    required: [true, 'Brand is required']
  },
  brandName: {
    type: String,
    required: true,
    trim: true
  },
  offerType: {
    type: String,
    enum: ['percentage', 'fixed_amount', 'buy_one_get_one', 'free_items',],
    required: [true, 'Offer type is required']
  },
  discountValue: {
    type: Number,
    min: 0
  },
  maxDiscountAmount: {
    type: Number,
    min: 0
  },
  minimumPurchaseAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  offerCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    maxlength: 20
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  totalUsageLimit: {
    type: Number,
    min: 1
  },
  perCustomerLimit: {
    type: Number,
    min: 1,
    default: 1
  },
  currentUsageCount: {
    type: Number,
    default: 0
  },
  targetAudience: {
    type: String,
    enum: ['all', 'verified_only', 'new_customers', 'returning_customers', 'specific_customers', 'followers_range'],
    default: 'all'
  },
  verifiedCustomersOnly: {
    type: Boolean,
    default: false
  },
  specificCustomers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'customers'
  }],
  minFollowersRequired: {
    type: Number,
    min: 0,
    default: 0
  },
  maxFollowersAllowed: {
    type: Number,
    min: 0
  },
  targetCategories: [{
    type: String,
    trim: true
  }],
  targetLocations: [{
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    }
  }],
  offerImages: [{
    url: {
      type: String,
      trim: true
    },
    alt: {
      type: String,
      trim: true,
      maxlength: 200
    },
    type: {
      type: String,
      enum: ['banner', 'thumbnail', 'detail', 'social_media'],
      default: 'banner'
    }
  }],
  bannerImage: {
    type: String,
    trim: true
  },
  termsAndConditions: [{
    type: String,
    trim: true,
    maxlength: 500
  }],
  requirements: [{
    type: String,
    trim: true,
    maxlength: 300
  }],
  redemptionProcess: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  redemptionLocation: {
    type: String,
    enum: ['online', 'in_store', 'both'],
    default: 'both'
  },
  applicableItems: [{
    name: {
      type: String,
      trim: true,
      maxlength: 200
    },
    category: {
      type: String,
      trim: true
    },
    isExcluded: {
      type: Boolean,
      default: false
    }
  }],
  usageHistory: [{
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'customers',
      required: true
    },
    customerName: {
      type: String,
      trim: true
    },
    customerInstaId: {
      type: String,
      trim: true
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    orderAmount: {
      type: Number,
      min: 0
    },
    discountApplied: {
      type: Number,
      min: 0
    },
    redemptionMethod: {
      type: String,
      enum: ['online', 'in_store', 'phone', 'app']
    },
    status: {
      type: String,
      enum: ['used', 'pending', 'expired', 'cancelled'],
      default: 'used'
    }
  }],
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isFlashSale: {
    type: Boolean,
    default: false
  },
  socialMediaRequirements: {
    requireInstagramPost: {
      type: Boolean,
      default: false
    },
    requireStoryMention: {
      type: Boolean,
      default: false
    },
    requireBrandTag: {
      type: Boolean,
      default: false
    },
    requiredHashtags: [{
      type: String,
      trim: true
    }],
    minimumViews: {
      type: Number,
      min: 0,
      default: 0
    },
    minimumLikes: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'expired', 'cancelled'],
    default: 'draft'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  },
  clickCount: {
    type: Number,
    default: 0
  },
  shareCount: {
    type: Number,
    default: 0
  },
  conversionRate: {
    type: Number,
    default: 0
  },
  notificationSettings: {
    notifyOnUsage: {
      type: Boolean,
      default: true
    },
    notifyOnExpiry: {
      type: Boolean,
      default: true
    },
    reminderDays: {
      type: Number,
      default: 1
    }
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvalNotes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  autoExpire: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Offers', offerSchema);