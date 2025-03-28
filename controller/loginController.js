const User = require('../model/userSchema');
const Product = require('../model/productModel');
const bcrypt = require('bcrypt');

const loginController = {};

loginController.displayLandingPage = async (req, res) => {
  try {
    if (!req.session.userActive) {
      const products = await Product.find();
      res.render('user/landing', { products });
    } else {
      res.redirect('user/home');
    }
  } catch (error) {
    res.render('error');
    console.error("Error occurred:", error);
  }
};

loginController.displayLogin = async (req, res) => {
  if (!req.session.userActive) {
    res.render('user/login');
  } else {
    res.redirect("/signUp");
  }
};

loginController.manageLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const customer = await User.findOne({ email });

    if (!customer) {
      return res.json({
        success: false,
        errors: { email: "No user found. Please sign up" }
      });
    }

    if (customer.isBlocked) {
      return res.json({
        success: false,
        errors: { email: "Your account has been blocked. Please contact admin" }
      });
    }

    const comparePassword = await bcrypt.compare(password, customer.password);
    if (!comparePassword) {
      return res.json({
        success: false,
        errors: { password: "Password is wrong" }
      });
    }

    customer.lastLogin = new Date(); 
    await customer.save();

    req.session.userActive = true;
    req.session.user_id = customer._id;


    return res.json({ success: true, message: "Login successful" });
  } catch (error) {
    console.error("Error in login:", error);
    return res.json({
      success: false,
      errors: { general: "An error occurred. Please try again" }
    });
  }
};

module.exports = loginController;
