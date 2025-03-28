const Coupon = require("../model/couponModel");
const Discount = require('../model/discountScema');



// Load the coupon management page
const loadCouponManagement = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = 4; // Number of coupons per page

    const coupons = await Coupon.find({})
      .skip((page - 1) * limit)
      .limit(limit);
      
    const totalCoupons = await Coupon.countDocuments();
    const totalPages = Math.ceil(totalCoupons / limit);

    res.render('admin/couponManagement', { coupons, totalPages, currentPage: page });
  } catch (error) {
    console.log(error.message);
  }
};


const loadAddNewCoupon=async(req,res)=>{
  try{
    res.render("admin/add-new-coupon")
  }catch(error){
    console.log(error.message);
    
  }
}

const generateUniqueCouponCode = async () => {
  const length = 8;  // Length of the coupon code
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;

  // Keep generating codes until a unique one is found
  let isUnique = false;
  while (!isUnique) {
    code = Array.from({ length }, () =>
      characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');

    // Check if the code is unique
    const existingCoupon = await Coupon.findOne({ code });
    if (!existingCoupon) {
      isUnique = true;
    }
  }

  return code;
};




const addCoupon = async (req, res) => {
  try {
    const { name, discount, minimumAmount, maximumAmount, expiryDate } = req.body;

    // Check if coupon name already exists
    const existingNameCoupon = await Coupon.findOne({ name });
    if (existingNameCoupon) {
      return res.status(400).render('admin/add-new-coupon', { message: 'Coupon name already exists.' });
    }

    // Generate a unique code if no code is provided in the request
    const code = req.body.code || await generateUniqueCouponCode();

    // Create a new coupon
    const newCoupon = new Coupon({
      name,
      code,
      discount,
      minimumAmount,
      expiryDate,
      maximumAmount,
    });

    await newCoupon.save();

    // Render success page with SweetAlert
    res.render('admin/add-new-coupon', { message: `Coupon added successfully! Code: ${code}` });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Failed to create coupon.");
  }
};


const editCoupen=async(req, res) => {
  try {
    const couponId = req.query.id;  // Getting the coupon ID from the query string
    const coupon = await Coupon.findById(couponId);  // Fetch the coupon by its ID
    if (!coupon) {
      return res.status(404).send('Coupon not found');
    }
    res.render('admin/editCoupon', { coupon });  // Render the edit page and pass the coupon data
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
}


// Delete a coupon
const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    await Coupon.findByIdAndDelete(couponId);
    res.status(200).json({ message: 'Coupon deleted successfully' }); // Send a JSON response
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: 'Failed to delete the coupon' }); // Send an error response
  }
};


// Update an existing coupon
const updateCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    const { name, code, discount, minimumAmount,maximumAmount, expiryDate } = req.body;

    await Coupon.findByIdAndUpdate(couponId, {
      name,
      code,
      discount,
      minimumAmount,
      maximumAmount,
      expiryDate,
    });
    
    res.redirect('/admin/coupons');
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Failed to update coupon.");
  }
};


const applyCoupon = async (req, res) => {
  try {
    const { couponCode, cartTotal, userId } = req.body; // Assuming userId is passed in the request

    // Find the coupon
    const coupon = await Coupon.findOne({ code: couponCode });
    if (!coupon) {
      return res.json({ success: false, message: "Invalid coupon code" });
    }

    // Check if the coupon is still valid
    const currentDate = new Date();
    if (currentDate > coupon.expiryDate) {
      return res.json({ success: false, message: "Coupon expired" });
    }

    // Check if the minimum amount condition is met
    if (cartTotal < coupon.minimumAmount) {
      return res.json({ success: false, message: `Only allow total is ₹${coupon.minimumAmount}` });
    }
    if(cartTotal>coupon.maximumAmount){
      return res.json({success:false,message:`Only allow total is ₹${coupon.maximumAmount}`})
    }

    // Calculate the discount amount and new total
    const discountAmount = (coupon.discount / 100) * cartTotal;
    const newTotal = cartTotal - discountAmount;

    // Create a new discount record in the Discount collection
    const discountRecord = new Discount({
      discountDate: currentDate,
      offerType: 'coupon',
      couponCode: couponCode,
      offerDeduction: discountAmount, // Store the calculated discount amount
    });

    // Save the discount record
    await discountRecord.save();

    return res.json({ success: true, newTotal, discountAmount });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};


module.exports = {
  loadCouponManagement,
  addCoupon,
  deleteCoupon,
  updateCoupon,
  loadAddNewCoupon,
  editCoupen,
  // CheckCoupon
  applyCoupon,
 
  

  
};
