const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
    id: String,
    created_time: Date,
    campaign_Name: String,
    ad_Name: String,
    name: String,
    email: String,
    company_name: String,
    phone: Number,
    state: String,
    salesTeam: String,
    projectStatus: String,
    remark: String,
    leadsCreatedDate: Date
});

module.exports = mongoose.model('transferLead', transferSchema);