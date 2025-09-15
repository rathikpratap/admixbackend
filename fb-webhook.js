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

function verifySignatureBuffer(buffer, signatureHeader) {
  if (!APP_SECRET) {
    // In dev, allow if APP_SECRET not set — but don't do this in production.
    console.warn('⚠️ APP_SECRET not set; skipping signature verification (dev only).');
    return true;
  }
  if (!signatureHeader) return false;

  const parts = signatureHeader.split('=');
  if (parts.length !== 2) return false;

  const algo = parts[0]; // e.g. 'sha256'
  const signature = parts[1];
  const digestAlgo = (algo === 'sha256') ? 'sha256' : 'sha1';
  const expected = crypto.createHmac(digestAlgo, APP_SECRET).update(buffer).digest('hex');

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
    console.warn('❌ FB Webhook verification failed: tokens did not match', { received: token, expected: VERIFY_TOKEN });
    return res.sendStatus(403);
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // reply quickly so FB doesn't retry
  res.sendStatus(200);

  try {
    const signatureHeader = req.headers['x-hub-signature-256'] || req.headers['x-hub-signature'];
    console.log('➡️ FB POST received: headers:', { sig: signatureHeader });

    // req.body should be a Buffer because of express.raw
    const rawBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    console.log('👉 rawBuffer.length=', rawBuffer.length);
console.log('👉 rawBuffer hex (first 1000 chars)=', rawBuffer.toString('hex').slice(0,1000));

    // Verify signature
    if (!DISABLE_FB_SIGNATURE) {
      const ok = verifySignatureBuffer(rawBuffer, signatureHeader);
      if (!ok) {
        console.warn('⚠️ FB signature verification failed');
        return;
      }
    } else {
      console.warn('⚠️ Signature verification skipped (DISABLE_FB_SIGNATURE=true)');
    }

    // Parse JSON from raw buffer
    let body;
    try {
      body = JSON.parse(rawBuffer.toString('utf8'));
    } catch (err) {
      console.error('❌ Failed to parse JSON from raw buffer:', err.message);
      return;
    }

    if (!body || body.object !== 'page') return;

    // Process leadgen changes
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'leadgen' && change.value && change.value.leadgen_id) {
          const leadId = change.value.leadgen_id;
          console.log('📬 Received leadgen id:', leadId);

          // Get current PAGE_ACCESS_TOKEN from env or DB
          let PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
          if (!PAGE_ACCESS_TOKEN) {
            const tokenRecord = await FbAccessToken.findOne();
            PAGE_ACCESS_TOKEN = tokenRecord?.newAccessToken || PAGE_ACCESS_TOKEN;
          }

          if (!PAGE_ACCESS_TOKEN) {
            console.error('❌ PAGE_ACCESS_TOKEN missing. Cannot fetch lead details.');
            continue;
          }

          // Fetch lead details from Graph API
          try {
            const url = `https://graph.facebook.com/v17.0/${leadId}?access_token=${encodeURIComponent(PAGE_ACCESS_TOKEN)}&fields=id,created_time,field_data,ad_id,ad_name,form_id`;
            const leadResp = await axios.get(url);
            const leadData = leadResp.data;
            console.log('🔎 Lead details fetched:', leadData);

            // Optionally fetch ad -> campaign details to get campaign name
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

            // Save lead (re-uses your existing logic in auth-route)
            await processAndSaveLead(leadData, { campaign_Name: campaignName, ad_Name: leadData.ad_name || '', source: 'webhook' });
          } catch (err) {
            console.error('❌ Error fetching lead details from Graph API:', err.response?.data || err.message);
          }
        } // end leadgen handler
      } // end changes loop
    } // end entries loop
  } catch (err) {
    console.error('❌ Error handling webhook POST:', err.message || err);
  }
});

module.exports = router;