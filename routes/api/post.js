var express = require("express");
var router = express.Router();
var app = express();
const bcrypt = require("bcrypt"); // Ensure bcrypt is installed
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const crypto = require('crypto'); // For generating token
const nodemailer = require('nodemailer'); // For sending emails
var requestIp = require('request-ip');
const cookieParser = require('cookie-parser'); // Required if you're using cookies for CSRF
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { request } = require('undici');
require('dotenv').config()
const paypal = require('paypal-rest-sdk');
const axios = require('axios');
const { fail } = require("assert");
const VirtfusionAdmin = require('../api/virtfusion');
// console.log(VirAdmin)
paypal.configure({
    'mode': 'sandbox', // يمكنك تغييره إلى 'live' للإنتاج
    'client_id': process.env.paypal_client_id, // استبدل هذا بـ Client ID الخاص بك
    'client_secret': process.env.paypal_client_secret // استبدل هذا بـ Client Secret الخاص بك
});

const db = mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database
});

const secret = process.env.secret; // Generate a random 32-byte secret

db.connect(err => {
    if (err) throw err;
    console.log('[+] Api Posting System has successfuly connected to the database');
});


// Your existing login route
router.post('/login', async(req, res) => {
    const { username, password, remember_me, recaptchaToken } = req.body;
    // Verify the reCAPTCHA response
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.secretKey}&response=${recaptchaToken}`;

    try {
        const response = await axios.post(verificationUrl);
        const { success } = response.data;
        if (success) {
            db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
                if (err) return res.json({ success: false, message: 'Database error' });

                if (results.length === 0) {
                    API.Log("account_login_not_found", `[${username}] شخص حاول تسجيل الدخول بالستخدام يوزر غير موجود`, "NAN")
                    return res.json({ success: false, message: 'لم يتم العثور على الحساب' });
                }

                const user = results[0];

                if (user.is_active === 0) {
                    API.Log("account_login_not_active", `[${username}] شخص حاول تسجيل الدخول الى حسابة الغير مفعل`, user.id)
                    return res.json({ success: false, message: "not_active_disable" });
                }

                bcrypt.compare(password, user.password, (err, match) => {
                    if (err) return res.json({ success: false, message: 'Error comparing passwords' });

                    if (match) {
                        // Successful login logic...

                        API.Log("account_loggedin_verify_checking", `[${username}] تم تسجيل الدخول جاري التحقق من التفعيل`, user.id)
                        req.session.verify = user
                        req.session.verify.remember_me = remember_me
                        return res.json({ success: true, message: "not_active" });
                    } else {
                        API.Log("account_login_pass_not_match", `[${username}] شخص حاول تسجيل الدخول بالستخدام اليوزر`, user.id)
                        return res.json({ success: false, message: 'كلمة المرور ليست صحيحة' });
                    }
                });
            });
        } else {
            // The reCAPTCHA was not verified
            return res.json({ success: false, message: 'يرجى التأكيد من انك لست روبوت' });
        }
    } catch (error) {
        return res.json({ success: false, message: 'خطأ أثناء التحقق من reCAPTCHA.' });
    }


});


router.post("/logout", (req, res) => {
    // Destroy the session
    const username = req.session.user.username
    const id = req.session.user.id
    req.session.destroy((err) => {
        if (err) {
            return res.json({ success: false, message: 'Failed to log out' });
        }
        API.Log("account_logout", `[${username}] سجل الخروج من الموقع`, id)
            // Clear the cookie if you want to ensure it’s removed from the client side
        res.clearCookie('connect.sid'); // replace 'connect.sid' if your session cookie name is different
        res.clearCookie('remember_me');
        // Optionally redirect the user or return a success message
        return res.json({ success: true, message: 'تم تسجيل الخروج بنجاح, يتم اعادة توجيهك' });

    });
});

router.post("/verification", (req, res) => {
    const { code } = req.body;
    console.log(req.session.verify)
    const query = `SELECT * FROM users where username='${req.session.verify.username}'`; // Query to get all servers
    db.query(query, async(err, results) => {
        if (err) {
            return res.json({ success: false, message: 'حدثت مشكلة الرجاء المحاولة مرة اخرى لاحقا' });
        }

        if (Number(code) != Number(results[0].verification_token)) {
            return res.json({ success: false, message: 'الرمز المدخل خاطئ الرجاء المحاولة مجددا' });
        }
        let isver = await isVerificationTokenExpired(results[0])
        if (isver) {
            return res.json({ success: false, message: 'الرمز المدخل منتهي' });
        }

        if (req.session.verify.remember_me == "true") {
            const token = jwt.sign({ username: req.session.verify.username }, secret, { expiresIn: '15d' }); // Token valid for 15 days
            res.cookie('remember_me', token, { httpOnly: true, maxAge: 15 * 24 * 60 * 60 * 1000 }); // Set the cookie for 15 days
        }
        db.query(`UPDATE users SET verification_token_active_expires = ?, verification_token_expires = ?, verification_token = ?  WHERE username = ?`, [null, null, null, req.session.verify.username], (err) => {
            if (err) throw err;
        });

        req.session.user = req.session.verify;

        return res.json({ success: true, message: 'تم تسجيل دخولك بنجاح, يتم اعادة توجيهك' });
    })
});

const transporter = nodemailer.createTransport({
    service: 'gmail', // Specify 'gmail' or any other supported service
    auth: {
        user: 'mdrkpop3@gmail.com', // Your email
        pass: 'efgvkigyyezafuop' // App-specific password
    }
});

router.post("/register", (req, res) => {
    const { email, username, password } = req.body;

    // Validate that all fields are filled
    if (!email || !username || !password) {
        return res.json({ success: false, message: 'All fields are required' });
    }

    // Check if the username or email already exists
    db.query("SELECT * FROM users WHERE username = ? OR email = ?", [username, email], (err, results) => {
        if (err) return res.json({ success: false, message: 'Database error' });

        if (results.length > 0) {
            return res.json({ success: false, message: 'الايميل او اسم المستخدم موجود بالفعل' });
        }

        // Hash the password before storing it
        bcrypt.hash(password, 10, async(err, hash) => {
            if (err) return res.json({ success: false, message: 'Error hashing password' });

            // Default values for other fields
            const role = 'user'; // Default role
            const plan = 'free'; // Default plan
            const is_active = 1; // Default inactive, pending email verification
            const flags = 0; // Default flags
            const ip_address = requestIp.getClientIp(req); // on localhost > 127.0.0.1
            const verification_token = crypto.randomBytes(32).toString('hex'); // Generate a random 32-byte secret

            const VirtUser = await VirtfusionAdmin.VirAdmin.CreateUser({
                admin: false,
                selfService: 3,
                selfServiceHourlyGroupProfiles: [],
                selfServiceResourceGroupProfiles: [],
                selfServiceHourlyResourcePack: null,
                name: username,
                email: email,
                timezone: 'Europe/London',
                suspended: false,
                twoFactorAuth: false,
                password: password
            })

            console.log(VirtUser)
                // Insert the new user into the database
            const sql = `INSERT INTO users (id, email, username, password, role, is_active, flags, ip_address, created_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
            db.query(sql, [VirtUser.data.id, email, username, hash, role, is_active, flags, ip_address, verification_token], (err, result) => {
                if (err) return res.json({ success: false, message: 'Error inserting user ' + ip_address });

                db.query("SELECT * FROM users WHERE username = ?", [username], (err, results) => {
                    if (err) return res.json({ success: false, message: 'Error fetching user after registration' });

                    SendEmailVerify(req, res, results[0], true)
                        // API.Log("register_success", `[${req.session.user.username}] تم انشاء حساب`)
                        // return res.json({ success: true, message: 'تم انشاء الحساب بنجاح, يتم توجيهك لصفحة الرئيسية الان' });
                    req.session.verify = results[0];

                    return res.json({ success: true, message: 'تم ارسال رسالة التفعيل الى الايميل' });
                });
            });
        });
    });
});


const isVerificationTokenExpired = async(user) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM users WHERE username = ?`;

        db.query(query, [user.username], (err, results) => {
            if (err) {
                console.error("Database Error:", err);
                return resolve(true); // Assume expired if there's an error
            }

            if (results.length === 0 || results[0].verification_token_expires == null) {
                return resolve(true);
            }

            const now = new Date();
            const expirationTime = new Date(results[0].verification_token_expires);
            console.log(now, expirationTime);

            resolve(now > expirationTime);
        });
    });
};

SendEmailVerify = async(req, res, user, newaccount) => {

    let IVTE = await isVerificationTokenExpired(user)
    console.log(IVTE)
    if (IVTE || newaccount) {
        const randomNumbers = generateRandomNumbers();

        const mailOptions = {
            from: 'mdrkpop3@gmail.com',
            to: user.email,
            subject: 'الرجاء توثيق تسجيل دخولك',
            html: `
                <link href="https://fonts.googleapis.com/css?family=Cairo&display=swap" rel="stylesheet">
                
                <div style="font-family: 'Cairo', sans-serif; width: auto; height: auto;">
                    <div style="width: 100%; display: flex;">
                        <div style="width: 30px;">
                            <img src="https://cdn.discordapp.com/attachments/1291780983791554570/1293356652132700180/logo.png?ex=670713bf&is=6705c23f&hm=18b831b99c3fb329591c939ccd0a36f5b712ab9f940bd5ec8b67deca417ed3fe&" style="width: 100%;">
                        </div>
                        <div style="width: auto;">
                            <h1 style="font-size: 18px; padding: 10px; margin: 0;color: rgb(82, 82, 82);">Nova Hosting</h1>
                        </div>
                    </div>
                    <div style="margin-top: 10px; border: 1px solid rgb(199, 199, 199); box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px; background-color: white;">
                        <div style="background: repeating-linear-gradient(-45deg, rgb(108, 142, 214), rgb(108, 142, 214) 5px, rgba(255, 255, 255, 0) 3px, rgba(255, 255, 255, 0) 7px); width: 100%; height: 7px;"></div>
                        <div style="padding: 10px; text-align: right;">
                            <h1 style="font-size: 14px; margin: 5px; padding: 5px; color: rgb(82, 82, 82);">[${user.username}] عزيزي/عزيزتي</h1>
                            <h1 style="font-size: 14px; margin: 5px; padding: 5px; color: rgb(82, 82, 82);">نشكركم على التسجيل في [الاستضافة الذكية]، حيث نقدم لكم خدمات استضافة خوادم عالية الجودة. نحن متحمسون لمساعدتكم في تحقيق أهدافكم التقنية.</h1>
                            <h1 style="font-size: 14px; margin: 5px; padding: 5px; color: rgb(82, 82, 82);">لإكمال عملية تسجيل الدخول وتفعيل حسابكم،الرجاء استعمال رقم التفعيل بالاسفل:</h1>
                            <h1 style="font-size: 14px; margin: 5px; padding: 5px; color: rgb(82, 82, 82);">[<a href="" style="color: rgb(92, 143, 255); text-decoration: none;">${randomNumbers}</a>]</h1>
                            <h1 style="font-size: 14px; margin: 5px; padding: 5px; color: rgb(82, 82, 82);">إذا لم تقم بالتسجيل في [الاستضافة الذكية]، يمكنك تجاهل هذه الرسالة.</h1>
                            <h1 style="font-size: 14px; margin: 5px; padding: 5px; color: rgb(82, 82, 82);">إذا كان لديك أي استفسارات أو تحتاج إلى مساعدة، لا تتردد في التواصل معنا.</h1>
                            <h1 style="font-size: 14px; margin: 5px; padding: 5px; color: rgb(82, 82, 82);">مع أطيب التحيات،</h1>
                            <h1 style="font-size: 14px; margin: 5px; padding: 5px; color: rgb(82, 82, 82);">فريق دعم العملاء</h1>
                            <h1 style="font-size: 14px; margin: 5px; padding: 5px; color: rgb(82, 82, 82);">[<a href="#" style="color: rgb(92, 143, 255); text-decoration: none;">Nova Hosting</a>]</h1>
                        </div>
                    </div>
                </div>
            `
        };

        function generateRandomNumbers() {
            let randomNumber = '';
            for (let i = 0; i < 4; i++) {
                // Generate a random digit between 0 and 9
                const digit = Math.floor(Math.random() * 10);
                randomNumber += digit; // Append digit to the random number string
            }
            return randomNumber;
        }

        // Example usage

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email:', error);
            } else {
                const now = new Date();
                const twoMinutesLater = new Date(now.getTime() + 2 * 60 * 1000);
                const tinMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);

                db.query(`UPDATE users SET verification_token_active_expires = ?, verification_token_expires = ?, verification_token = ?  WHERE username = ?`, [twoMinutesLater, tinMinutesLater, randomNumbers, user.username], (err) => {
                    if (err) throw err;
                });
                req.session.verify.verification_token_active_expires = twoMinutesLater
                req.session.verify.verification_token_expires = tinMinutesLater
                req.session.verify.verification_token = randomNumbers

                console.log('Email sent:', info.response);
            }
        });
    }

}

router.post('/unlink_discord', (req, res) => {
    const { email } = req.body;
    if (!req.session.user) {
        return res.json({ success: false, message: 'لم يتم العثور على الحساب' });
    }

    db.query("UPDATE users SET discord = ? WHERE id = ?", ["", req.session.user.id], (err, result) => {
        if (err) return res.json({ success: false, message: 'Error saving reset token' });
        req.user = null
        req.session.user.discord = null
        API.Log("unlink_discord", `[${req.session.user.username}] الغاء ربط حسابك في الدسكورد بي حسابك في الموقع`, req.session.user.id)
        return res.json({ success: true, message: 'تم الغاء ربط الحساب' });
    });
});

router.post('/unlink_google', (req, res) => {
    const { email } = req.body;
    if (!req.session.user) {
        return res.json({ success: false, message: 'لم يتم العثور على الحساب' });
    }

    db.query("UPDATE users SET google = ? WHERE id = ?", ["", req.session.user.id], (err, result) => {
        if (err) return res.json({ success: false, message: 'Error saving reset token' });
        req.user = null
        req.session.user.google = null
        API.Log("unlink_google", `[${req.session.user.username}] الغاء ربط حسابك في قوقل بي حسابك في الموقع`, req.session.user.id)
        return res.json({ success: true, message: 'تم الغاء ربط الحساب' });
    });
});

router.post('/edituser', (req, res) => {
    const { userid, username, email, selectedrole, selectedstate, freeze } = req.body;
    if (!req.session.user) {
        return res.json({ success: false, message: 'خطاء' });
    }
    if (req.session.user.role != "admin") {
        return res.json({ success: false, message: 'خطاء' });
    }

    db.query("UPDATE users SET username = ?, email = ?, role = ?, is_active = ?, freeze = ? WHERE id = ?", [username, email, selectedrole, selectedstate, freeze, userid], (err, result) => {
        if (err) return res.json({ success: false, message: 'Error saving reset token' });

        API.Log("edit_user", `[${userid}] عدل بيانات الشخص صاحب الايدي [${req.session.user.username}] المسؤول`, req.session.user.id)
        return res.json({ success: true, message: 'تم حفظ التعديل' });
    });
});
router.post("/checkout", async(req, res) => {
    const { plan } = req.body;
    const query = `SELECT * FROM plans where id=${plan}`; // Query to get all servers
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        const create_payment_json = {
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": `${process.env.ssl}://${process.env.domin}/checkout_success?plan=${plan}`, // تعديل الرابط بعد الدفع الناجح
                "cancel_url": `${process.env.ssl}://${process.env.domin}/checkout_error?plan=${plan}` // تعديل الرابط بعد إلغاء الدفع
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": `${results[0].title}`, // اسم المنتج
                        "sku": "001",
                        "price": `${results[0].price}`, // السعر
                        "currency": "USD", // العملة
                        "quantity": 1
                    }]
                },
                "amount": {
                    "currency": "USD",
                    "total": `${results[0].price}`
                },
                "description": `${results[0].title}`
            }]
        };

        paypal.payment.create(create_payment_json, function(error, payment) {
            if (error) {
                return res.json({ success: false, message: error });
            } else {
                // إعادة توجيه المستخدم إلى رابط الدفع
                for (let i = 0; i < payment.links.length; i++) {
                    if (payment.links[i].rel === 'approval_url') {
                        return res.json({ success: true, message: payment.links[i].href });
                    }
                }
            }
        });
    });
})


const API = {
    Webhook: (webhook, msg) => {

    },
    Log: (type, msg, userid) => {
        const sql = `INSERT INTO logs (event_type, message, user_id)
                         VALUES (?, ?, ?)`;
        db.query(sql, [type, msg, userid], (err, result) => {})
    }
}

module.exports = router;

//5ZPYK5PCDDBAP967MPSSY9GF



// // Define the VirtFusion API endpoint and API token
// const apiUrl = 'http://panel.vf1.host/api/v1/users'; // Replace with your VirtFusion URL
// const apiToken = '7e3db1a9a64847f33559c23a5719640a11ffb3e0/rlN1fJngUG0H6uXIYSl229kvWhwLte51h7tmmhioXmfsJgSqDOL2ivq3ws9xLvyzsrvSnzaByt2Wqp6eMzgGWE0kRPLu8C3RiipxbiSnFCiteLV1ERk6BHj5FIDquGiWqtdDCzFIh5btm0Zyg17wIBz20Qj00su4JxaY27UC0O04m1WsrBqGlTf8zUwcxBTOck0bkg42ptKh9o4QnyyLZl1jofP78Hc0dbCK5mav9BDhGJxHIRmLTu2wPd4qWwDAH5uWt1y3CGcL1HJ1asZJwM9iwZnlAlvzr2XcljbpkdbbEmVsZq86FIGPtY7h6TdUZd7Q81FEYOviviwLQN3mlMErU4pYCvAPnHIVVoXPvIsWVKNTDbWJ3PJCmpWJ8zdK2LjtAutTrZ0xF6OR7HoxzEFgCvXPssXPw23IuW9kQe51f6daPnoZJrYtJmdv8iyKYzhJwX8UmMxToKmsAl9tZQivhM8ZGahkW9kMTh38RMPdd9PTMCbg'; // Replace with your API token
// const https = require('https');


// // Define the user data you want to send
// const userData = {
//     id: 2,
//     admin: false,
//     extRelationId: 1,
//     selfService: 3,
//     selfServiceHourlyGroupProfiles: [],
//     selfServiceResourceGroupProfiles: [],
//     selfServiceHourlyResourcePack: null,
//     name: 'Jon Doe',
//     email: 'jon@doe.com',
//     timezone: 'Europe/London',
//     suspended: false,
//     twoFactorAuth: false,
//     created: '2025-01-20T12:41:28.000000Z',
//     updated: '2025-01-20T12:41:28.000000Z',
//     password: '0hPZSAmj8Tgq1noGoenxpxlC9xf1tc'
// };

// // Create an HTTPS agent to disable SSL certificate validation (optional for testing)
// const agent = new https.Agent({
//     rejectUnauthorized: false // Disables SSL verification
// });

// // Function to create a user
// function createUser() {
//     const data = JSON.stringify(userData); // Convert the data to JSON string

//     const options = {
//         hostname: 'panel.vf1.host', // Replace with your VirtFusion URL
//         port: 443, // Default HTTPS port
//         path: '/api/v1/users', // Endpoint to create a user
//         method: 'POST',
//         headers: {
//             'Authorization': `Bearer ${apiToken}`,
//             'Content-Type': 'application/json',
//             'Content-Length': Buffer.byteLength(data) // Ensure the content length is correct
//         }
//     };

//     const req = https.request(options, (res) => {
//         let responseData = '';

//         res.on('data', (chunk) => {
//             responseData += chunk;
//         });

//         res.on('end', () => {
//             console.log('User created successfully:', responseData);
//         });
//     });

//     req.on('error', (error) => {
//         console.error('Error creating user:', error);
//     });

//     // Write the data to the request body
//     req.write(data);

//     // End the request
//     req.end();
// }

// // Call the createUser function
// createUser();