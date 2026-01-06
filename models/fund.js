const mongoose = require('mongoose');

const fundsSchema = new mongoose.Schema({
    fbAccount : String,
    amount : Number,
    fundDate : Date
});

module.exports = mongoose.model('fund', fundsSchema);