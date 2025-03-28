const Address = require('../model/addressSchema')

const renderAddAddress = async (req, res) => {
  try {
    const user_id = req.params.id

    res.render('user/addAddress')

  } catch (error) {
    console.log(error.message)
  }
}
const createAddress = async (req, res) => {
  try {
    const user_id = req.params.id
    const {
      firstName,
      lastName,
      city,
      streetAddress,
      state,
      zipcode,
      email,
      phone,
      
    } = req.body;
   
    const addressData = new Address({
      firstName,
      lastName,
      city,
      streetAddress,
      state,
      zipcode,
      email,
      phone,
      user_id
    })
    if (addressData) {
      await addressData.save()
      res.redirect('/myAccount')
    }
  } catch (error) {
    console.log(error)
  }
}

const renderEditAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const address = await Address.findById(addressId);

    if (!address) {
      return res.status(404).send('Address not found');
    }

    res.render('user/editAddress', { address });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server Error');
  }
};

const updateAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const updatedData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      city: req.body.city,
      streetAddress: req.body.streetAddress,
      state: req.body.state,
      zipcode: req.body.zipcode,
      email: req.body.email,
      phone: req.body.phone,
    };

    await Address.findByIdAndUpdate(addressId, updatedData, { new: true });

    res.redirect('/myAccount');
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server Error');
  }
};
const deleteAddress = async (req, res) => {
  try {
      const addressId = req.params.id;
      await Address.findByIdAndDelete(addressId);
      res.status(200).send("Address deleted successfully");
  } catch (error) {
      console.log(error.message);
      res.status(500).send('Server Error');
  }
};




module.exports = {
  createAddress,
  renderAddAddress,
  renderEditAddress,
  updateAddress,
  deleteAddress
}
