const mongoose = require('mongoose');

const b2bProjectSchema = new mongoose.Schema({
    b2bProjectCode:{type:String},
    companyName:{type:String},
    b2bProjectName:{type:String},
    b2bCategory:{type:String},
    b2bVideoType:{type:String},
    b2bProjectDate:{type:Date},
    b2bProjectPrice:{type:Number},
    b2bRemainingAmount:{type:Number},
    b2bAdvanceAmount:{type:Number},
    b2bRestAmount:{type:Number},
    b2bRestAmountDate:{type:Date},
    b2bBillType:{type:String},
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
    numberOfVideos:{type:String},
    videoDuration:{type:Number},
    EditorPaymentStatus:{type:String},
    editorPaymentDate:{type:Date},
    EditorCNR:{type:String},
    totalEditorPayment: {type:Number},
    b2bEditorPassDate: {type:Date}
});
module.exports = mongoose.model('B2bProjects', b2bProjectSchema);