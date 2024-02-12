const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({

    custCode : {type:String},
    custName : {type:String},
    custNumb : {type:String},
    custBussiness : {type:String},
    closingDate : {type:String},
    closingPrice : {type:String},
    closingCateg : {type:String},
    AdvPay : {type:String},
    remainingAmount : {type:String},
    custCity : {type:String},
    custState : {type:String},
    projectStatus : {type:String},
    salesPerson : {type:String},
    remark : {type:String}
});

module.exports = mongoose.model('customers', customerSchema);
