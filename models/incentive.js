const mongoose = require('mongoose');

const incentiveSchema = new mongoose.Schema({
    employeeName: String,
    category: String,
    incentives: [
        {
            amount: {type: Number},
        increment: {type: Number}
        }
    ]
});

module.exports = mongoose.model('incentive', incentiveSchema);