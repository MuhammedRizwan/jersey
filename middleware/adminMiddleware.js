const isLogin = async (req, res, next) => {
  try {
    if (req.session.isAdmin) {
      return next();
    } else if (req.session.user_id) {
      return next();
    } else {
      return res.redirect('/admin/adminLogin');
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const isLogout = async (req, res, next) => {
  try {
    if (req.session.isAdmin) {
      return res.redirect('/admin/adminLogin');
    } else if (req.session.user_id) {
      return res.redirect("/home");
    } else {
      return next();
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  isLogin,
  isLogout,
};
