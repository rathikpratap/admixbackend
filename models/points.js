const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
    // employeeName: String,
    points: [
        {
            minute: {type: Number},
            points: {type: Number}
        }
    ]
});

module.exports = mongoose.model('point', pointSchema);