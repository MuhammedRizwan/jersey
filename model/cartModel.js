const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { type } = require('os');

const cartSchema = new mongoose.Schema({
  product_id: {
    type: ObjectId,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  category_id: {  
    type: ObjectId,
  },
  productPrice: {
    type: Number,
    required: true
  },  
  user_id: {
    type: ObjectId,
    required: true
  },
  size:{
    type:String,
    required:true
  },
  totalPrice: { 
    type: Number,
    default: 0
  }
});
cartSchema.pre('save', function (next) {
  this.totalPrice = this.quantity * this.productPrice;
  next();
});

module.exports = mongoose.model('Cart', cartSchema)