const mongoose = require('mongoose');

const estInvoiceSchema = new mongoose.Schema({
    custGST: {type: String},
    custADD: {type: String},
    billType : {type: String},
    custName: {type:String},
    custNumb:{type:Number},
    invoiceCateg:{type:String},
    //customCateg:{type:String},
    rows: [
        {
          invoiceCateg: { type: String },
          customCateg: { type: String},
          numOfVideos: { type: Number },
          priceOfVideos: { type: Number },
          gst: { type: Number },
          amt: { type: Number }
        }
      ],
    // numOfVideos:{type:Number},
    // priceOfVideos:{type:Number},
    date:{type:Date},
    GSTAmount:{type:Number},
    totalAmount:{type:Number},
    billFormat:{type:String},
    billNumber: {type:Number},
});

module.exports = mongoose.model('estInvoice', estInvoiceSchema);