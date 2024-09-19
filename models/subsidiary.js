const mongoose = require('mongoose');

const subsidiarySchema = new mongoose.Schema({
    subsidiaryName : String
});

module.exports = mongoose.model('subsidiaryCaterory', subsidiarySchema);