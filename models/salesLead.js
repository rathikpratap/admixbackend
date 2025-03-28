const mongoose  = require('mongoose');

const salesLeadSchema = new mongoose.Schema({
    id: String,
    closingDate: Date,
    campaign_Name: String,
    ad_Name: String,
    custName: String,
    custEmail: String,
    custBussiness: String,
    custNumb: Number,
    state: String,
    salesTeam: String,
    projectStatus: String,
    remark: String,
    leadsCreatedDate: Date,
    salesPerson: String,
    companyName: String,
    subsidiaryName: String,
    transferBy: String,
    newSalesTeam: String,
    additionalFields: Object
});

module.exports = mongoose.model('salesLead', salesLeadSchema);
