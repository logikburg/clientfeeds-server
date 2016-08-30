/*
    author : sandeep.mogla@gmail.com
*/
var express = require('express');
var mongodb = require('mongodb');
var bodyParser = require("body-parser");
var jwt = require("jsonwebtoken");
var fs = require("fs");

var config = require('./config'); // get our config file

// Retrieve
var mgoClient = mongodb.MongoClient;

// initialize the express module
var app = express();

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());


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

app.use('/api/authenticate', function(req, res, next) {
    var username = req.body.username;
    var password = req.body.password;

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
                    data: "invalid user"
                });
            }
        }
    });
});

app.use(function(req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // Pass to next layer of middleware

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
                    message: 'Failed to authenticate token.'
                });
            } else {
                // if everything is good, save to request for use in other routes
                req.decoded = decoded;
                next();
            }
        });

    } else {
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
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

apiRoutes.post('/getlatest', function(req, res) {
    console.log("/getlatest");

    console.log("req.decoded :: " + req.decoded.username);
    var uname = req.decoded.username;

    colUsers.findOne({
        username: uname
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

apiRoutes.post('/signup', function(req, res) {
    var username = req.body.username;
    var okUsername = isValidChars(username) ? true : false;

    var password = req.body.password;
    var okPass = isValidPasswordChars(password) ? true : false;

    var repassword = req.body.repassword;
    var okRePass = isValidPasswordChars(repassword) ? true : false;

    var secret = req.body.secret;
    var okSecret = isValidChars(secret) ? true : false;

    var email = req.body.email;
    var okRePass = isValidPasswordChars(repassword) ? true : false;

    var location = req.body.location;
    var okLocation = isValidPasswordChars(repassword) ? true : false;

    var workExp = req.body.workExp;
    var okWorkExp = isValidChars(workExp) ? true : false;

    var mobile = req.body.mobile;
    var okMobile = isValidMobile(mobile) ? true : false;

    var isValidPasswordChars = function(value) {
        var regex = /^[0-9A-Za-z!#@\$%&]+$/g;
        return regex.test(value);
    }

    var isValidEmail = function(value) {
        var regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        return regex.test(value);
    }

    var isValidChars = function(value) {
        var regex = /^[0-9A-Za-z.@]+$/g;
        return regex.test(value);
    }

    var isLocationValid = function(value) {
        return regex.test(value);
    }

    var isMobileValid = function(value) {
        var regex = /^\d{10}$/;
        return regex.test(value);
    }
});


apiRoutes.post('/setprofile', function(req, res) {


});

// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes);

var server = app.listen(8081, function() {
    var host = server.address().address;
    var port = server.address().port;
    console.log("listening at http://%s:%s", host, port);
});