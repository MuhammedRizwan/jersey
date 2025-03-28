const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const moment = require("moment");

const generateOrderNumber = () => {
  const prefix = "ORD"; 
  const randomNum = Math.floor(100000 + Math.random() * 900000); 
  return `${prefix}-${randomNum}`;
};

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderNumber: {
    type: String,
    default: generateOrderNumber,
    unique: true,
  },
  address: {
    city: {
      type: String,
      required: true,
    },
    zipcode: {
      type: Number,
      required: true,
    },
    streetAddress: {
      type: String,
      required: true,
    },
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      size: {
        type: String,
        enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        required: true},
      returnStatus: {
        type: String,
        enum: ['Not Returned', 'Returned'],
        default: 'Not Returned',
      },
      returnReason: {
        type: String,
        default: "",
      },
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending','Failed', 'Returned','Processing', 'Shipped', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
  failureReason: {
    type: String,
    default: "",
},
  payment: {
    type: String,
    enum: [ 'Razorpay', 'Cash on Delivery', 'Wallet'],
    default: 'Credit Card',
  },
  date: {
    type: String,
    default: () => moment().format("ddd, MMM D, YYYY, h:mmA"),
  },
  createdOn: {
    type: Date,
    default: new Date(),
  },
});


module.exports = mongoose.model("Orders", orderSchema);
