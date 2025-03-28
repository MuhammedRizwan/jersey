const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema({
  productName: {
    type: String,
    required: true
  },
  popularity: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category"
  },
  regularPrice: {
    type: Number,
    required: true
  },
  salesPrice: {
    type: Number,
    required: true,
  },
  offerPercentage: {
    type: Number,
    default: 0
  },
  offerPrice: {
    type: Number,

  },
  size: {
    type: String,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    required: true
  },
  createdOn: {
    type: Date,
    default: Date.now
  },
  is_active: {
    type: Boolean,
    required: true,
    default: true
  },
  quantity: {
    type: Number,
    required: true
  },
  images: [
    {
      filename: {
        type: String,
        required: true
      }
    }
  ]
});


module.exports = mongoose.model("Product", productSchema);





