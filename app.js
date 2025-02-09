var express = require("express");
const bodyParser = require('body-parser');
var path = require("path");
const session = require('express-session');
var app = express();
const csrf = require('csurf');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // Required if you're using cookies for CSRF
app.use(cors({ origin: `${process.env.ssl}://${process.env.domin}/` }));
app.use(cookieParser());
const crypto = require('crypto');
const DiscordStrategy = require('passport-discord').Strategy;
const passport = require('passport');
const secret = crypto.randomBytes(32).toString('hex'); // Generate a random 32-byte secret
require('dotenv').config()
const http = require('http');
const paypal = require('paypal-rest-sdk');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

http.createServer(function(req, res) {
    req.end()
})

// Setup CSRF protection middleware
const csrfProtection = csrf({ cookie: true });
// Apply CSRF protection to specific routes
app.use(csrfProtection);
app.use(express.json());

// Configure session middleware
app.use(session({
    secret: secret, // Replace with a strong secret key
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));
app.set('trust proxy', true)
app.use(passport.initialize());
app.use(passport.session());

app.set("port", process.env.PORT);
app.use(express.static(path.join(__dirname, 'views')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Include the correct routes
app.use("/", require('./routes/web')); // For web routes
app.use("/api", require('./routes/api')); // For API routes
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use('discord-link', new DiscordStrategy({
    clientID: process.env.clientID,
    clientSecret: process.env.clientSecret,
    callbackURL: `${process.env.ssl}://${process.env.domin}/${process.env.callbackURL_link}`,
    scope: ['identify', 'email', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

passport.use('discord-login', new DiscordStrategy({
    clientID: process.env.clientID,
    clientSecret: process.env.clientSecret,
    callbackURL: `${process.env.ssl}://${process.env.domin}/${process.env.callbackURL_login}`,
    scope: ['identify', 'email', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

passport.use('goolge-link', new GoogleStrategy({
    clientID: process.env.google_clientID, // Your Google Client ID
    clientSecret: process.env.google_clientSecret, // Your Google Client Secret
    callbackURL: '/auth/google/link/callback'
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));

}));

passport.use('goolge-login', new GoogleStrategy({
    clientID: process.env.google_clientID, // Your Google Client ID
    clientSecret: process.env.google_clientSecret, // Your Google Client Secret
    callbackURL: '/auth/google/login/callback'
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));

}));

app.listen(app.get("port"), () => {
    console.log(`Server Started at ${app.get("port")}`);
})