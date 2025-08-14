const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  challengesname: {
    type: String,
    required: [true, 'Challenge name is required'],
    trim: true,
    maxlength: 200
  },
  challengesimage: {
    type: String,
    default: 'default.png'
  },
  challengesurl: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('challenges', challengeSchema);