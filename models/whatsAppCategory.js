const mongoose = require('mongoose');

const whatsAppCategorySchema = new mongoose.Schema({
    whatsAppCategoryName : String
});

module.exports = mongoose.model('whatsAppCategory', whatsAppCategorySchema);