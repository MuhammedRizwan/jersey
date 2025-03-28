const mongoose = require('mongoose');
const Order = require('../model/orderScheema');
const Cart = require('../model/cartModel');
const Product = require('../model/productModel');
const Address = require('../model/addressSchema');
const Razorpay = require('razorpay');
const Wallet = require('../model/walletScheema')
const Coupon = require('../model/couponModel');
const User=require('../model/userSchema')
const easyinvoice = require("easyinvoice");
const { Readable } = require("stream");
require('dotenv').config();

const RazorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const loadeCheckout = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const cart = await Cart.find({ user_id: user_id });
    const productIds = cart.map((cartItem) => cartItem.product_id);
    const products = await Product.find({ _id: { $in: productIds } });
    const addresses = await Address.find({ user_id: user_id });
    const coupons = await Coupon.find({});
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
    res.render('user/checkout', {
      cart,
      productsMap,
      addresses,
      cartTotal,
      user_id,
      coupons
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const cashOnDelivery = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const formData = req.body.formData;
    const totalPrice = req.body.totalPrice;
    const { address, payment_option } = formData;
    const addressData = await Address.findById({ _id: address });
    const cartItems = await Cart.find({ user_id: user_id });
    const products = await Promise.all(cartItems.map(async (item) => {
      const productData = await Product.findById(item.product_id);
      if (!productData) {
        throw new Error(`Product with ID ${item.product_id} not found`);
      }
      if (!item.size) {
        throw new Error(`Size is missing for product with ID ${item.product_id}`);
      }
      return {
        productId: item.product_id,
        quantity: item.quantity,
        price: productData.salesPrice * item.quantity,
        size: item.size
      };
    }));
    if (totalPrice >= 1000) {
      return res.status(400).json({
        success: false,
        message: "Cash On Delivery is only available for orders under 1000 rupees.",
      });
    }
    const order = new Order({
      user: user_id,
      address: {
        city: addressData.city,
        zipcode: addressData.zipcode,
        streetAddress: addressData.streetAddress,
      },
      products: products.map(product => ({
        productId: product.productId,
        quantity: product.quantity,
        price: product.price,
        size:product.size
      })),
      status: "Pending",
      payment: payment_option,
      totalPrice: totalPrice,
    });
    if (order) {
      await order.save();
      for (const product of order.products) {
        const productId = product.productId;
        const orderedQuantity = product.quantity;
        const productData = await Product.findById(productId);
        if (!productData) {
          return res.status(404).json({
            success: false,
            message: `Product with ID ${productId} not found.`,
          });
        }
        const updateQuantity = productData.quantity - orderedQuantity;
        await Product.findByIdAndUpdate(productId, { quantity: updateQuantity });
      }
      await Cart.deleteMany({ user_id: user_id });
      res.status(200).json({
        success: true,
        message: "Order placed successfully and cart cleared.",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const orderSuccessfull = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const cart = await Cart.find({ user_id: user_id });
    const order = await Order.findOne({ user: user_id }).sort({ createdOn: -1 });
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }
    res.render("user/orderCompleted", {
      title: "Cart",
      cart,
      orderNumber: order.orderNumber,
      totalPrice: order.totalPrice,
      products: order.products,
      createdOn: order.createdOn
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { reason } = req.body;
    const order = await Order.findById(orderId).populate('products.productId');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }
    if (order.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already canceled',
      });
    }
    order.status = 'Cancelled';
    order.failureReason = reason || 'No reason provided';
    await order.save();
    let wallet = await Wallet.findOne({ userId: order.user });
    if (!wallet) {
      wallet = new Wallet({ userId: order.user });
    }
    wallet.balance += order.totalPrice;
    wallet.transactions.push({
      amount: order.totalPrice,
      transactionType: 'credit',
      date: new Date(),
    });
    await wallet.save();
    for (const productItem of order.products) {
      const product = productItem.productId;
      if (product) {
        product.quantity += productItem.quantity;
        await product.save();
      }
    }
    return res.status(200).json({
      success: true,
      message: 'Order canceled successfully, stock updated, and amount credited to wallet.',
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'An error occurred while canceling the order',
    });
  }
};

const loadAdminOrderManagement = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 8;
    const skip = (page - 1) * pageSize;
    const orders = await Order.find({})
      .populate("user")
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(pageSize);
    const totalOrders = await Order.countDocuments({});
    const totalPages = Math.ceil(totalOrders / pageSize);
    res.render("admin/orderManagement", {
      orders,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.log(error.message);
  }
};

const loadAdminOrderView = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const orderData = await Order.findById(orderId)
      .populate("user")
      .populate("products.productId");
    if (!orderData) {
      return res.render("admin/adminOrderView", {
        order: null,
        message: "Order not found"
      });
    }
    res.render("admin/adminOrderView", {
      order: orderData
    });
  } catch (error) {
    console.log(error.message);
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { newStatus } = req.body;
    const order = await Order.findByIdAndUpdate(orderId, { status: newStatus }, { new: true });
    if (!order) {
      return res.status(404).send('Order not found');
    }
    res.redirect(`/admin/orderManagement`);
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

const razorPayPayment = async (req, res) => {
  try {
    const formData = req.body.formData;
    const totalPrice = req.body.totalPrice * 100;
    const options = {
      amount: totalPrice,
      currency: "INR",
      receipt: "order_rcptid_" + new Date().getTime(),
    };
    RazorpayInstance.orders.create(options, (err, order) => {
      if (!err) {
        res.status(200).send({
          success: true,
          message: "Order created successfully",
          order_id: order.id,
          amount: totalPrice,
          key_id: process.env.RAZORPAY_KEY_ID,
          productName: req.body.name,
          name: "Suhail",
          email: "suhailrk910@gmail.com",
          formData,
          currency: options.currency
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Error creating Razorpay order",
        });
      }
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const razorpaySuccessfullOrder = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const { address, payment_option } = req.body.formData;
    const totalPrice = req.body.totalPrice;
    const cartItems = await Cart.find({ user_id: user_id });
    const addressData = await Address.findById({ _id: address });
    const product = cartItems.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
      price: item.totalPrice,
      size: item.size
    }));
    const order = new Order({
      user: user_id,
      address: {
        city: addressData.city,
        zipcode: addressData.zipcode,
        streetAddress: addressData.streetAddress
      },
      products: product.map((product) => ({
        productId: product.productId,
        quantity: product.quantity,
        price: product.price,
        size:product.size
      })),
      status: "Pending",
      payment: payment_option,
      totalPrice: totalPrice,
    })
    if (order) {
      await order.save();
      for (const product of order.products) {
        const productId = product.productId;
        const orderQuantity = product.quantity;
        const productData = await Product.findById(productId);
        if (!productData) {
          return res.status(404).json({ success: false, message: "Product not found" });
        }
        const UpdatedQuantity = productData.quantity - orderQuantity;
        await Product.findByIdAndUpdate(productId, { quantity: UpdatedQuantity });
      }
      await Cart.deleteMany({ user_id: user_id });
      res.status(200).json({ success: true });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const razorPayFailedOrder = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const { address, payment_option } = req.body.formData;
    const failureReason = req.body.failureReason || "Unknown reason";
    const totalPrice = req.body.totalPrice;
    const cartItems = await Cart.find({ user_id: user_id });
    const addressData = await Address.findById({ _id: address });
    const product = cartItems.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
      price: item.totalPrice,
      size: item.size,
    }));
    const order = new Order({
      user: user_id,
      address: {
        city: addressData.city,
        zipcode: addressData.zipcode,
        streetAddress: addressData.streetAddress,
      },
      products: product.map((product) => ({
        productId: product.productId,
        quantity: product.quantity,
        price: product.price,
        size: product.size,
      })),
      status: "Failed",
      payment: "Razorpay",
      totalPrice: totalPrice,
    });
    order.failureReason = failureReason;
    if (order) {
      await order.save();
      res.status(200).json({ success: true, message: "Order saved with Failed status." });
    }
  } catch (error) {
    console.error("Error saving failed order:", error.message);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const retryPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const failedOrder = await Order.findById(orderId);
    if (!failedOrder || failedOrder.status !== "Failed") {
      return res.status(400).json({
        success: false,
        message: "Invalid or non-failed order. Cannot retry payment.",
      });
    }
    const totalPriceInPaise = failedOrder.totalPrice * 100;
    const options = {
      amount: totalPriceInPaise,
      currency: "INR",
      receipt: `retry_${failedOrder._id.toString().slice(-10)}`,
    };
    RazorpayInstance.orders.create(options, async (err, newRazorpayOrder) => {
      if (err) {
        console.error("Error creating Razorpay order:", err);
        return res.status(500).json({
          success: false,
          message: "Error creating Razorpay order for retry.",
        });
      }
      res.status(200).json({
        success: true,
        message: "Retry payment order created successfully",
        razorpayOrderId: newRazorpayOrder.id,
        key_id: process.env.RAZORPAY_KEY_ID,
        amount: totalPriceInPaise,
        currency: "INR",
        orderId: failedOrder._id,
      });
    });
  } catch (error) {
    console.error("Error in retry payment:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error during retry payment",
    });
  }
};

const paymentSuccessHandler = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    order.status = "Completed";
    order.paymentDetails = {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      signature: razorpay_signature,
    };
    await order.save();
    await Cart.deleteMany({ user_id: order.user });
    res.status(200).json({ success: true, message: "Order payment completed successfully and cart cleared." });
  } catch (error) {
    console.error("Error handling payment success:", error.message);
    res.status(500).json({ success: false, message: "Internal server error during payment success handling" });
  }
};

const walletPayment = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const cartItems = await Cart.find({ user_id:userId });
    const products = cartItems.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
      price: item.totalPrice,
      size: item.size
    }));
    const { totalPrice, addressId, paymentMethod } = req.body;
    if (!paymentMethod || !addressId || !totalPrice || !Array.isArray(products) || products.length === 0) {
      console.error("Validation failed:", { paymentMethod, addressId, totalPrice, products });
      return res.status(400).json({ success: false, message: "Incomplete order details or invalid products array." });
    }
    for (const product of products) {
      if (!mongoose.Types.ObjectId.isValid(product.productId) ||
        typeof product.quantity !== 'number' ||
        typeof product.price !== 'number') {
        console.error("Invalid product details:", product);
        return res.status(400).json({ success: false, message: "Invalid product details." });
      }
    }
    const addressData = await Address.findById(addressId);
    if (!addressData) {
      console.error("Address not found:", addressId);
      return res.status(400).json({ success: false, message: "Address not found." });
    }
    const wallet = await Wallet.findOne({ userId: userId });
    if (!wallet || wallet.balance < totalPrice) {
      console.error("Insufficient wallet balance:", wallet.balance, totalPrice);
      return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
    }
    wallet.balance -= totalPrice;
    wallet.transactions.push({
      amount: totalPrice,
      transactionType: "debit",
      date: new Date(),
    });
    await wallet.save();
    const newOrder = new Order({
      user: userId,
      payment: paymentMethod,
      totalPrice: totalPrice,
      products: products,
      status: "Pending",
      address: {
        city: addressData.city,
        zipcode: addressData.zipcode,
        streetAddress: addressData.streetAddress,
      },
    });
    await newOrder.save();
    await Cart.deleteMany({ user_id: userId });
    res.json({ success: true, message: "Order placed successfully." });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ success: false, message: "Server error occurred." });
  }
};

const returnOrder = async (req, res) => {
  const orderId = req.params.orderId;
  const { reason } = req.body;
  try {
    const order = await Order.findById(orderId);
    if (order.status === 'Completed') {
      order.status = 'Returned';
      order.returnReason = reason;
      await order.save();
      let wallet = await Wallet.findOne({ userId: order.user });
      if (!wallet) {
        wallet = new Wallet({ userId: order.user });
      }
      wallet.balance += order.totalPrice;
      wallet.transactions.push({
        amount: order.totalPrice,
        transactionType: 'credit',
        date: new Date(),
      });
      await wallet.save();
      res.json({ success: true, message: 'Order returned and amount credited to wallet.' });
    } else {
      res.json({ success: false, message: 'Order cannot be returned.' });
    }
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'An error occurred while processing the return.' });
  }
};

const getInvoice = async (req, res) => {
  try {
    const orderId = req.query.id;
    const userId = req.session.user_id;
    if (!userId) {
      return res.status(401).send("User not logged in.");
    }
    const userData = await User.findById(userId);
    if (!userData) {
      return res.status(404).send("User not found in the database.");
    }
    const order = await Order.findOne({ _id: orderId, user: userId })
      .populate("address")
      .populate({ path: "products.productId" });
    if (!order) {
      return res.status(404).send("Order not found for the given user.");
    }
    res.render("user/invoicePage", { user: userData, order });
  } catch (error) {
    console.error("Error fetching invoice data:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

const downloadInvoice = async (req, res) => {
  try {
      const orderId = req.query.id;
      const userId = req.session.user_id;
      if (!userId) {
          return res.status(401).send("User not logged in.");
      }
      const order = await Order.findById(orderId)
          .populate({ path: "products.productId", model: "Product" })
          .populate("address");
      if (!order) {
          return res.status(404).json({ success: false, message: "Order not found!" });
      }
      const user = await User.findById(userId);
      const invoiceData = {
        id: orderId,
        total: order.products.reduce(
            (acc, product) => acc + product.price * product.quantity,
            0
        ),
        date: order.createdOn.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        }),
        paymentMethod: order.payment,
        orderStatus: order.status,
        name: `${order.address.firstName || "N/A"} ${order.address.lastName || ""}`,
        number: order.address.mobile || "N/A",
        house: order.address.streetAddress,
        pincode: order.address.zipcode,
        town: order.address.city,
        state: order.address.state || "N/A",
        products: order.products.map((product) => ({
            description: `${product.productId.productName || "Unknown Product"} (Size: ${product.size || "N/A"})`,
            quantity: product.quantity,
            price: product.price,
            total: product.price * product.quantity,
            "tax-rate": 0,
        })),
        sender: {
            company: "Shope...y",
            address: "Malappuram Highway",
            city: "Malappuram",
            country: "India",
        },
        client: {
            company: user.name || "N/A",
            zip: order.address.zipcode,
            city: order.address.city,
            address: order.address.streetAddress,
        },
        information: {
            number: `order${order._id}`,
            date: order.createdOn.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            }),
        },
        "bottom-notice": "Happy Shopping and Visit Again!",
    };
      let pdfResult;
      try {
          pdfResult = await easyinvoice.createInvoice(invoiceData);
      } catch (error) {
          console.error("Error generating PDF with easyinvoice:", error);
          return res.status(500).json({ message: "Failed to generate invoice PDF." });
      }
      const pdfBuffer = Buffer.from(pdfResult.pdf, "base64");
      res.setHeader(
          "Content-Disposition",
          `attachment; filename="invoice_${orderId}.pdf"`
      );
      res.setHeader("Content-Type", "application/pdf");
      const pdfStream = new Readable();
      pdfStream.push(pdfBuffer);
      pdfStream.push(null);
      pdfStream.pipe(res);
  } catch (error) {
      console.error("Error in downloadInvoice:", error.message);
      res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  loadeCheckout,
  cashOnDelivery,
  orderSuccessfull,
  cancelOrder,
  loadAdminOrderManagement,
  loadAdminOrderView,
  updateOrderStatus,
  razorPayPayment,
  razorPayFailedOrder,
  retryPayment,
  paymentSuccessHandler,
  razorpaySuccessfullOrder,
  returnOrder,
  walletPayment,
  getInvoice,
  downloadInvoice
}