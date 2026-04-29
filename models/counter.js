const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true},
    seq: { type: Number, default: 6469},
    quotationNum: {type: Number, default: 667},
    GSTNum: {type: Number, default: 195},
    NonGSTnum: {type: Number, default: 197}
});

module.exports = mongoose.model('Counter', counterSchema);