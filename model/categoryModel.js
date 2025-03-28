const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },

  listed: {
    type: Boolean,
    default: true,
  },
  createdOn:{
    type:Date,
    default:Date.now
  },
  offerPercentage: {
    type: Number,
    default: 0,  
  },
  offerActive: {
    type: Boolean,
    default: false,  
  }
});

module.exports = mongoose.model('Category', categorySchema);
