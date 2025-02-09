var express = require("express");
var router = express.Router();
var app = express();
const bcrypt = require("bcrypt"); // Ensure bcrypt is installed
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const crypto = require('crypto'); // For generating token
const nodemailer = require('nodemailer'); // For sending emails
app.use(express.json());
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { type } = require("os");
const { title } = require("process");
const paypal = require('paypal-rest-sdk');
const axios = require('axios');
const VirtfusionAdmin = require('../api/virtfusion');

paypal.configure({
    'mode': 'sandbox', // يمكنك تغييره إلى 'live' للإنتاج
    'client_id': process.env.paypal_client_id, // استبدل هذا بـ Client ID الخاص بك
    'client_secret': process.env.paypal_client_secret // استبدل هذا بـ Client Secret الخاص بك
});
// Define the POST /login route

const db = mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database
});

db.connect(err => {
    if (err) throw err;
});
const secret = "GFSGFSHUHE576^DSFHIUE%QJI#H#FKM@!#!gb21u3hdf"; // Generate a random 32-byte secret

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const User = async(req) => {
    const token = req.cookies.remember_me;
    if (token) {
        // Use a Promise for JWT verification
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(token, secret, (err, decoded) => {
                if (err) return reject(err); // Handle JWT error
                resolve(decoded); // Resolve with the decoded token
            });
        });

        // Query the database for the user
        await new Promise((resolve, reject) => {
            db.query('SELECT * FROM users WHERE username = ?', [decoded.username], (err, results) => {
                if (err) return reject(err); // Handle query error

                if (results.length != 0) {
                    req.session.user = results[0];
                    if (results[0].discord) {
                        req.session.user.discord = JSON.parse(results[0].discord);
                    }
                    if (results[0].google) {
                        req.session.user.google = JSON.parse(results[0].google);
                    }
                }
                resolve(); // Resolve with the decoded token
            });
        });
    }

    await sleep(100);
    return req.session.user;
}

router.get("/", async(req, res, next) => {
    const user = await User(req)


    res.render("home/", {
        req: req,
        page: {
            main: `
            <a href="/">
                الصفحة الرئيسية
            </a>
            <a href="">
                
            </a>
            `
        },
        currentPage: "main"
    });
})

router.get("/home", async(req, res, next) => {
    const user = await User(req)

    res.render("home/index", {
        req: req,
        page: { main: `
        <a href="/">
            الصفحة الرئيسية
        </a>
        <a href="">
            
        </a>
        ` },
        currentPage: "main"
    });
})

router.get("/login", async(req, res, next) => {
    if (req.query.app == "discord") {
        db.query("SELECT * FROM users WHERE JSON_EXTRACT(discord, '$.id') = ?", [req.user.id], (err, results) => {
            if (err) {
                return res.redirect('/login?error=420')
            }

            if (results.length > 0) {
                const user = results[0];
                req.session.user = user;
                if (results[0].discord) {
                    req.session.user.discord = JSON.parse(results[0].discord);
                }
                if (results[0].google) {
                    req.session.user.google = JSON.parse(results[0].google);
                }
                return res.redirect('/')
            } else {
                return res.redirect('/login?error=431')
            }
        });
    } else if (req.query.app == "google") {
        db.query("SELECT * FROM users WHERE JSON_EXTRACT(google, '$.id') = ?", [req.user.id], (err, results) => {
            if (err) {
                return res.redirect('/login?error=420')
            }

            if (results.length > 0) {
                const user = results[0];
                req.session.user = user;
                if (results[0].discord) {
                    req.session.user.discord = JSON.parse(results[0].discord);
                }
                if (results[0].google) {
                    req.session.user.google = JSON.parse(results[0].google);
                }
                return res.redirect('/')
            } else {
                return res.redirect('/login?error=432')
            }
        });
    } else {
        let Notify = null
        if (req.query.error == "431") {
            Notify = {
                type: "error",
                title: "خطاء",
                body: "حساب الدسكورد هاذا غير مربوط بأي حساب لدينا",
                time: 3000
            }
        }
        if (req.query.error == "432") {
            Notify = {
                type: "error",
                title: "خطاء",
                body: "حساب قوقل هاذا غير مربوط بأي حساب لدينا",
                time: 3000
            }
        }

        const user = await User(req)

        if (user) {
            return res.redirect("/");
        }
        res.render("home/login", {
            req: req,
            page: { main: `
            <a href="/">
                الصفحة الرئيسية
            </a> > 
            <a href="/login">
                تسجيل الدخول
            </a>
            ` },
            Notify: Notify,
            currentPage: "login"
        });
    }
})

router.get("/policies", async(req, res, next) => {
    const user = await User(req)

    res.render("home/policies", {
        req: req,
        page: { main: `
        <a href="/">
            الصفحة الرئيسية
        </a> > 
        <a href="/policies">
            سياسات الموقع
        </a>
        ` },
        currentPage: "policies"
    });
})


router.get("/register", async(req, res, next) => {
    const user = await User(req)

    if (user) {
        return res.redirect("/");
    }

    res.render("home/register", {
        req: req,
        page: { main: `
        <a href="/">
            الصفحة الرئيسية
        </a> > 
        <a href="/register">
            انشاء حساب
        </a>
        ` },
        currentPage: "login"
    });
})

router.get("/recover", async(req, res, next) => {
    const user = await User(req)

    if (user) {
        return res.redirect("/");
    }
    res.render("home/recover", {
        req: req,
        page: { main: `
        <a href="/">
            الصفحة الرئيسية
        </a> > 
        <a href="/recover">
            هل نسيت كلمة المرور
        </a>
        ` },
        currentPage: "login"
    });
})

router.get('/get-csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});


router.get("/resetpassowrd", async(req, res, next) => {
    const user = await User(req)

    if (user) {
        return res.redirect("/");
    }

    const resetToken = req.query.token; // Get token from query parameters

    // Check if the token is valid and hasn't expired
    db.query('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?', [resetToken, Date.now()], (err, results) => {
        if (err || results.length === 0) {
            // Token is invalid or expired
            return res.redirect("home/");
        }

        // Token is valid, render the password reset page
        res.render('home/resetpassowrd', {
            req: req,
            page: { main: `
            <a href="/">
                الصفحة الرئيسية
            </a> > 
            <a href="/resetpassowrd">
                استرجاع كلمة المرور
            </a>
            ` },
            currentPage: "login"
        });
    });
})

router.get("/account", async(req, res, next) => {
    const user = await User(req)

    if (req.query.set) {
        if (req.session.user) {
            if (req.user) {
                if (req.user.provider == "google") {


                    db.query(`UPDATE users SET google = ? WHERE username = ?`, [JSON.stringify(req.user), req.session.user.username], (err) => {
                        if (err) return reject(err); // Handle update error
                    });

                    req.session.user.google = req.user;
                    return res.redirect("/account");
                } else {
                    db.query(`UPDATE users SET discord = ? WHERE username = ?`, [JSON.stringify(req.user), req.session.user.username], (err) => {
                        if (err) return reject(err); // Handle update error
                    });
                    req.session.user.discord = req.user;
                    return res.redirect("/account");
                }
            }
        }
    }

    await sleep(300);

    if (!user) {
        return res.redirect("/");
    }

    let Notify = null
    if (req.query.oauth) {
        // Notify = {
        //     type: "success",
        //     title: "نجاح",
        //     body: "تم ربط حساب الدسكورد",
        //     time: 3000
        // }
    }

    res.render("home/account", {
        req: req,
        page: { main: `
        <a href="/">
            الصفحة الرئيسية
        </a> > 
        <a href="/account">
            الحساب
        </a>
        ` },
        currentPage: "account"
    });
})

router.get("/panel/vps", async(req, res, next) => {
    const user = await User(req)

    if (!req.query.id)
        return res.redirect("/")

    let server = await VirtfusionAdmin.VirAdmin.GetServer({
        serverId: req.query.id,
    })

    if (server.msg == "server not found")
        return res.redirect("/")

    server.data.settings.resources.memory = (server.data.settings.resources.memory / 1000).toFixed(0)


    if (req.session.user) {
        res.render("home/panel/vps", {
            server: server,
            req: req,
            page: { main: `
        <a href="/">
            الصفحة الرئيسية
        </a> > 
        <a href="/panel/vps" style="font-family: 'Cairo';">
        </a>
        ` },
            currentPage: ""
        });
    } else {
        res.redirect("/")
    }
})


router.get("/servers/basic-vps", async(req, res, next) => {
    const user = await User(req)

    res.render("home/servers/basic-vps", {
        req: req,
        page: { main: `
        <a href="/">
            الصفحة الرئيسية
        </a> > 
        <a href="/servers/basic-vps">
            الخوادم الاقتصادية
        </a>
        ` },
        currentPage: "basic-vps"
    });
})

router.get("/servers/pro-vps", async(req, res, next) => {
    const user = await User(req)

    res.render("home/servers/pro-vps", {
        req: req,
        page: { main: `
        <a href="/">
            الصفحة الرئيسية
        </a> > 
        <a href="/servers/pro-vps">
            الخوادم الاحترافية
        </a>
        ` },
        currentPage: "pro-vps"
    });
})

router.get("/servers/dedicated-vps", async(req, res, next) => {
    const user = await User(req)

    res.render("home/servers/dedicated-vps", {
        req: req,
        page: { main: `
        <a href="/">
            الصفحة الرئيسية
        </a> > 
        <a href="/servers/dedicated-vps">
            الخوادم الافتراضية
        </a>
        ` },
        currentPage: "dedicated-vps"
    });
})


router.get("/servers/custom-vps", async(req, res, next) => {
    const user = await User(req)

    res.render("home/servers/custom-vps", {
        req: req,
        page: { main: `
        <a href="/">
            الصفحة الرئيسية
        </a> > 
        <a href="/servers/custom-vps">
            انشاء خادمك الخاص
        </a>
        ` },
        currentPage: "custom-vps"
    });
})

router.get('/api/oauth', passport.authenticate('discord-link'))

router.get('/auth/discord/callback', passport.authenticate('discord-link', { failureRedirect: '/' }), (req, res) => {
    return res.redirect('/account?set=1')
});


router.get('/api/oauth_loging', passport.authenticate('discord-login'))

router.get('/auth/login/discord/callback', passport.authenticate('discord-login', { failureRedirect: '/' }), async(req, res) => {
    res.redirect("/login?app=discord")
});

router.get("/admin/controlpanel", async(req, res, next) => {
    const user = await User(req)

    if (!req.session.user) {
        return res.redirect("/")
    } else {
        if (req.session.user.role != "admin") {
            return res.redirect("/")
        }
    }


    res.render("home/admin/controlpanel", {
        req: req,
        page: { main: `
        <a href="/">
            الصفحة الرئيسية
        </a> > 
        <a href="/admin/controlpanel">
            لوحة تحكم الموقع
        </a>
        ` },
        currentPage: "controlpanel"
    });
})
router.get("/paygate", async(req, res, next) => {
    const user = await User(req)

    if (!req.session.user) {
        return res.redirect("/login")
    }


    res.render("home/paygate", {
        req: req,
        page: { main: `
        <a href="/">
            الصفحة الرئيسية
        </a> > 
        <a href="/controlpanel">
            بوابة الدفع
        </a>
        ` },
        currentPage: "paygate"
    });
})

router.get("/verification", async(req, res, next) => {
    const user = await User(req)

    if (req.session.user) {
        return res.redirect('/')
    }
    if (!req.session.verify) {
        return res.redirect('/')
    }

    db.query(`SELECT * FROM users where username=?`, [req.session.verify.username], async(err, results) => {
        if (results.length == 0)
            return res.redirect('/')

        SendEmailVerify(req, res, req.session.verify)

    })

    // if (!req.session.reg) {
    //     return res.redirect('/')
    // }

    return res.render("home/verification", {
        req: req,
        page: { main: `
        <a href="/">
            الصفحة الرئيسية
        </a> > 
        <a href="/login">
            تفعيل الحساب
        </a>
        ` },
        currentPage: "verification"
    });
})

router.get("/contactus", async(req, res, next) => {
    const user = await User(req)

    res.render("home/contactus", {
        req: req,
        page: { main: `
        <a href="/">
            الصفحة الرئيسية
        </a> > 
        <a href="/contactus">
            تواصل 
        </a>
        ` },
        currentPage: "contactus"
    });
})

router.get("/checkout_success", async(req, res, next) => {
    const user = await User(req)

    if (!user) {
        return res.send('Error occurred during payment execution code #4330');
    }

    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;

    db.query(`SELECT * FROM purchases where payid=?`, [req.query.paymentId], (err, results) => {
        if (err) {
            return res.send('Error occurred during payment execution code #4331');
        }

        if (results.length == 0) {
            const query = `SELECT * FROM plans where id=${req.query.plan}`; // Query to get all servers
            db.query(query, (err, results) => {
                if (err) {
                    console.error('Error fetching data:', err);
                    return res.send('Error occurred during payment execution code #4332');
                }

                const execute_payment_json = {
                    "payer_id": payerId,
                    "transactions": [{
                        "amount": {
                            "currency": "USD",
                            "total": results[0].price // نفس السعر المحدد سابقاً
                        }
                    }]
                };


                paypal.payment.execute(paymentId, execute_payment_json, function(error, payment) {
                    if (error) {
                        return res.send('Error occurred during payment execution code #4334');
                    } else {


                        API.CreateVps(user, results[0], (newvps) => {
                            payment.price = results[0].price

                            let date = new Date();

                            let monthsToAdd = 1;

                            date.setMonth(date.getMonth() + monthsToAdd);

                            const sql = `INSERT INTO purchases (userid, payid, pay_data, vps, ip, password, vpsId, expaire)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                            db.query(sql, [user.id, paymentId, JSON.stringify(payment), JSON.stringify(results[0]), newvps.ip, newvps.password, `${newvps.vpsId}`, date], (err, result) => {
                                if (err) return res.json({ success: false, message: 'Error inserting data ' });

                                API.Log("checkout_success", `[${newvps.ip}] الخادم [${results[0].price}] بسعر [${results[0].id}, ${results[0].plan}, '${results[0].title}'] شراء الخطة [${user.username}] الشخص `, user.id)

                                res.render("home/checkout_success", {
                                    req: req,
                                    page: { main: `
                                    <a href="/">
                                        الصفحة الرئيسية
                                    </a> > 
                                    <a href="/">
                                        تم الدفع
                                    </a>
                                    ` },
                                    currentPage: "checkout_success",
                                    payment: payment
                                });
                            })
                        });
                    }
                });
            })
        } else {
            return res.redirect('/')
        }
    });
})

router.get("/checkout_error", async(req, res, next) => {
    const user = await User(req)

    if (req.query.plan) {
        if (!req.session.user) {
            return res.redirect('/')
        }
        const query = `SELECT * FROM plans where id=${req.query.plan}`; // Query to get all servers
        db.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching data:', err);
                return res.send('Error occurred during payment execution code #4332');
            }
            const currentDate = new Date();

            res.render("home/checkout_error", {
                req: req,
                page: { main: `
                <a href="/">
                    الصفحة الرئيسية
                </a> > 
                <a href="/">
                    فشل الدفع
                </a>
                ` },
                currentPage: "checkout_error",
                payment: {
                    price: results[0].price,
                    item: results[0].title,
                    payment_method: "paypal",
                    create_time: currentDate.toLocaleString(),
                }
            });
            API.Log("checkout_error", `[${results[0].price}] بسعر [${results[0].id}, ${results[0].plan}, '${results[0].title}'] فشل في شراء الخطة [${req.session.user.username}] الشخص`, req.session.user.id)
        })

    } else {
        return res.redirect('/')
    }
})

router.get('/api/google_oauth_link', passport.authenticate('goolge-link', {
    scope: ['profile', 'email'] // Scopes you want to request
}));

router.get('/auth/google/link/callback', passport.authenticate('goolge-link', {
    failureRedirect: '/login' // Redirect to login on failure
}), (req, res) => {
    // Successful authentication, redirect to your desired route
    return res.redirect('/account?set=2')
});

router.get('/api/google_oauth_loging', passport.authenticate('goolge-login', {
    scope: ['profile', 'email'] // Scopes you want to request
}));

router.get('/auth/google/login/callback', passport.authenticate('goolge-login', {
    failureRedirect: '/login' // Redirect to login on failure
}), (req, res) => {
    // Successful authentication, redirect to your desired route
    return res.redirect('/login?app=google')
});


const API = {
    Webhook: (webhook, msg) => {

    },
    Log: (type, msg, userid) => {
        const sql = `INSERT INTO logs (event_type, message, user_id)
                         VALUES (?, ?, ?)`;
        db.query(sql, [type, msg, userid], (err, result) => {})
    },
    CreateVps: (user, plan, cb) => {
        cb({
            vpsId: 21323,
            ip: "46.243.78.60",
            password: "435435435"
        })
    }
}

module.exports = router;