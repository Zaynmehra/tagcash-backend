const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Challenge title is required'],
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: [true, 'Challenge description is required'],
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
  images: [{
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
  link: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
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
  reward: {
    type: Number,
    min: 0
  },
  rewardType: {
    type: String,
    enum: ['fixed_amount', 'percentage', 'free_product', 'discount_code'],
    default: 'fixed_amount'
  },
  totalParticipationLimit: {
    type: Number,
    min: 1
  },
  perCustomerLimit: {
    type: Number,
    min: 1,
    default: 1
  },
  currentParticipationCount: {
    type: Number,
    default: 0
  },
  requirements: [{
    type: String,
    trim: true,
    maxlength: 300
  }],
  submissionGuidelines: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  participationHistory: [{
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
    participatedAt: {
      type: Date,
      default: Date.now
    },
    submission: {
      type: String, // Could be a URL to their submission
      trim: true
    },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'approved', 'rejected', 'winner', 'rewarded'],
      default: 'submitted'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    }
  }],
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
    enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
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
  participationCount: {
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
    notifyOnParticipation: {
      type: Boolean,
      default: true
    },
    notifyOnCompletion: {
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
  },
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('challenges', challengeSchema);