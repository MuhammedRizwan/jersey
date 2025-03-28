const express = require('express');
const session = require('express-session');
const authController = require('../controller/authController');
const {signupController} = require('../controller/signupController');
const loginController = require('../controller/loginController');
const userController = require('../controller/UsersController');
const productController = require('../controller/productController');
const CartController = require('../controller/cartController');
const orderController= require('../controller/orderController')
const couponController=require('../controller/couponController')
const auth = require('../middleware/auth');
const nocache = require('nocache');
const passport = require('passport');
const addressController = require('../controller/addressController');



const userRoutes = express.Router();

userRoutes.use(nocache());

userRoutes.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 180 * 60 * 1000 } // 3 hours
  })
);

userRoutes.use(passport.initialize());
userRoutes.use(passport.session());

// Debug middleware to log session
  
// Signup routes
userRoutes.get('/signUp', auth.isLogout, signupController.displaySingnup);
userRoutes.post('/signUp', auth.isLogout, signupController.manageSignup);

// Landing page route
userRoutes.get('/', auth.isLogout, loginController.displayLandingPage);
userRoutes.get('/user/home', auth.isLogin, userController.loadHome);
userRoutes.get('/search', auth.isLogin, userController.searchProduct);
userRoutes.get('/productDetail/:id', auth.isLogin, productController.loadProductDetail);

// Verification routes
userRoutes.get('/otp-verification', auth.isLogout, signupController.showOtp);
userRoutes.post('/verify-otp', auth.isLogout, signupController.manageOtp);
userRoutes.post('/otp-verification/resent-otp', auth.isLogout, signupController.resentOtp);

// Login routes
userRoutes.get('/login', auth.isLogout, loginController.displayLogin);
userRoutes.post('/login', auth.isLogout, loginController.manageLogin);

// Google Authentication routes
userRoutes.get('/google', auth.isLogout, authController.getGoogleLogin);
userRoutes.get('/auth/google', authController.googleAuth);
userRoutes.get('/auth/google/callback', passport.authenticate('google', {
  successRedirect: '/CreateUser',
  failureRedirect: '/auth/google/failure'
}));

userRoutes.get('/CreateUser', userController.googleSignup);
userRoutes.get('/auth/google/failure', (req, res) => {
  res.send('Failed to authenticate.');
});

// Logout route
userRoutes.get('/logout', auth.isLogin, userController.logout);

// Password reset routes
userRoutes
  .route('/verifyForgetPass')
  .get(auth.isLogout, userController.verifyMail)
  .post(auth.isLogout, userController.verifyforgetPassword);

userRoutes
  .route('/checkOTPpass')
  .get(auth.isLogout, userController.loadForgetPassword)
  .post(auth.isLogout, userController.verifycheckOTPpass);

userRoutes
  .route('/resetpassword')
  .get(auth.isLogout, userController.loadResetPassword)
  .post(auth.isLogout, userController.verifyResetPassword);

userRoutes.get('/shop',auth.isLogin, productController.showShopProduct);
// userRoutes.get('/shop', auth.isLogin,productController.getSortedProducts);


// user profile
userRoutes.get('/myAccount',auth.isLogin, userController.myAccount);
userRoutes.get('/edit-profile/:id',auth.isLogin,userController.editUserProfile);
userRoutes.post('/edit-profile/:id',auth.isLogin,userController.updateProfile);

// Address
userRoutes.get('/add-address/:id',auth.isLogin,addressController.renderAddAddress)
userRoutes.post('/add-address/:id',auth.isLogin,addressController.createAddress)
userRoutes.get('/editAddress/:id',auth.isLogin,addressController.renderEditAddress)
userRoutes.post('/updateAddress/:id',auth.isLogin,addressController.updateAddress)
userRoutes.post('/deleteAddress/:id', auth.isLogin, addressController.deleteAddress);

//cart
userRoutes.get('/cart',auth.isLogin,CartController.loadCart);
userRoutes.post('/add-to-cart',auth.isLogin,CartController.addToCart);
userRoutes.post('/remove-cart',auth.isLogin,CartController.removeFromCart);
userRoutes.post('/increment-cart-item', CartController.incrementCartItemQuantity);
userRoutes.post('/decrement-cart-item', CartController.decrementCartItemQuantity);

//checkout
userRoutes.get('/checkout',auth.isLogin,orderController.loadeCheckout);
// userRoutes.post('/place-order',auth.isLogin,orderController.placeOrder)
userRoutes.post('/checkout/cash-on-delivery',auth.isLogin,orderController.cashOnDelivery)
userRoutes.get("/success-page",auth.isLogin,orderController.orderSuccessfull)

// order
userRoutes.get("/view-order/:orderId",auth.isLogin, userController.ShowOrderDetails);
userRoutes.post('/cancel-order/:orderId', auth.isLogin, orderController.cancelOrder);
userRoutes.post('/user/returnOrder/:orderId',auth.isLogin,orderController.returnOrder)

userRoutes.put('/updateStatus/:orderId',auth.isLogin, orderController.updateOrderStatus);

userRoutes.get('/shop',auth.isLogin, productController.showShopProduct);
userRoutes.get('/password-settings',auth.isLogin, userController.loadPasswordSettings);
userRoutes.post('/reset-password',auth.isLogin, userController.resetPassword);

userRoutes.post("/checkout/razor-pay", auth.isLogin, orderController.razorPayPayment);
userRoutes.post("/checkout/razor-pay/completed", auth.isLogin, orderController.razorpaySuccessfullOrder);
userRoutes.post("/checkout/razor-pay/failed", auth.isLogin, orderController.razorPayFailedOrder);
userRoutes.post("/api/retry-payment/:orderId",auth.isLogin,orderController.retryPayment);
userRoutes.post("/api/payment-success/:orderId",auth.isLogin,orderController.paymentSuccessHandler)

userRoutes.post("/checkout/wallet-payment",auth.isLogin, orderController.walletPayment);


userRoutes.get('/wishlist', auth.isLogin, productController.getWishlist);

userRoutes.post('/wishlist/add', auth.isLogin, productController.addToWishlist);

// Add to Wishlist
userRoutes.post('/wishlist/add', auth.isLogin, productController.addToWishlist);

userRoutes.post('/wishlist/add-to-cart', auth.isLogin, productController.addToCartFromWishlist);


// Remove from Wishlist
userRoutes.post('/wishlist/remove', auth.isLogin, productController.removeFromWishlist);

userRoutes.post('/apply-coupon', auth.isLogin, couponController.applyCoupon)

// oreturnOrder
userRoutes.post('/user/cancelOrder/:orderId',auth.isLogin, orderController.cancelOrder);

userRoutes.get('/invoice', auth.isLogin, orderController.getInvoice);
userRoutes.get('/saveinvoice', auth.isLogin, orderController.downloadInvoice);



module.exports = userRoutes;
