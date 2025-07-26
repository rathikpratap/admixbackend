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
  lastOTPSent: {type: Date},

   // ➕ ADDED FIELDS FOR EDITOR POINT TRACKING

  // Store total points per month (e.g., "2025-07": 12.5)
  monthlyEditorPoints: {
    type: Map,
    of: Number,
    default: {}
  },

  // Lifetime points across all months
  totalEditorPoints: {
    type: Number,
    default: 0
  },

  // Work logs (project-based tracking)
  workLogs: [
    {
      projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
      date: { type: Date },
      duration: { type: Number }, // Total seconds
      pointsEarned: { type: Number }
    }
  ],

  // Timestamp for last project point update (used to optimize recalculations)
  lastProjectUpdated: { type: Date },

  // Soft delete flag
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('User', registerSchema);
