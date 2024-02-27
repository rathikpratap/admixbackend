const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({

    custCode : {type:String},
    custName : {type:String},
    custNumb : {type:String},
    custBussiness : {type:String},
    closingDate : {type:Date},
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
    remark : {type:String}
});

customerSchema.pre('save', function(next) {
    if (this.isModified('closingDate')) {
        const ISTOffset = 5.5 * 60 * 60 * 1000;
        this.closingDate.setTime(this.closingDate.getTime() + ISTOffset);
    }
    next();
});


module.exports = mongoose.model('customers', customerSchema);
