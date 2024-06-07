const mongoose = require('mongoose');

const newComapnySchema = new mongoose.Schema({
    companyName : {type: String},
    signupName : {type: String},
    signupRole : {type: String},
    videoType : {type: String},
    payment30Sec: {type: Number},
    payment45Sec: {type: Number},
    payment60Sec: {type: Number},
    payment90Sec: {type: Number},
    payment120Sec: {type: Number},
    payment150Sec: {type: Number},
    payment180Sec: {type: Number},
    paymentTwoVideo: {type: Number},
    paymentThreeVideo: {type: Number},
    payment150words :{type:Number},
    payment200words: {type:Number},
    payment300words: {type:Number},
    payment500words:{type: Number}
});

module.exports = mongoose.model('newCompany', newComapnySchema);