// fb-webhook.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const router = express.Router();

const { processAndSaveLead } = require('./auth-route');
const FbAccessToken = require('./models/accessToken'); // adjust path to your model

const VERIFY_TOKEN = 'my_secret_token_hulalala';
const APP_SECRET = process.env.APP_SECRET || ''; // set in env for signature verification
const DISABLE_FB_SIGNATURE = (process.env.DISABLE_FB_SIGNATURE === 'true');

function verifySignatureFromBuffer(rawBuffer, header) {
  if (!header) return false;
  const [algo, signature] = header.split('=');
  const digestMethod = algo === 'sha256' ? 'sha256' : 'sha1';
  const expected = crypto.createHmac(digestMethod, APP_SECRET).update(rawBuffer || Buffer.from('')).digest('hex');
  console.log('👉 DEBUG expected HMAC:', expected);
  return signature === expected;
}

// GET: verification endpoint used by Facebook when you click "Verify and save"
router.get('/webhook', (req, res) => {
    console.log('➡️ FB verify request received from:', req.ip, 'query:', req.query);
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ FB Webhook verified');
    return res.status(200).send(challenge);
  } else {
    console.warn('❌ FB Webhook verification failed: tokens did not match',{ token, expected: VERIFY_TOKEN });
    return res.sendStatus(403);
  }
});

// helper: signature verification (recommended)
// function verifySignature(req) {
//   if (!APP_SECRET) return true; // allow if not configured (not recommended for prod)
//   if (DISABLE_FB_SIGNATURE) return true;
//   const signatureHeader = req.headers['x-hub-signature-256'] || req.headers['x-hub-signature'];
//   if (!signatureHeader) return false;
//   const [algo, signature] = signatureHeader.split('=');
//   const digestMethod = algo === 'sha256' ? 'sha256' : 'sha1';
//   const expected = crypto.createHmac(digestMethod, APP_SECRET).update(req.rawBody || '').digest('hex');
//   console.log('👉 DEBUG expected HMAC:', expected);   // add this line
//   console.log('👉 DEBUG rawBody:', JSON.stringify(req.rawBody)); // optional: show exactly what server sees

//   return signature === expected;
// }

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // <- important: captures raw bytes into req.body (Buffer)
  async (req, res) => {
    // send 200 immediately
    res.sendStatus(200);

    try {
      // req.body is Buffer now (raw bytes). For debugging:
      // console.log('RAW BODY (hex):', req.body.toString('hex'));

      const signatureHeader = req.headers['x-hub-signature-256'] || req.headers['x-hub-signature'];
      console.log('➡️ FB POST received: headers:', { sig: signatureHeader });

      if (!DISABLE_FB_SIGNATURE) {
        const ok = verifySignatureFromBuffer(req.body, signatureHeader);
        if (!ok) {
          console.warn('⚠️ FB signature verification failed');
          return;
        }
      } else {
        console.log('⚠️ Signature verification skipped (DISABLE_FB_SIGNATURE=true)');
      }

      // parse JSON from the raw buffer
      let body;
      try {
        body = JSON.parse(req.body.toString('utf8'));
      } catch (err) {
        console.error('❌ Failed to parse JSON from raw body:', err.message);
        return;
      }

      if (!body || body.object !== 'page') return;

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen' && change.value && change.value.leadgen_id) {
            const leadId = change.value.leadgen_id;
            console.log('📬 Received leadgen id:', leadId);

            // fetch PAGE_ACCESS_TOKEN from DB/env
            const tokenRecord = await FbAccessToken.findOne();
            const PAGE_ACCESS_TOKEN = tokenRecord?.newAccessToken || process.env.PAGE_ACCESS_TOKEN;
            if (!PAGE_ACCESS_TOKEN) {
              console.error('❌ PAGE_ACCESS_TOKEN missing. Cannot fetch lead details.');
              continue;
            }

            // fetch lead data (same as before)
            try {
              const url = `https://graph.facebook.com/v17.0/${leadId}?access_token=${encodeURIComponent(PAGE_ACCESS_TOKEN)}&fields=id,created_time,field_data,ad_id,ad_name,form_id`;
              const leadResp = await axios.get(url);
              const leadData = leadResp.data;
              console.log('🔎 Lead details fetched:', leadData);

              // fetch campaign if needed and call processAndSaveLead
              let campaignName = '';
              if (leadData.ad_id) {
                try {
                  const adUrl = `https://graph.facebook.com/v17.0/${leadData.ad_id}?access_token=${encodeURIComponent(PAGE_ACCESS_TOKEN)}&fields=id,name,campaign{ id,name }`;
                  const adResp = await axios.get(adUrl);
                  campaignName = adResp.data?.campaign?.name || '';
                } catch (err) {
                  console.warn('⚠️ Could not fetch ad/campaign info:', err.message);
                }
              }

              await processAndSaveLead(leadData, { campaign_Name: campaignName, ad_Name: leadData.ad_name || '', source: 'webhook' });
            } catch (err) {
              console.error('❌ Error fetching lead details from Graph API:', err.response?.data || err.message);
            }
          }
        }
      }
    } catch (err) {
      console.error('❌ Error handling webhook POST:', err.message || err);
    }
  }
);

// POST: receive events
// router.post('/webhook', async (req, res) => {
//     console.log('➡️ FB POST received: headers:', {
//     sig: req.headers['x-hub-signature-256'] || req.headers['x-hub-signature']
//   });
//   // reply quickly so FB doesn't retry
//   res.sendStatus(200);

//   try {
//     // verify signature
//     if (!verifySignature(req)) {
//       console.warn('⚠️ FB signature verification failed');
//       return;
//     }

//     const body = req.body;
//     if (!body || body.object !== 'page') return;

//     for (const entry of body.entry || []) {
//       // Leadgen events come as entry.changes with field === 'leadgen'
//       if (Array.isArray(entry.changes)) {
//         for (const change of entry.changes) {
//           if (change.field === 'leadgen' && change.value && change.value.leadgen_id) {
//             const leadId = change.value.leadgen_id;
//             console.log('📬 Received leadgen id:', leadId);

//             // Get current page access token (from DB or env)
//             const tokenRecord = await FbAccessToken.findOne();
//             const PAGE_ACCESS_TOKEN = tokenRecord?.newAccessToken || process.env.PAGE_ACCESS_TOKEN;
//             if (!PAGE_ACCESS_TOKEN) {
//               console.error('❌ PAGE_ACCESS_TOKEN missing. Cannot fetch lead details.');
//               continue;
//             }

//             // Fetch lead details from Graph API
//             try {
//               const url = `https://graph.facebook.com/v17.0/${leadId}?access_token=${encodeURIComponent(PAGE_ACCESS_TOKEN)}&fields=id,created_time,field_data,ad_id,ad_name,form_id`;
//               const leadResp = await axios.get(url);
//               const leadData = leadResp.data;
//               console.log('🔎 Lead details fetched:', leadData);

//               // Optionally fetch ad -> campaign details to get campaign name
//               let campaignName = '';
//               if (leadData.ad_id) {
//                 try {
//                   const adUrl = `https://graph.facebook.com/v17.0/${leadData.ad_id}?access_token=${encodeURIComponent(PAGE_ACCESS_TOKEN)}&fields=id,name,campaign{ id,name }`;
//                   const adResp = await axios.get(adUrl);
//                   campaignName = adResp.data?.campaign?.name || '';
//                 } catch (err) {
//                   console.warn('⚠️ Could not fetch ad/campaign info:', err.message);
//                 }
//               }

//               // Call reusable saving function (this will save to MongoDB and Google Contacts)
//               await processAndSaveLead(leadData, { campaign_Name: campaignName, ad_Name: leadData.ad_name || '' });
//             } catch (err) {
//               console.error('❌ Error fetching lead details from Graph API:', err.response?.data || err.message);
//             }
//           } // end leadgen handler
//         } // end changes loop
//       } // end if changes
//     } // end entries loop
//   } catch (err) {
//     console.error('❌ Error handling webhook POST:', err.message || err);
//   }
// });

module.exports = router;