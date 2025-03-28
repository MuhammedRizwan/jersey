const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const nocache = require('nocache');
const passport=require('passport')
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
const crypto = require('crypto');
// const router=require('./router')
const adminRouter=require('./routs/adminRout')
const userRouts=require('./routs/userRouts')

const secretID = crypto.randomBytes(32).toString('hex');

const port = process.env.PORT || 7000;

const db = require('./model/db');
require('dotenv').config();
db();


const User = require('./model/userSchema');

app.use(nocache())

app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'))
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(express.static('uploads'))

// passport middleware

app.use(express.json());

app.use(session({
  secret: secretID,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false
  }
}));


app.use('/',userRouts );
app.use('/admin',adminRouter)


app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
