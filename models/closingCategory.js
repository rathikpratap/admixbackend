const mongoose = require('mongoose');

const closingCategorySchema = new mongoose.Schema({
    categoryName : String
});

module.exports = mongoose.model('closingCategory', closingCategorySchema);