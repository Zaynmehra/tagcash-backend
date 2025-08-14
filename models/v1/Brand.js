const mongoose = require('mongoose');
const { DEVICE_TYPES } = require('../../config/constants');

const brandSchema = new mongoose.Schema({
  // Basic Brand Information
  brandname: {
    type: String,
    required: [true, 'Brand name is required'],
    trim: true,
    maxlength: 100
  },
  managername: {
    type: String,
    required: [true, 'Manager name is required'],
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
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false
  },

  brandlogo: {
    type: String,
    default: 'brandlogo.jpeg'
  },

  brandurl: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
  },
  about: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: 200
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100
    },
    state: {
      type: String,
      trim: true,
      maxlength: 100
    },
    country: {
      type: String,
      trim: true,
      maxlength: 100
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: 20
    },
    fullAddress: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  location: {
    lat: {
      type: String,
    },
    lon: {
      type: String,
    }
  },

  category: {
    type: String
  },
  subcategory: {
    type: String
  },
  
  rateOfTwo: {
    type: Number,
    min: 0,
    description: 'Average charges for two persons'
  },
  paymentType: {
    type: String,
    enum: ['Escrow', 'Prepaid']
  },
  
  // Must Try Items
  mustTryItems: [{
    name: {
      type: String,
      trim: true,
      maxlength: 200
    },
    link: {
      type: String,
      trim: true
    },
    image: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      min: 0
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    }
  }],
  
  // Brand Guidelines
  brandGuidelines: [{
    type: String,
    trim: true,
    maxlength: 500
  }],
  
  // Influencer Requirements
  minimumFollowers: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Policies
  viewAndRefund: {
    policy: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    refundPercentage: {
      type: Number,
      min: 0,
      max: 100
    },
    refundDays: {
      type: Number,
      min: 0,
      default: 7
    }
  },
  procedure: {
    type: String,
    trim: true,
    maxlength: 2000,
    description: 'Brand collaboration procedure'
  },
  
  // Challenges/Events
  tryThisOut: [{
    title: {
      type: String,
      trim: true,
      maxlength: 200
    },
    images: [{
      type: String,
      trim: true
    }],
    link: {
      type: String,
      trim: true
    },
    about: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    },
    reward: {
      type: Number,
      min: 0
    },
    requirements: [{
      type: String,
      trim: true
    }]
  }],
  
  // Media Assets
  carouselImages: {
    desktop: [{
      url: {
        type: String,
        trim: true
      },
      alt: {
        type: String,
        trim: true,
        maxlength: 200
      }
    }],
    mobile: [{
      url: {
        type: String,
        required: true,
        trim: true
      },
      alt: {
        type: String,
        trim: true,
        maxlength: 200
      }
    }]
  },
  posterImages: [{
    url: {
      type: String,
      trim: true
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200
    },
    type: {
      type: String,
      enum: ['promotion', 'event', 'product', 'general'],
      default: 'general'
    }
  }],
  
  // Status Fields
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
  archive: {
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
  
  // Device Information
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
  
  // Analytics & Performance
  totalCampaigns: {
    type: Number,
    default: 0
  },
  totalInfluencers: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});



module.exports = mongoose.model('Brand', brandSchema);