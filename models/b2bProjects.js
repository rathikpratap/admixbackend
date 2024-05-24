const mongoose = require('mongoose');

const b2bProjectSchema = new mongoose.Schema({
    b2bProjectCode:{type:String},
    companyName:{type:String},
    b2bProjectName:{type:String},
    b2bCategory:{type:String},
    b2bVideoType:{type:String},
    b2bProjectDate:{type:Date},
    b2bProjectPrice:{type:Number},
    b2bVideoDurationMinutes:{type:Number},
    b2bVideoDurationSeconds:{type:Number},
    b2bEditor:{type:String},
    youtubeLink:{type:String},
    b2bRemark:{type:String},
    salesPerson: {type:String},
    salesTeam: {type: String},
    projectStatus: {type:String},
    editorPayment:{type:Number},
    editorOtherChanges:{type:String},
    editorChangesPayment:{type:Number},
    numberOfVideos:{type:String}
});
module.exports = mongoose.model('B2bProjects', b2bProjectSchema);