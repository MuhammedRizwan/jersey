const passport=require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Google_clitent_id ="33777195430-gsorq5phsjfd11jpc1669echq639ougq.apps.googleusercontent.com"
const Google_clitent_secret="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"

// Google OAuth config
passport.use(new GoogleStrategy({
  clientID: Google_clitent_id,
  clientSecret: Google_clitent_secret,
  callbackURL: "http://localhost:7000/auth/google/callback",
  passReqToCallback: true,
},
  function (request, accessToken, refreshToken, profile, done) {
    return done(null, profile);
  }
));
passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});


const isLogdedin=(req,res,next)=>{
  res.user?next():res.sendStatus(401)
}

const getGoogleLogin=async(req,res)=>{
  res.send(`<a href="/auth/google">Authenticate with Google</a>`)
 
}
const googleAuth=passport.authenticate('google',{scope:['email','profile']})


module.exports={
  getGoogleLogin, 
  googleAuth,
  isLogdedin
  
}