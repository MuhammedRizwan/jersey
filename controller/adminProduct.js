const Product = require('../model/productModel');

const productController = {};

productController.addProduct = async (req, res) => {
  ("im addpro",req.body)
  try {
    const {
      productName,
      Brand,
      description,
      category,
      RegularPrice,
      salePrice,
      size,
      stock,
      productOffer,
      is_active,
      mainImage,
      relatedImage
    } = req.body;


    
    const newProduct = new Product({
      productName,
      Brand,
      description,
      category,
      RegularPrice,
      salePrice,
      size,
      createdOn: new Date(),
      stock,
      productOffer,
      is_active,
      mainImage,
      relatedImage
    });

    await newProduct.save();

    res.status(201).json({ success: true, message: 'Product added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add product', error: error.message });
  }
};

module.exports = productController;
