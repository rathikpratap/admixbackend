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
    salesPerson: String,
    projectStatus: String
});

module.exports = mongoose.model('salesLead', salesLeadSchema);
