 const mongoose = require('mongoose');
 
 const tagSchema = new mongoose.Schema({
     tagName : String
 });
 
 module.exports = mongoose.model('tag', tagSchema);