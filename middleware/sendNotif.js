const admin = require("firebase-admin");
const User = require('../models/user');
const CampaignAssignment = require('../models/campaignAssignment');

const serviceAccount = require("../admix-demo-firebase-adminsdk-952at-abf2518dc7.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// ✅ Send notification to a single user
const sendNotif = async (token, title, body) => {
    try {
        if (!token || typeof token !== 'string') {
            throw new Error('Invalid or missing FCM token');
        }

        const message = {
            notification: { title, body },
            token
        };

        const response = await admin.messaging().send(message);
        console.log(`✅ Successfully sent message: ${response}`);
    } catch (error) {
        console.error(`❌ Error sending notification: ${error.message}`);
    }
};

// ✅ Send campaign-based notifications using Promise.all
const sendCampaignNotif = async (campaignName, title, body) => {
    try {
        const assignment = await CampaignAssignment.findOne({ campaignName });

        if (!assignment || assignment.employees.length === 0) {
            console.log(`⚠️ No employees assigned for campaign: ${campaignName}`);
            return;
        }

        const users = await User.find({ signupUsername: { $in: assignment.employees } });
        const tokens = users.map(user => user.accessToken).filter(Boolean);

        if (tokens.length === 0) {
            console.log(`⚠️ No valid FCM tokens found for employees: ${assignment.employees}`);
            return;
        }

        const sendPromises = tokens.map(async (token) => {
            try {
                const message = {
                    notification: { title, body },
                    token
                };
                const response = await admin.messaging().send(message);
                console.log(`✅ Sent to ${token}: ${response}`);
            } catch (err) {
                console.error(`❌ Failed to send to ${token}: ${err.message}`);
            }
        });

        await Promise.all(sendPromises);
        console.log(`✅ Notifications processed for campaign: ${campaignName}`);
    } catch (error) {
        console.error("❌ Error sending campaign notification:", error.message);
    }
};

module.exports = { sendNotif, sendCampaignNotif };
