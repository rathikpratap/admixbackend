const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
    modelName : String
});

module.exports = mongoose.model('model', modelSchema);