const mongoose = require('mongoose');

const registerSchema = new mongoose.Schema({

    signupName:{type:String},
    signupUsername: {type:String},
    signupEmail: {type:String},
    signupNumber: {type:String},
    signupGender : {type:String},
    signupPassword: {type:String},
    signupAddress: {type:String},
    signupRole: {type:String}
});

module.exports = mongoose.model('User', registerSchema);
