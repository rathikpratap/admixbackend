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
  billNumber: { type: Number, unique: true, required: true },
  financialYear: {
    type: String,
    required: true,
  },
  discountValue: {type: Number},
  afterDiscountTotal: {type: Number},
  state: {type:String},
  quotationNumber: {type: String},
  invoiceNumber: [
        {
            InvoiceNo:{type: String},
            invoiceDate: {type: Date}
        }
    ],
  quotationDate: {type: Date},
  salesPerson: {type: String},
  QrCheck: {type: String},
  //New Feilds
  noteText: {type: String},
  noteHtml: {type: String},
  termsHtml: {type: String},
  termsList: [{type: String}],
  packageIncludesHtml: {type: String},
  packageIncludesList: [{type: String}],
  paymentTermsHtml: {type: String},
  paymentTermsList: [{type: String}],
  additionalNotesHtml:{type: String},
  additionalNotesList: [{type: String}],
  visibilityFlags:{
    isMetaAdsVisible: { type: Boolean, default: false},
    isAdrunVisible: {type: Boolean, default: false},
    isWebDevelopmentVisible: {type: Boolean, default: false},
    isModelAvailabilityVisible: {type: Boolean, default: false},
  }
});

module.exports = mongoose.model('estInvoice', estInvoiceSchema);