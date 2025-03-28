const express = require('express');
const adminRouter = express.Router();
const adminauth=require('../middleware/adminMiddleware')
const adminLoginController = require('../controller/adminLoginController');
const productController = require('../controller/productController')
const categoryController = require('../controller/categoryController');
const categoryModel = require('../model/categoryModel');
const UsersController = require('../controller/UsersController');
const orderController = require('../controller/orderController');
const couponController = require('../controller/couponController');
// const auth=require('../middleware/auth')
const path = require('path');
require("dotenv").config();

const admin = express()


const multer = require("multer");
const { auth } = require('google-auth-library');

const uploadFields = [
  { name: 'images', maxCount: 10 },
  { name: 'croppedImage0', maxCount: 1 },
  { name: 'croppedImage1', maxCount: 1 },
  { name: 'croppedImage2', maxCount: 1 }
];

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/uploads");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    },
})

const upload = multer({ storage: storage });


adminRouter.get('/product-management',adminauth.isLogin, productController.showProductManagement);
// adminRouter.get('/product-management', productController.getProduct)
adminRouter.get('/add-product',adminauth.isLogin, productController.showAddProductPage);
// adminRouter.post('/add-product', productController.upload, productController.createNewProduct);

adminRouter.post('/add-product',adminauth.isLogin, upload.fields(uploadFields), productController.createNewProduct);

// editProduct
adminRouter.get('/edit-product/:id',adminauth.isLogin, productController.loadeditProduct);
adminRouter.post('/edit-product/:id',adminauth.isLogin,upload.fields(uploadFields), productController.updateProduct);
adminRouter.delete('/delete-product/:id',adminauth.isLogin, productController.softDelete)

// toogle route
adminRouter.get('/toogle/:id', adminauth.isLogin,productController.toggleManage);

// Admin routes
adminRouter.get('/adminLogin', adminLoginController.renderLoginForm);//show admin login
adminRouter.post('/adminLogin',adminLoginController.login);
adminRouter.get('/adminDashboard',adminLoginController.dashbordRedirect);

// categories
adminRouter.get('/categories', adminauth.isLogin,categoryController.showCategoryPage); // Get all categories
adminRouter.get('/categories/:categoryId',adminauth.isLogin, categoryController.fetchSingleCategory); // Get all categories
adminRouter.get('/addcategories',adminauth.isLogin, categoryController.showAddCategoryPage);
adminRouter.post('/addcategories', adminauth.isLogin,categoryController.addCategory); // Add a new category
adminRouter.put('/categories/:categoryId',adminauth.isLogin, categoryController.updateCategory); // Update a category 
adminRouter.delete('/categories/:categoryId', adminauth.isLogin,categoryController.deleteCategory);
adminRouter.post('/categories/:categoryId/list',adminauth.isLogin, categoryController.listCategory); // List a category
adminRouter.post('/categories/:categoryId/unlist', adminauth.isLogin,categoryController.unlistCategory); // Unlist a category

// get userScheema
adminRouter.get('/users',adminauth.isLogin, UsersController.findUsers);

// Toggle user block/unblock
adminRouter.put('/users/toggle',adminauth.isLogin, UsersController.userToggleManage);


// Admin logout route
adminRouter.get('/logout',adminauth.isLogin,adminLoginController.logout)

adminRouter.get("/orderManagement",adminauth.isLogin, orderController.loadAdminOrderManagement);
adminRouter.get("/view-orderDetails/:orderId",adminauth.isLogin,orderController.loadAdminOrderView);
adminRouter.post('/update-order-status/:orderId',adminauth.isLogin, orderController.updateOrderStatus);

// Display coupon management page
adminRouter.get('/coupons', adminauth.isLogin,couponController.loadCouponManagement);
// Add a new coupon
adminRouter.post('/addCoupon', adminauth.isLogin,couponController.addCoupon);


adminRouter.get("/add-new-coupon",adminauth.isLogin,couponController.loadAddNewCoupon)


adminRouter.get('/edit-coupons',adminauth.isLogin,couponController.editCoupen)
// // Delete a coupon
adminRouter.delete('/deleteCoupon/:id',adminauth.isLogin, couponController.deleteCoupon);

// // Update a coupon
adminRouter.post('/updateCoupon/:id',adminauth.isLogin, couponController.updateCoupon);

// offer applay
adminRouter.post('/apply-offer', adminauth.isLogin,productController.applyOffer);
adminRouter.post('/remove-offer',adminauth.isLogin, productController.removeOffer);

// catagoryOffer
// adminRouter.patch('/applyOffer/:categoryId', categoryController.applyOffer);

adminRouter.patch('/applyOffer/:categoryId',adminauth.isLogin, categoryController.applyOffer);


// Route to remove an offer
// adminRouter.patch('/admin/categories/:categoryId/remove-offer', categoryController.removeOffer);
adminRouter.patch('/categories/:categoryId/remove-offer',adminauth.isLogin, categoryController.removeOffer);



// about sales
adminRouter.get("/salesReport",adminauth.isLogin,adminLoginController.salesReport)
adminRouter.post('/salesReport/download/excel',adminauth.isLogin, adminLoginController.downloadSalesReportExcel);
adminRouter.get("/sales-data",adminauth.isLogin,adminLoginController.saleChart)






// pdfDownload
adminRouter.post('/salesReport/download/pdf', adminauth.isLogin,adminLoginController.downloadSalesReportPDF);


module.exports = adminRouter