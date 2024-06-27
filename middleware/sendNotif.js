var admin = require("firebase-admin");

var serviceAccount = require("../admix-demo-firebase-adminsdk-952at-48ec8627f9.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

const sendNotif = async (token, title, body)=>{
    try{
        if(!token || typeof token !== 'string'){
            throw new Error('Invalid FCM token providedeeedd');
        }
        const message = {
            notification: {
                title: title,
                body: body,
            },
            android:{
                notification: {
                    sound: "default",
                },
                data: {
                    title: title,
                    body: body,
                },
            },
            token: token,
        };
        const response = await admin.messaging().send(message);
        console.log("Successfully sent message: ", response);
    }catch(error){
        console.error("Error sending message: ", error.message);
        throw error;
    }
};
module.exports = sendNotif;