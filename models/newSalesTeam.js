const mongoose = require('mongoose');

const newSalesTeamSchema = new mongoose.Schema({
    salesTeamName : String
});

module.exports = mongoose.model('newSalesTeam', newSalesTeamSchema);