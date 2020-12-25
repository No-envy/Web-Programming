"use strict";

var cs142models = require('./modelData/photoApp.js').cs142models;

var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/cs142project6');

var User = require('./schema/user.js');
var Photo = require('./schema/photo.js');
var SchemaInfo = require('./schema/schemaInfo.js');

var versionString = '1.0';

var removePromises = [User.remove({}), Photo.remove({}), SchemaInfo.remove({})];

Promise.all(removePromises).then(function () {

    var userModels = cs142models.userListModel();
    var mapFakeId2RealId = {};
    var userPromises = userModels.map(function (user) {
        return User.create({
            first_name: user.first_name,
            last_name: user.last_name,
            location: user.location,
            description: user.description,
            occupation: user.occupation
        }, function (err, userObj) {
            if (err) {
                console.error('Error create user', err);
            } else {
                userObj.save();
                mapFakeId2RealId[user._id] = userObj._id;
                user.objectID = userObj._id;
                console.log('Adding user:', user.first_name + ' ' + user.last_name, ' with ID ',
                    user.objectID);
            }
        });
    });


    var allPromises = Promise.all(userPromises).then(function () {
        var photoModels = [];
        var userIDs = Object.keys(mapFakeId2RealId);
        for (var i = 0; i < userIDs.length; i++) {
            photoModels = photoModels.concat(cs142models.photoOfUserModel(userIDs[i]));
        }
        var photoPromises = photoModels.map(function (photo) {
            return Photo.create({
                file_name: photo.file_name,
                date_time: photo.date_time,
                user_id: mapFakeId2RealId[photo.user_id]
            }, function (err, photoObj) {
                if (err) {
                    console.error('Error create user', err);
                } else {
                    photo.objectID = photoObj._id;
                    if (photo.comments) {
                        photo.comments.forEach(function (comment) {
                            photoObj.comments.push({
                                comment: comment.comment,
                                date_time: comment.date_time,
                                user_id: comment.user.objectID
                            });
                            console.log("Adding comment of length %d by user %s to photo %s",
                                comment.comment.length,
                                comment.user.objectID,
                                photo.file_name);
                        });
                    }
                    photoObj.save();
                    console.log('Adding photo:', photo.file_name, ' of user ID ', photoObj.user_id);
                }
            });
        });
        return Promise.all(photoPromises).then(function () {
            return SchemaInfo.create({
                version: versionString
            }, function (err, schemaInfo) {
                if (err) {
                    console.error('Error create schemaInfo', err);
                } else {
                    console.log('SchemaInfo object created with version ', versionString);
                }
            });
        });
    });

    allPromises.then(function () {
        mongoose.disconnect();
    });
});
