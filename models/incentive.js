const mongoose = require('mongoose');

const incentiveSchema = new mongoose.Schema({
    employeeName: String,
    category: String,
    amountOne: Number,
    amountOneIncrement: Number,
    amountTwo: Number,
    amountTwoIncrement: Number,
    amountThree: Number,
    amountThreeIncrement: Number
});

module.exports = mongoose.model('incentive', incentiveSchema);