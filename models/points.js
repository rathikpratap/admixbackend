const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
    videoType: String,
    points: [
        {
            second: {type: Number},
            points: {type: Number}
        }
    ]
});

module.exports = mongoose.model('point', pointSchema);