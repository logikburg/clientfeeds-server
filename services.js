/*
    author : sandeep.mogla@gmail.com
*/
var express = require('express');
var mongodb = require('mongodb');
var bodyParser = require("body-parser");

// Retrieve
var mgoClient = mongodb.MongoClient;

// initialize the express module
var app = express();
var colJobs;

// Connect to the db
mgoClient.connect("mongodb://localhost:27017/jobsDB", function(err, db) {
    if (!err) {
        console.log("database is connected");
        colJobs = db.collection('joblist');
    }
});

// Add headers
app.use(function(req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Pass to next layer of middleware
    next();
});

app.get('/api/listJobs', function(req, res) {
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

var server = app.listen(8081, function() {
    var host = server.address().address;
    var port = server.address().port;
    console.log("listening at http://%s:%s", host, port);
});