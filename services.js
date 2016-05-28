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

// Connect to the db
mgoClient.connect("mongodb://localhost:27017/jobsDB", function(err, db) {
    if (!err) {
        console.log("database is connected");
        colJobs = db.collection('joblist');
        colUsers = db.collection('userlist');
    }
});

var userModel = new Object();

// Add headers
app.use(function(req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // Pass to next layer of middleware

    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    // decode token
    if (token) {
        // sign with RSA SHA256
        var cert = fs.readFileSync('private.key'); // get private key
        // verifies secret and checks exp
        jwt.verify(token, cert, function(err, decoded) {
            if (err) {
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
        // if there is no token
        // return an error
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });
    };
});

// get an instance of the router for api routes
var apiRoutes = express.Router();

apiRoutes.get('/listJobs', function(req, res) {
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

apiRoutes.post('/authenticate ', function(req, res) {
    var email = req.body.email;
    var password = req.body.password;
    console.log(email + "::" + password);

    // Fetch the document
    colUsers.findOne({
        email: email,
        password: password
    }, function(err, user) {
        if (err) {
            res.json({
                type: false,
                data: "Error occured: " + err
            });
        } else {
            if (user) {
                res.json({
                    type: false,
                    data: "User already exists!"
                });
            } else {
                userModel.email = req.body.email;
                userModel.password = req.body.password;
                // sign with RSA SHA256
                var cert = fs.readFileSync('private.key'); // get private key
                userModel.token = jwt.sign(userModel, cert, {
                    algorithm: 'RS256',
                    expiresInMinutes: 1440 // expires in 24 hours
                });
                colUsers.insert(userModel, function(err, user) {
                    console.log(user);
                    res.json({
                        type: true,
                        data: user,
                        token: user.token
                    });
                });
            }
        }
    });
});

// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes);

var server = app.listen(8081, function() {
    var host = server.address().address;
    var port = server.address().port;
    console.log("listening at http://%s:%s", host, port);
});