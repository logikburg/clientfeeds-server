/*
    author : sandeep.mogla@gmail.com
*/
var express = require('express');
var mongodb = require('mongodb');
var bodyParser = require("body-parser");
var jwt = require("jsonwebtoken");
var fs = require("fs");
var morgan = require('morgan');

var config = require('./config'); // get our config file

// Retrieve
var mgoClient = mongodb.MongoClient;

// initialize the express module
var app = express();
app.use(morgan('dev')); // log every request to the console
//app.use(bodyParser.urlencoded({
//    'extended': 'true'
//}));
// parse various different custom JSON types as JSON 
app.use(bodyParser.json())

// create application/json parser 
var jsonParser = bodyParser.json();
var textParser = bodyParser.text();


var colJobs;
var colUsers;
var colLoginLogs;

// sign with RSA SHA256
var cert = fs.readFileSync('clientfeeds.key'); // get private key

// Connect to the db
mgoClient.connect("mongodb://localhost:27017/jobsDB", function(err, db) {
    if (!err) {
        console.log("database is connected");
        colJobs = db.collection('joblist');
        colUsers = db.collection('userlist');
        colLoginLogs = db.collection('loginLogs');
    }
});

var userModel = new Object();


app.post('/api/signup', textParser, function(req, res) {

    console.log("req.body > " + req.body);

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    // Request headers you wish to allow
    res.setHeader("Access-Control-Allow-Headers", 'Accept, Content-Type');

    //{
    //  "mobile": 9879879879,
    //  "yrsExp": 10,
    //  "location": "jalandhar",
    //  "email":"test@abc.com",
    //  "secret":"2233",
    //  "password":"test",
    //  "repassword":"test",
    //  "username":"test"
    //}

    var _body = JSON.parse(req.body);

    var username = _body.username;
    var okUsername = Util.isValidChars(username) ? true : false;
    console.log("username >  " + username + " >> okUsername >  " + okUsername);

    var password = _body.password;
    var okPass = Util.isValidPasswordChars(password) ? true : false;
    console.log("password >  " + password + " >> okPass >  " + okPass);

    var repassword = _body.repassword;
    var okRePass = Util.isValidPasswordChars(repassword) ? true : false;
    console.log("repassword >  " + repassword + " >> okRePass >  " + okRePass);

    var secret = _body.secret;
    var okSecret = Util.isValidChars(secret) ? true : false;
    console.log("secret >  " + secret + " >> okSecret >  " + okSecret);

    var email = _body.email;
    var okEmail = Util.isValidEmail(email) ? true : false;
    console.log("email > " + email + " >> okEmail >  " + okEmail);

    var yrsExp = _body.yrsExp;
    var okYrsExp = Util.isValidChars(yrsExp) ? true : false;
    console.log("yrsExp >  " + yrsExp + " >> okYrsExp >  " + okYrsExp);

    var mobile = _body.mobile;
    var okMobile = Util.isValidMobile(mobile) ? true : false;
    console.log("mobile >  " + mobile + " >> + okMobile >  " + okMobile);
});

function Util() {}

Util.isValidPasswordChars = function(value) {
    var regex = /^[0-9A-Za-z!#@\$%&]+$/g;
    return regex.test(value);
}

Util.isValidEmail = function(value) {
    var regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return regex.test(value);
}

Util.isValidChars = function(value) {
    var regex = /^[0-9A-Za-z.@]+$/g;
    return regex.test(value);
}

Util.isValidLocation = function(value) {
    return regex.test(value);
}

Util.isValidMobile = function(value) {
    var regex = /^\d{10}$/;
    return regex.test(value);
}

app.post('/api/authenticate', textParser, function(req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    // Request headers you wish to allow
    res.setHeader("Access-Control-Allow-Headers", 'Accept, Content-Type');

    console.log("req.body > " + req.body);

    var _body = JSON.parse(req.body);

    var username = _body.username;
    var password = _body.password;

    // Fetch the document
    colUsers.findOne({
        username: username,
        password: password
    }, function(err, user) {
        if (err) {
            return res.json({
                success: false,
                data: "[colUsers] Error occured : " + err
            });
        } else {
            if (user) {
                // Fetch the document
                userModel.username = req.body.username;
                userModel.password = req.body.password;

                console.log("Token Initialization :");

                userModel.token = jwt.sign(userModel, cert, {
                    expiresIn: "10h" // expires in 24 hours
                });

                console.log(username + "::" + userModel.token);

                colLoginLogs.update({
                    username: username
                }, {
                    time: new Date(),
                    username: username,
                    token: userModel.token
                }, {
                    upsert: true
                }, function(err, records) {
                    if (err) throw err;
                    console.log("Record added as " + records);
                });

                return res.json({
                    success: true,
                    data: userModel.token
                });
            } else {
                return res.json({
                    success: false,
                    data: "invalid user authenticate"
                });
            }
        }
    });
});

app.use(function(req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    // Request headers you wish to allow
    res.setHeader("Access-Control-Allow-Headers", 'x-access-token, accept');

    // check header or url parameters or post parameters for token
    var token = req.headers['x-access-token'];

    //decode token
    if (token) {
        console.log("token :: " + token);
        // sign with RSA SHA256
        var cert = fs.readFileSync('clientfeeds.key'); // get private key
        // verifies secret and checks exp
        jwt.verify(token, cert, function(err, decoded) {
            if (err) {
                console.log("err :: " + err);
                return res.json({
                    success: false,
                    message: 'invalid authenticate token.'
                });
            } else {
                colLoginLogs.findOne({
                    token: token
                }).then(function(obj) {

                    console.log("obj.username > " + obj.username);

                    req.decoded = decoded;
                    req.decoded.username = obj.username;

                    // if everything is good, save to request for use in other routes
                    next();
                }).catch(function(e) {
                    console.log("error > " + e);
                    return res.json({
                        success: false,
                        message: 'error while query data'
                    });
                })
            }
        });

    } else {
        return res.json({
            success: false,
            message: 'no token provided.'
        });
    };
});

// get an instance of the router for api routes
var apiRoutes = express.Router();

apiRoutes.get('/listall', function(req, res) {
    colJobs.find({}, {
        limit: 500,
        sort: [
            ['_id', -1]
        ]
    }).toArray(function(e, results) {
        if (e) return next(e)
        var jsonObj = new Object();
        var dt = new Date();
        jsonObj.group = dt.getFullYear() + "-" + dt.getMonth() + "-" + dt.getDate();
        jsonObj.data = results;
        var json = JSON.stringify(jsonObj);
        res.send(json);
    })
});

apiRoutes.get('/getlatest', function(req, res) {
    console.log("/getlatest");

    var username = req.decoded.username;
    console.log("username > " + username);

    colUsers.findOne({
        username: username
    }).then(function(obj) {
        colJobs.find({
                "tags": {
                    $in: obj.tags
                }
            })
            .toArray(function(e, results) {
                if (e) {
                    console.log("error > " + e);
                    return;
                };

                var jsonObj = new Object();
                jsonObj.data = results;
                var json = JSON.stringify(jsonObj);
                res.send(json);
            });
        console.log("tags > " + obj.tags);
    }).catch(function(e) {
        return res.json({
            success: false,
            message: 'error while query data'
        });
    })

});


apiRoutes.post('/savesetting', function(req, res) {
    console.log("/savesetting");
    return res.json({
        success: true,
        data: 'ok'
    });

});

apiRoutes.post('/logout', function(req, res) {
    console.log("/getlatest");

});

// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes);

var server = app.listen(8081, function() {
    var host = server.address().address;
    var port = server.address().port;
    console.log("listening at http://%s:%s", host, port);
});


// check if username already has assign 
//                colLoginLogs.findOne({
//                    username: username,
//                }, function(err, logUser) {
//                    if (err) {
//                        return res.json({
//                            success: false,
//                            data: "[colLoginLogs] Error occured : " + err
//                        });
//                    } else {
//                        if (logUser) {
//                            console.log("user logged with token : " + logUser.token);
//                            token = logUser.token;
//                            jwt.verify(token, cert, {
//                                algorithms: ['RS256']
//                            }, function(err, decoded) {
//                                if (err) {
//                                    console.log("decoded : " + err) // bar
//                                    return;
//                                }
//                                console.log("decoded : " + decoded) // bar
//
//                            });
//                        } else {
//                            console.log(username + " not user logged in");
//                        }
//                    }
//                });