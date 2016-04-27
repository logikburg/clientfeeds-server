var request = require('request');
var htmlparser = require("htmlparser2");
var DomUtils = require("domutils");
var mongodb = require('mongodb');

// Retrieve
var mgoClient = mongodb.MongoClient;

// Set the headers
var headers = {
    'User-Agent': 'Super Agent/0.0.1',
    'Content-Type': 'application/x-www-form-urlencoded'
}

var url = 'http://www.timesjobs.com';

// Configure the request
var options = {
    url: url + '/candidate/job-search.html?from=submit&searchType=personalizedSearch&txtLocation=Pune',
    method: 'GET',
    headers: headers
}

var batchJobStoreHelper;

// Connect to the db
mgoClient.connect("mongodb://localhost:27017/jobsDB", function (err, db) {
    if (!err) {
        console.log("database is connected");
        var colJobList = db.collection('joblist');
        // Initialize the Ordered Batch
        batchJobStoreHelper = colJobList.initializeOrderedBulkOp()
    }
})

//var fields = [];
var objJob = new Object();

var handler = new htmlparser.DomHandler(function (error, dom) {
    if (error) {
        console.log(error);
    } else {
        var ul = DomUtils.getElements({
            class: "joblist"
        }, dom)

        var ls = DomUtils.getChildren(ul[0]);
        var lis = DomUtils.getElements({
            class: "clearfix joblistli"
        }, ls)

        for (var li in lis) {

            objJob = new Object();

            var h2 = DomUtils.getElementsByTagName("h2", lis[li]);

            var jobAction = DomUtils.getElements({
                class: "job-action clearfix"
            }, lis[li]);

            // JobId
            var _jd = DomUtils.getElementsByTagName("span", jobAction[0]);
            var jobId = _jd[0].attribs.id;

            // adding the 'jobid' field value to job object
            objJob["jobid"] = jobId;

            // Job Detail anchor link
            var _a = DomUtils.getElementsByTagName("a", _jd[0]);
            var jdurl = _a[0].attribs.href;

            // adding the 'jobid' field value to job object
            objJob["jdurl"] = jdurl;
            //            console.log(jdurl)
            //            return;

            //Position
            var _pos = DomUtils.getElementsByTagName("a", h2);
            var postion = _pos[0].children[0].data;
            postion = postion.trim();

            // adding the 'position' field value to job object
            objJob["postion"] = postion;


            //Company Name
            var _cmp = DomUtils.getElementsByTagName("span", h2);
            var company = _cmp[0].children[0].data;
            company = company.trim();

            // adding the 'company' field value to job object
            objJob["company"] = company;

            var _ul = DomUtils.getElementsByTagName("ul", lis[li]);

            // Salary
            var _salr = DomUtils.getElements({
                class: "salr"
            }, _ul);
            var salary = _salr[0].children[0].data;
            salary = salary.trim();

            // adding the 'salary' field value to job object
            objJob["salary"] = salary;

            // Location
            var _loc = DomUtils.getElements({
                class: "loc"
            }, _ul);
            var location = _loc[0].children[0].data;
            location = location.trim();

            // adding the 'salary' field value to job object
            objJob["location"] = location;

            //Tags 
            var _disc = DomUtils.getElements({
                class: "disc"
            }, _ul);

            var _discChild = DomUtils.getChildren(_disc[0]);
            var _span = DomUtils.getElementsByTagName("span", _discChild);

            var tags = new Array();
            for (var s in _span) {
                var _tag = DomUtils.getElementsByTagName("a", _span[s]);
                if (_tag.length > 0 && _tag[0].hasOwnProperty("children")) {
                    tags.push(_tag[0].children[0].data);
                }
            }

            // adding the 'tags' field value to job object
            objJob["tags"] = tags;

            console.log(objJob);

            // Batch Insert 
            batchJobStoreHelper.insert(objJob);
        }

        // Execute the operations
        batchJobStoreHelper.execute({
            w: "majority",
            wtimeout: 5000
        });

        console.log("wrote to database done");
    }
});

var parser = new htmlparser.Parser(handler);

// Start the request
request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        parser.write(body);
        parser.end();
    }
})
