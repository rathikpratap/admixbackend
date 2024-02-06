const mongoose = require('mongoose');

const registerSchema = new mongoose.Schema({

    signupName:{type:String},
    signupUsername: {type:String},
    signupEmail: {type:String},
    signupNumber: {type:String},
    signupPassword: {type:String}
});

module.exports = mongoose.model('User', registerSchema);
