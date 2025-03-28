const { create } = require('domain');
const { name } = require('ejs');
const mongoose = require('mongoose');
const couponSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  code:{
type:String,
required:true
  },
  discount:{
    type:Number,
    required:true
  },
  minimumAmount:{
    type:Number,
    required:true
  },
  maximumAmount: {
    type: Number, 
    required:true
  },
  createdOn:{
    type:Date,
    default:Date.now
  },
  expiryDate:{
    type:Date,
    required:true
  },
  usedCoupon:[
    {
      user_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
      }
    }
  ]
})

module.exports = mongoose.model('Coupon',couponSchema)