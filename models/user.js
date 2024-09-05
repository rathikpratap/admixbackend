const mongoose = require('mongoose');

const registerSchema = new mongoose.Schema({

    signupName:{type:String},
    signupUsername: {type:String},
    signupEmail: {type:String},
    signupNumber: {type:String},
    signupGender : {type:String},
    signupPassword: {type:String},
    signupAddress: {type:String},
    signupRole: {type:String},
    signupPayment: {type: Number},
    salesTeam: {type:String},
    payment60Sec: {type: Number},
    payment90Sec: {type: Number},
    payment120Sec: {type: Number},
    payment150Sec: {type: Number},
    payment180Sec: {type: Number},
    paymentTwoVideo: {type: Number},
    paymentThreeVideo: {type: Number},
    accessToken: {type: String},
    loginSessions: [
        {
            loginTime: { type: Date },
            logoutTime: { type: Date }
        }
    ] // Store login and logout as pairs
});

module.exports = mongoose.model('User', registerSchema);
