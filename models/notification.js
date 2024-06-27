const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    msgTitle: {type:String},
    msgBody: {type:String},
    Date: {type:Date},
    ScriptWriter:{type:String},
    Editor:{type:String},
    VoiceOver:{type:String},
    GraphicDesigner:{type:String},
    Admin:{type:String},
    Status:{type:String}
});

module.exports = mongoose.model('notification', notificationSchema);