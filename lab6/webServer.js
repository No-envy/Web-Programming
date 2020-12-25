"use strict";
var mongoose = require('mongoose');
var async = require('async');

var User = require('./schema/user.js');
var Photo = require('./schema/photo.js');

var SchemaInfo = require('./schema/schemaInfo.js');

var express = require('express');
var app = express();

var cs142models = require('./modelData/photoApp.js').cs142models;

mongoose.connect('mongodb://localhost/cs142project6');
app.use(express.static(__dirname));


app.get('/', function (request, response) {
    response.send('Simple web server of files from ' + __dirname);
});
app.get('/test/:p1', function (request, response) {

    console.log('/test called with param1 = ', request.params.p1);

    var param = request.params.p1 || 'info';

    if (param === 'info') {
        SchemaInfo.find({}, function (err, info) {
            if (err) {
                console.error('Doing /user/info error:', err);
                response.status(500).send(JSON.stringify(err));
                return;
            }
            if (info.length === 0) {
                response.status(500).send('Missing SchemaInfo');
                return;
            }

            console.log('SchemaInfo', info[0]);
            response.end(JSON.stringify(info[0]));
        });
    } else if (param === 'counts') {
        var collections = [
            {name: 'user', collection: User},
            {name: 'photo', collection: Photo},
            {name: 'schemaInfo', collection: SchemaInfo}
        ];
        async.each(collections, function (col, done_callback) {
            col.collection.count({}, function (err, count) {
                col.count = count;
                done_callback(err);
            });
        }, function (err) {
            if (err) {
                response.status(500).send(JSON.stringify(err));
            } else {
                var obj = {};
                for (var i = 0; i < collections.length; i++) {
                    obj[collections[i].name] = collections[i].count;
                }
                response.end(JSON.stringify(obj));

            }
        });
    } else {
        response.status(400).send('Bad param ' + param);
    }
});

app.get('/user/list', function (request, response) {
    var query;
    User.find({}, function (err, query) {
        if (err) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        var list = JSON.parse(JSON.stringify(query));
        var res = [];

        for (var i = 0; i < list.length; i++) {
            var user = {};
            user._id = list[i]._id;
            user.first_name = list[i].first_name;
            user.last_name = list[i].last_name;
            res.push(user);
        }

        response.status(200).send(res);
    });
});

app.get('/user/:id', function (request, response) {
    var id = request.params.id;
    User.find({'_id': id}, function (err, query) {
        if (err) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        if (!query || query.length === 0) {
            console.log('User with _id:' + id + ' not found.');
            response.status(400).send('Not found');
            return;
        }
        var user = JSON.parse(JSON.stringify(query[0]));

        delete user.__v;
        response.status(200).send(user);
    });

});
app.get('/photosOfUser/:id', function (request, response) {
    //
    var id = request.params.id;

    Photo.find({user_id: id}, function (err, query) {
        if (err) {
            response.status(400).send(JSON.stringify(err));
        }
        else if (!query || query.length === 0) {
            console.log('Photos for user with _id:' + id + ' not found.');
            response.status(400).send('Not found');
        }
        else {

            var photos = JSON.parse(JSON.stringify(query));


            var processPhotos = function (photo, processPhotoCallback) {

                delete photo.__v;

                var processComment = function(comment, doneProcessComment){
                    User.find({_id: comment.user_id}, function (err, query) {
                        if(err){
                            console.log("Error fetching comment user info");
                            response.status(400).send(JSON.stringify(err));
                        }
                        else if(!query || query.length === 0){
                            console.log("User of comment with _id" + comment.user_id + " not found.");
                            response.status(400).send("Not found");
                        }

                        else{
                            var user = {};
                            var queryRes = JSON.parse(JSON.stringify(query[0]));
                            user.first_name = queryRes.first_name;
                            user.last_name = queryRes.last_name;
                            user._id = queryRes._id;
                            comment.user = user;
                            delete comment.user_id;
                        }
                        doneProcessComment();
                    });

                };

                var commentCallback = function(err){
                    if(err){
                        response.status(400).send(JSON.stringify(err));
                    }
                    processPhotoCallback();
                };

                async.each(photo.comments, processComment, commentCallback);
            };
            var sendPhoto = function (err) {
                if (err) {
                    response.status(400).send(JSON.stringify(err));
                }
                else {
                    response.status(200).send(photos);
                }
            };
            async.each(photos, processPhotos, sendPhoto);
        }
    });
});
var server = app.listen(3000, function () {
    var port = server.address().port;
    console.log('Listening at http://localhost:' + port + ' exporting the directory ' + __dirname);
});


