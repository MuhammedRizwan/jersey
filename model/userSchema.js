const mongoose = require('mongoose');
const crypto=require('crypto')

let userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true
  },
  password: String,
  isBlocked: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  phonenumber: Number,
  address: [{
    houseaddress: String,
    street: String,
    city: String,
    pincode: Number,
    state: String,
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  referral: String,
  isReferral: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

const User = mongoose.model('User', userSchema);
module.exports = User;
