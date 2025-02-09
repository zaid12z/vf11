var express = require("express");
var router = express.Router();
var app = express();
const bcrypt = require("bcrypt"); // Ensure bcrypt is installed
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const crypto = require('crypto'); // For generating token
const nodemailer = require('nodemailer'); // For sending emails
require('dotenv').config()
const VirtfusionAdmin = require('../api/virtfusion');

const db = mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database
});

db.connect(err => {
    if (err) throw err;
    console.log('[+] Api Geting System has successfuly connected to the database');
});

router.get('/servers', (req, res) => {
    const { plan } = req.query;

    const query = `SELECT * FROM plans where plan='${plan}'`; // Query to get all servers
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        // Send the fetched data as JSON

        res.json({ success: true, servers: results });
    });
});

router.get('/allservers', (req, res) => {
    const { plan } = req.query;

    const query = `SELECT * FROM plans`; // Query to get all servers
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        // Send the fetched data as JSON

        res.json({ success: true, servers: results });
    });
});

router.get('/getusers', (req, res) => {
    const query = `SELECT * FROM users WHERE id !='${req.session.user.id}'`; // Query to get all servers
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        // Send the fetched data as JSON
        res.json({ success: true, users: results });
    });
});


router.get('/getuser', (req, res) => {
    const { userid } = req.query;

    const query = `SELECT * FROM users where id=${userid}`; // Query to get all servers
    db.query(query, (err, results) => {
        if (err)
            return res.status(500).json({ success: false, message: 'Database error' });

        if (results.length == 0)
            return res.json({ success: false, message: 'user not found' });

        res.json({ success: true, user: results[0] });
    });
});


router.get('/myservers', (req, res) => {
    const {} = req.query;

    const query = `SELECT * FROM purchases`; // Query to get all servers
    db.query(query, (err, results) => {
        res.json({ success: true, servers: results });
    });
});

router.get('/myserver', (req, res) => {
    const { userid } = req.query;

    const query = `SELECT * FROM purchases where userid="${userid}"`; // Query to get all servers
    db.query(query, (err, results) => {
        res.json({ success: true, servers: results });
    });
});

router.get('/getlogs', (req, res) => {
    const {} = req.query;

    const query = `SELECT * FROM logs`; // Query to get all servers
    db.query(query, (err, results) => {
        res.json({ success: true, logs: results });
    });
});


router.get('/virtplan', async(req, res) => {
    const { plan } = req.query;

    const plans = await VirtfusionAdmin.VirAdmin.GetPackages()
    console.log(plans)
    res.json({ success: true, plans: plans.data });
});

module.exports = router;