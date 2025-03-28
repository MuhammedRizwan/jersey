const User = require("../model/userSchema");

const isLogin = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      const userData = await User.findById(req.session.user_id);

      if (!userData || userData.isBlocked) {
        req.session.destroy((err) => {
          if (err) {
            console.log("Error destroying session:", err);
            return res.status(500).send("Internal Server Error");
          }
          return res.redirect("/");
        });
      } else {
        return next();
      }
    } else {
      return res.redirect("/");
    }
  } catch (error) {
    console.log("Error in isLogin middleware:", error.message);
    return res.status(500).send("Internal Server Error");
  }
};

const isLogout = async (req, res, next) => {
  try {
    if (!req.session.user_id && !req.session.isAdminAuth) {
      return next();
    } else {
      if (req.session.user_id) {
        console.log("User is logged in:", req.session.user_id);
        return res.redirect("/user/home");
      } else {
        return res.redirect("/admin/dashboard");
      }
    }
  } catch (error) {
    return res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  isLogin,
  isLogout
};
