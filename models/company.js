const mongoose = require('mongoose');

const newComapnySchema = new mongoose.Schema({
    companyName : String
});

module.exports = mongoose.model('newCompany', newComapnySchema);