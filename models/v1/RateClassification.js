const mongoose = require('mongoose');

const requestedBrands = new mongoose.Schema({

    brandId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'newBrand'
    },
    contentType: {
        type: String,
        enum: ['post', 'story', 'reel'],
        default: 'story'
    },
    range:[{
        from :{
             type: Number,
            required: true
        },
        to :{
            type: Number,
            required: true 
        },
        amount:{
            type: Number,
            required: true
        }
    }],
}, {
    timestamps: true
});

module.exports = mongoose.model('RateClassification', requestedBrands);