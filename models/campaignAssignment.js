const mongoose = require("mongoose");

const campaignAssignmentSchema = new mongoose.Schema({
    campaignName: { type: String, required: true},
    employees: { type: [String], required: true},
    tag: { type: String, required: true}
});

module.exports = mongoose.model('campaignAssignment', campaignAssignmentSchema);