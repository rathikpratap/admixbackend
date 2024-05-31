const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
    EditorPaymentStatus: {type:String},
    ScriptPaymentStatus: {type: String},
    VoiceOverPaymentStatus: {type:String},
    editorPaymentDate: {type:Date},
    scriptPaymentDate: {type:Date},
    voiceOverPaymentDate: {type:Date},
    EditorCNR: {type:String},
    ScriptCNR: {type:String},
    VoCNR: {type:String},
    startDate: {type:Date},
    endDate:{type:Date},
    tmName: {type:String},
    PaybalAmount: {type:Number},
    companyName: {type:String},
    Role:{type:String}
});

module.exports = mongoose.model('payroll', payrollSchema);