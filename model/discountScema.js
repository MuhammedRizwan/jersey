const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  discountDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  offerType: {
    type: String,
    enum: ['coupon', 'category', 'referral'],  
    required: true,
  },
  category: {
    type: String,
    default: null,  
  },
  referralId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  
    default: null,  
  },
  couponCode: {
    type: String,
    default: null,  
  },
  offerDeduction: {
    type: Number,
    required: true,  
  },
});

module.exports = mongoose.model('Discount', discountSchema);
