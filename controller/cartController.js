const Cart = require("../model/cartModel");
const Product = require("../model/productModel");



const loadCart = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const cart = user_id
      ? await Cart.find({ user_id: user_id })
      : await Cart.find({ user_id: null });

    if (!cart.length) {
      return res.render("user/cart", {
        title: "Cart",
        cart: [],
        productsMap: {},
        cartTotal: 0,
      });
    }

    const product_ids = cart.map((cartItem) => cartItem.product_id);
    const products = await Product.find({ _id: { $in: product_ids } });

    const productsMap = products.reduce((acc, product) => {
      acc[product._id] = product;
      return acc;
    }, {});

    let cartTotal = 0;
    cart.forEach((cartItem) => {
      const product = productsMap[cartItem.product_id];
      if (product) {
        cartTotal += product.salesPrice * cartItem.quantity;
      }
    });

    res.render("user/cart", {
      title: "Cart",
      cart,
      productsMap,  
      cartTotal,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};


const addToCart = async (req, res) => {
  try {
    const { productId, qty } = req.body;
    const user_id = req.session.user_id;
    const productData = await Product.findById(productId);

    if (!productData) {
      return res.status(404).json({ message: "Product not found" });
    }

    let cartData = await Cart.findOne({
      user_id: user_id || null,
      product_id: productId,
    });

    const totalCartQuantity = cartData ? cartData.quantity : 0;
    const totalQuantity = Number(totalCartQuantity) + Number(qty);

    if (totalQuantity > 10) {
      return res.json({ success: false, message: "You cannot add more than 10 items." });
    }

    if (productData.quantity < qty) {
      return res.json({
        success: false,
        message: "Out Of Stock...",
      });
    }

    if (cartData) {
      cartData = await Cart.findOneAndUpdate(
        { user_id: user_id, product_id: productId },
        { $inc: { quantity: Number(qty) } },
        { new: true }
      );
    } else {
      const cart = new Cart({
        product_id: productId,
        quantity: totalQuantity,
        productPrice: productData.salesPrice,
        user_id,
        size:productData.size
      });
      await cart.save();
    }

    productData.quantity -= Number(qty);
    await productData.save();

    res.json({ success: true, message: "Product Added Successfully", newStock: productData.quantity });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};



const removeFromCart = async (req, res) => {
  try {
    const { cartId } = req.body;
    const user_id = req.session.user_id;

    const cartItem = await Cart.findOne({ _id: cartId, user_id: user_id });

    if (!cartItem) {
      return res.json({ success: false, message: "Product not found in cart" });
    }

    const product = await Product.findById(cartItem.product_id);

    product.quantity += cartItem.quantity;
    await product.save();

    const result = await Cart.findOneAndDelete({
      _id: cartId,
      user_id: user_id
    });

    if (result) {
      res.json({ success: true, message: "Product removed from cart" });
    } else {
      res.json({ success: false, message: "Product not found in cart" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};


const incrementCartItemQuantity = async (req, res) => {
  try {
    
    const { productId } = req.body;
    const user_id = req.session.user_id;

    const cartItem = await Cart.findOne({ product_id: productId, user_id: user_id });

    if (!cartItem) {
      return res.json({ success: false, message: "Cart item not found" });
    }

    if (cartItem.quantity >= 10) {
      return res.json({ success: false, message: "You cannot add more than 10 items." });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    if (product.quantity <= 0) {
      return res.json({ success: false, message: "Product is out of stock" });
    }

    await Product.findByIdAndUpdate(
      productId,
      { $inc: { quantity: -1 } },
      { new: true }
    );

    const updatedCartItem = await Cart.findOneAndUpdate(
      { product_id: productId, user_id: user_id },
      { $inc: { quantity: 1 } },
      { new: true }
    );

    res.json({ success: true, newQuantity: updatedCartItem.quantity });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};





const decrementCartItemQuantity = async (req, res) => {
  try {
    const { productId } = req.body;
    const user_id = req.session.user_id;

    const cartItem = await Cart.findOne({ product_id: productId, user_id: user_id, quantity: { $gt: 1 } });

    if (!cartItem) {
      return res.json({ success: false, message: "Cannot decrement below 1" });
    }

    const updatedCartItem = await Cart.findOneAndUpdate(
      { product_id: productId, user_id: user_id, quantity: { $gt: 1 } },
      { $inc: { quantity: -1 } },
      { new: true } 
    );

    await Product.findByIdAndUpdate(
      productId,
      { $inc: { quantity: 1 } },
      { new: true }
    );

    res.json({ success: true, newQuantity: updatedCartItem.quantity });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};




module.exports = {
  loadCart,
  addToCart,
  removeFromCart,
  incrementCartItemQuantity,
  decrementCartItemQuantity
}


