const Product = require('../model/productModel');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { createCanvas, loadImage } = require('canvas');
const categoryModel = require('../model/categoryModel');
const { default: mongoose } = require('mongoose');
const Wishlist = require('../model/wishlistModel');
const productModel = require('../model/productModel');
const Cart = require("../model/cartModel");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage }).fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'relatedImages', maxCount: 3 }
]);

async function cropImage(imagePath) {
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');
  const image = await loadImage(imagePath);
  ctx.drawImage(image, 0, 0, 200, 200);
  return canvas.toBuffer('image/png');
}

const showAddProductPage = async (req, res) => {
  try {
    const categories = await categoryModel.find({});
    res.render('admin/addProduct', { categories });
  } catch (error) {
    res.status(500).send("Server Error");
  }
};

const createNewProduct = async (req, res) => {
  try {
    const {
      productName,
      description,
      marketPrice,
      salePrice,
      myCategory,
      quantity,
      size
    } = req.body;

    let allImages = [];

    if (req.files.images && req.files.images.length > 0) {
      for (let i = 0; i < req.files.images.length; i++) {
        const originalImage = req.files.images[i];
        const croppedField = `croppedImage${i}`;
        if (req.files[croppedField] && req.files[croppedField].length > 0) {
          allImages.push({ filename: req.files[croppedField][0].filename });
        } else {
          allImages.push({ filename: originalImage.filename });
        }
      }
    }

    const categoryData = await categoryModel.findOne({ _id: myCategory });
    if (!categoryData) {
      return res.status(400).json({ message: "Category not found", success: false });
    }

    const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    if (!validSizes.includes(size)) {
      return res.status(400).json({ message: "Invalid or missing size", success: false });
    }

    const product = new productModel({
      productName,
      description,
      regularPrice: marketPrice,
      salesPrice: salePrice,
      category: categoryData._id,
      quantity,
      images: allImages,
      size
    });

    const productData = await product.save();

    if (productData) {
      return res.status(200).json({ message: "Product added successfully", success: true });
    }

    return res.status(500).json({ message: "Failed to add product.", success: false });
  } catch (error) {
    return res.status(500).json({ message: "An error occurred.", success: false });
  }
};

const loadeditProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = await productModel.findById(id);
    const categories = await categoryModel.find({});
    
    if (productData) {
      res.render("admin/EditProducts", { title: "Edit Product", product: productData, categories });
    } else {
      res.status(404).send("Product not found");
    }
  } catch (error) {
    res.status(500).send("Server Error");
  }
};

const loadProductDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = await productModel.findById(id);

    if (productData) {
      res.render("user/productDetails", { title: "Product Detail", products: productData });
    }
  } catch (error) {
    res.status(500).send("Server Error");
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { productName, description, marketPrice, salePrice, category, quantity, size } = req.body;

    let updatedImages = [];

    if (req.files) {
      if (req.files.images && req.files.images.length > 0) {
        for (let i = 0; i < req.files.images.length; i++) {
          const originalImage = req.files.images[i];
          const croppedField = `croppedImage${i}`;
          if (req.files[croppedField] && req.files[croppedField].length > 0) {
            updatedImages.push({ filename: req.files[croppedField][0].filename });
          } else {
            updatedImages.push({ filename: originalImage.filename });
          }
        }
      }
    }

    const product = await productModel.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found", success: false });
    }

    product.productName = productName;
    product.description = description;
    product.regularPrice = marketPrice;
    product.salesPrice = salePrice;
    product.category = category;
    product.quantity = quantity;
    product.size = size;

    if (updatedImages.length > 0) {
      product.images = updatedImages;
    }

    const updatedProduct = await product.save();

    if (updatedProduct) {
      return res.status(200).json({ message: "Product updated successfully", success: true });
    }

    return res.status(500).json({ message: "Failed to update product.", success: false });
  } catch (error) {
    return res.status(500).json({ message: "An error occurred.", success: false });
  }
};

const toggleManage = async (req, res) => {
  try {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const product = await productModel.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.is_active = !product.is_active;

    if (!product.is_active) {
      product.deleted = true;
    } else {
      product.deleted = false;
    }

    await product.save();

    const products = await productModel.find();

    res.render('admin/Addprd', { products: products });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const showProductManagement = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const products = await productModel.find().skip(skip).limit(limit);

    const totalProducts = await productModel.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    res.render('admin/ProductManagement', {
      products,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch products', error: error.message });
  }
};

const softDelete = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    product.is_active = false;
    await product.save();

    res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

const applyOffer = async (req, res) => {
  const { offerPercentage, productId } = req.body;

  try {
    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const discount = (product.salesPrice * offerPercentage) / 100;
    const newSalesPrice = product.salesPrice - Math.floor(discount);

    product.offerPercentage = offerPercentage;
    product.salesPrice = newSalesPrice;
    product.offerPrice = discount;
    const updatedProduct = await product.save();

    res.json({ success: true, message: 'Offer applied successfully', salesPrice: updatedProduct.salesPrice });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to apply offer', error: error.message });
  }
};

const removeOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await productModel.findById(productId);

    if (product) {
      product.salesPrice += product.offerPrice;
      product.offerPrice = 0;
      product.offerPercentage = 0;

      const updatedProduct = await product.save();

      if (updatedProduct) {
        res.status(200).json({
          success: true,
          message: "Offer successfully removed.",
          salesPrice: updatedProduct.salesPrice
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Error updating product data after removing the offer.",
        });
      }
    } else {
      return res.status(400).json({ success: false, message: "Product not found." });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "An error occurred.", error: error.message });
  }
};

const showShopProduct = async (req, res) => {
  try {
    const { page = 0, sort } = req.query;
    const limit = 4;
    const currentPage = parseInt(page);
    const skip = currentPage * limit;

    let sortCriteria = {};

    if (sort === 'price-asc') {
      sortCriteria = { salesPrice: 1 };
    } else if (sort === 'price-desc') {
      sortCriteria = { salesPrice: -1 };
    } else if (sort === 'new-arrivals') {
      sortCriteria = { createdOn: -1 };
    }

    const totalProducts = await productModel.countDocuments({ is_active: true, quantity: { $gt: 0 } });
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await productModel.find({ is_active: true, quantity: { $gt: 0 } })
      .populate('category')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit);

    const categories = await categoryModel.find();

    res.render('user/shope', {
      products,
      currentPage,
      totalPages,
      categories,
      selectedSort: sort
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch products', error: error.message });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.body.productId;

    if (!userId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, products: [productId] });
    } else if (wishlist.products.includes(productId)) {
      return res.status(400).json({ message: "Product already in wishlist" });
    } else {
      wishlist.products.push(productId);
    }

    await wishlist.save();
    return res.status(200).json({ message: "Product added to wishlist", wishlist });
  } catch (error) {
    return res.status(500).json({ message: "Error adding product to wishlist" });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.body.productId;
    const wishlist = await Wishlist.findOne({ user: userId });

    if (wishlist && wishlist.products.includes(productId)) {
      wishlist.products = wishlist.products.filter(
        (item) => item.toString() !== productId
      );
      await wishlist.save();
      return res.status(200).json({ message: "Product removed from wishlist" });
    } else {
      return res.status(400).json({ message: "Product not found in wishlist" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Error removing product from wishlist" });
  }
};

const getWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;

    if (!userId) {
      return res.status(401).json({ message: 'User not logged in' });
    }

    const wishlist = await Wishlist.findOne({ user: userId }).populate('products');

    if (!wishlist) {
      return res.render('user/wishlist', { wishlistItems: [] });
    }

    return res.render('user/wishlist', { wishlistItems: wishlist.products });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching wishlist' });
  }
};

const addToCartFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.body.productId;
    const qty = 1;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.quantity < qty) {
      return res.status(400).json({ message: "Out of stock" });
    }

    let cartItem = await Cart.findOne({ user_id: userId, product_id: productId });
    if (cartItem) {
      cartItem.quantity += qty;
      if (cartItem.quantity > 10) {
        return res.status(400).json({ message: "You cannot add more than 10 items" });
      }
      await cartItem.save();
    } else {
      const newCartItem = new Cart({
        user_id: userId,
        product_id: productId,
        quantity: qty,
        productPrice: product.salesPrice,
      });
      await newCartItem.save();
    }

    let wishlist = await Wishlist.findOne({ user: userId });
    if (wishlist && wishlist.products.includes(productId)) {
      wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
      await wishlist.save();
    }

    product.quantity -= qty;
    await product.save();

    return res.status(200).json({ success: true, message: "Product added to cart and removed from wishlist" });
  } catch (error) {
    return res.status(500).json({ message: "Error adding product to cart" });
  }
};

module.exports = {
  createNewProduct,
  upload,
  updateProduct,
  toggleManage,
  showProductManagement,
  showAddProductPage,
  softDelete,
  showShopProduct,
  loadeditProduct,
  loadProductDetail,
  addToWishlist,
  addToCartFromWishlist,
  removeFromWishlist,
  getWishlist,
  applyOffer,
  removeOffer
};