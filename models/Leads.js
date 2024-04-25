const mongoose = require('mongoose');

const adAccountSchema = new mongoose.Schema({
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
    leadsCreatedDate: Date
});

module.exports = mongoose.model('Lead', adAccountSchema);