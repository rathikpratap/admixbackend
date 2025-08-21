const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    SrNo : {type:Number},
    taskName : {type:String},
    taskDescription : {type:String},
    assignedDate : {type:Date},
    graphicDesigner : {type:String},
    taskDeliveryDate : {type:Date},
    graphicStatus : {type:String},
    assignedBy : {type:String},
    taskVideoDurationMinutes: {type: Number},
    taskVideoDurationSeconds: {type: Number},
    taskVideoType: {type: String},
    taskEditorPayment: {type: Number},
    taskEditorOtherChanges: {type: String},
    taskEditorChangesPayment: {type: Number},
    taskTotalEditorPayment: {type: Number},
    taskYoutubeLink: {type: String},
    taskYoutubeLink2: {type: String},
    taskYoutubeLink3: {type: String},
    taskNumberOfVideos: {type: String},
    taskCompanyName: {type: String},
    pointsEarned: {type: Number, default: 0},
    pointsCalculated: {type: Boolean, default: false},
    updateMorePoints: {type: Boolean, default: false}
});

module.exports = mongoose.model('tasks', taskSchema);