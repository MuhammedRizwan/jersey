const User = require('../model/userSchema');
const otpgenerator = require('generate-otp');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const Product=require('../model/productModel')

const signupController = {};

async function mail(email, otp) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: "suhailrk910@gmail.com",
      pass: "isok psqe zghs uqeg"
    }
  });

  const html = `<p>Your OTP is: ${otp}</p>`;

  const mailOptions = {
    from: "abc@gmail.com",
    to: email,
    subject: "OTP Verification",
    html: html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error occurred while sending email:", error);
    throw error;
  }
}

signupController.manageSignup = async (req, res) => {
  try {
    const { name, email, phonenumber, password, confirmpassword } = req.body;

    if (!email) {
      return res.status(400).json({ status: 'error', message: 'Email is required' });
    }

    const duplicateUser = await User.findOne({ email });
    if (duplicateUser) {
      return res.status(400).json({ status: 'error', message: 'Email already exists' });
    }

    const otpLength = 6;
    const otp = otpgenerator.generate(otpLength, { digits: true, alphabets: false, specialChars: false });
    console.log(otp);
    if (password !== confirmpassword) {
      return res.status(400).json({ status: 'error', message: 'Passwords do not match' });
    }

    await mail(email, otp);

    req.session.tempUserData = {
      name,
      email,
      phonenumber,
      password,
      otp,
      timestamp: Date.now(),
      expireOtp: 5 * 60 * 1000
    };

    req.session.isSignup = true;
    return res.json({ status: 'success' });
  } catch (error) {
    console.error("Error occurred while managing sign up:", error);
    return res.status(500).json({ status: 'error', message: 'An error occurred. Please try again' });
  }
};

signupController.displaySingnup = (req, res) => {
  try {
    if (!req.session.userActive) {
    return  res.render('user/signUp');
    } else {
     return res.render('user/home');
    }
  } catch (error) {
    console.error("Error occurred while rendering sign up page:", error);
   return res.render('error');
  }
};

signupController.resentOtp = async (req, res) => {
  try {
    if (req.session.tempUserData) {
      const otp = otpgenerator.generate(6, { digits: true, alphabets: false, specialChars: false });
      req.session.tempUserData.otp = otp;

      await mail(req.session.tempUserData.email, otp);

      return res.json({ status: 'success', message: 'OTP resent successfully' });
    } else {
      return res.status(400).json({ status: 'error', message: 'No user data found. Please sign up again' });
    }
  } catch (error) {
    console.error("Error occurred while resending OTP:", error);
    return res.status(500).json({ status: 'error', message: 'An error occurred. Please try again' });
  }
};

signupController.showOtp = (req, res) => {
  try {
    if (req.session.isSignup) {
      return res.render('user/verification');
    } else {
     return  res.redirect('/signUp');
    }
  } catch (error) {
    console.error("Error occurred while rendering OTP verification page:", error);
   return res.render('error');
  }
};

signupController.manageOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const tempUserData = req.session.tempUserData;

    if (!tempUserData) {
      return res.status(400).json({ status: 'error', message: 'Session expired. Please sign up again' });
    }

    const currentTime = Date.now();
    if (currentTime - tempUserData.timestamp > tempUserData.expireOtp) {
      return res.status(400).json({ status: 'error', message: 'OTP expired. Please sign up again' });
    }

    if (otp !== tempUserData.otp) {
      return res.status(400).json({ status: 'error', message: 'Invalid OTP. Please try again' });
    }

    const hashedPassword = await bcrypt.hash(tempUserData.password, 10);

    const newUser = new User({
      name: tempUserData.name,
      email: tempUserData.email,
      phonenumber: tempUserData.phonenumber,
      password: hashedPassword
    });

    await newUser.save();

    req.session.isSignup = false;
    req.session.tempUserData = null;
    req.session.userActive = true;
    req.session.user_id = newUser._id;

const products = await Product.find();

res.render('user/home', { products });

  } catch (error) {
    console.error("Error occurred while verifying OTP:", error);
    return res.status(500).json({ status: 'error', message: 'An error occurred. Please try again' });
  }
};

module.exports = {signupController,mail};
