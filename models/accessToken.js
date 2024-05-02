const mongoose = require('mongoose');

const fbAccessTokenSchema = new mongoose.Schema({
    newAccessToken : String
});

module.exports = mongoose.model('fbAccessToken', fbAccessTokenSchema);