const mongoose = require('mongoose');

// Define the schema for attendance records
const AttendanceDaySchema = new mongoose.Schema({
  date: { type: String, required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Half Day', 'Select'], default: 'Select' },
  reason: { type: String, default: null }
}); 

const registerSchema = new mongoose.Schema({

  signupName: { type: String },
  signupUsername: { type: String },
  signupEmail: { type: String },
  signupNumber: { type: String },
  signupGender: { type: String },
  signupPassword: { type: String },
  signupAddress: { type: String },
  signupRole: { type: [String] },
  signupPayment: { type: Number },
  salesTeam: { type: String },
  payment60Sec: { type: Number },
  payment90Sec: { type: Number },
  payment120Sec: { type: Number },
  payment150Sec: { type: Number },
  payment180Sec: { type: Number },
  paymentTwoVideo: { type: Number },
  paymentThreeVideo: { type: Number },
  accessToken: { type: String },
  editorType: {type: String},
  loginSessions: [
    {
      loginTime: { type: Date },
      logoutTime: { type: Date }
    }
  ], // Store login and logout as pairs
  attendance: {
    type: Map,
    of: {
      type: Map,
      of: [AttendanceDaySchema],
      default: {}
    },
    default: {}
  },
  subsidiaryName: {type: String},
  incentivePassword: {type: String},
  lastOTPLogin: {type: Date},
  lastOTPSent: {type: Date}
});

module.exports = mongoose.model('User', registerSchema);
