const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    SrNo : {type:Number},
    taskName : {type:String},
    taskDescription : {type:String},
    assignedDate : {type:Date},
    graphicDesigner : {type:String},
    taskDeliveryDate : {type:Date},
    graphicStatus : {type:String},
    assignedBy : {type:String}
});

module.exports = mongoose.model('tasks', taskSchema);