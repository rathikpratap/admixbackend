const mongoose = require('mongoose');

const estInvoiceSchema = new mongoose.Schema({
  custGST: { type: String },
  //custADD: {type: String},
  custAddLine1: { type: String },
  custAddLine2: { type: String },
  custAddLine3: { type: String },
  billType: { type: String },
  gstType: { type: String },
  custName: { type: String },
  custNumb: { type: Number },
  invoiceCateg: { type: String },
  //customCateg:{type:String},
  rows: [
    {
      invoiceCateg: { type: String },
      customCateg: { type: String },
      numOfVideos: { type: Number },
      priceOfVideos: { type: Number },
      gst: { type: Number },
      amt: { type: Number }
    }
  ],
  // numOfVideos:{type:Number},
  // priceOfVideos:{type:Number},
  date: { type: Date },
  GSTAmount: { type: Number },
  totalAmount: { type: Number },
  billFormat: { type: String },
  billNumber: { type: Number },
  financialYear: {
    type: String,
    required: true,
  },
  discountValue: {type: Number},
  afterDiscountTotal: {type: Number},
  state: {type:String},
  quotationNumber: {type: String},
  quotationDate: {type: Date},
  salesPerson: {type: String}
});

module.exports = mongoose.model('estInvoice', estInvoiceSchema);