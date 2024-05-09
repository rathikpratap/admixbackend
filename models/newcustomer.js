const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({

    custCode : {type:String},
    custName : {type:String},
    custNumb : {type:Number},
    custEmail : {type:String},
    custBussiness : {type:String},
    closingDate : {type:Date},
    leadsCreatedDate:{type:Date},
    closingPrice : {type:Number},
    closingCateg : {type:String},
    AdvPay : {type:Number},
    remainingAmount : {type:Number},
    custCountry : {type:String},
    custCity : {type:String},
    custState : {type:String},
    projectStatus : {type:String},
    salesPerson : {type:String},
    youtubeLink : {type:String},
    remark : {type:String},
    restAmount : {type:Number},
    restPaymentDate : {type:Date},
    editor: {type:String},
    scriptWriter: {type: String},
    voiceOver:{type: String},
    wordsCount: {type:Number},
    script: {type:String},
    scriptDuration: {type: Number},
    scriptDeliveryDate: {type:String},
    scriptPassDate: {type:String},
    scriptStatus: {type: String},
    scriptPayment: {type:Number},
    scriptOtherChanges: {type: String},
    scriptChangesPayment: {type: Number},
    scriptDurationMinutes: {type: Number},
    scriptDurationSeconds: {type: Number},
    salesTeam: {type:String},
    videoDuration: {type: Number},
    videoDurationMinutes: {type: Number},
    videoDurationSeconds: {type: Number},
    videoDeliveryDate: {type: String},
    editorPassDate: {type: String},
    videoType: {type: String},
    editorStatus: {type: String},
    editorPayment: {type: Number},
    editorOtherChanges: {type: String},
    editorChangesPayment: {type: Number},
    voiceDuration: {type: Number},
    voiceDurationMinutes: {type: Number},
    voiceDurationSeconds: {type: Number},
    voiceDeliveryDate: {type: String},
    voicePassDate: {type:String},
    voiceOverType: {type: String},
    voiceOverStatus: {type:String},
    voicePayment: {type: Number},
    voiceOtherChanges: {type: String},
    voiceChangesPayment: {type: Number},
    totalProjectPayment: {type: Number},
    totalEditorPayment: {type: Number},
    totalScriptPayment: {type: Number},
    totalVoicePayment: {type: Number},
    numberOfVideos: {type: String},
    companyName: {type: String},
});

//customerSchema.pre('save', function(next) {
//    if (this.isModified('closingDate')) {
//        const ISTOffset = 5.5 * 60 * 60 * 1000;
//        this.closingDate.setTime(this.closingDate.getTime() + ISTOffset);
//    }
//    next();
//});


module.exports = mongoose.model('customers', customerSchema);
