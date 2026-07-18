const nodemailer = require('nodemailer');
const Notification = require('../models/Notification.model');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

let twilioClient = null;
if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
  const twilio = require('twilio');
  twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
}

const sendEmail = async (to, subject, html) => {
  if (!process.env.EMAIL_USER) return;
  try {
    await transporter.sendMail({ from: `BESCOM LC <${process.env.EMAIL_USER}>`, to, subject, html });
  } catch (err) { console.error('Email failed:', err.message); }
};

const sendSMS = async (to, body) => {
  if (!twilioClient || !to) return;
  try {
    await twilioClient.messages.create({ body, from: process.env.TWILIO_FROM, to });
  } catch (err) { console.error('SMS failed:', err.message); }
};

const getDisplayNumber = (lc) => lc?.lcNumber || lc?.requestNumber || 'LC';

const lcEmailTemplate = ({ title, lcNumber, feeder, message, actionUrl }) => `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
  <div style="background:#1D4ED8;padding:16px 24px;border-radius:8px;margin-bottom:20px;">
    <h2 style="color:#fff;margin:0;font-size:18px;">⚡ BESCOM Line Clear System</h2>
  </div>
  <h3 style="color:#111;margin-top:0;">${title}</h3>
  <table style="width:100%;margin-bottom:16px;">
    <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">LC Number</td><td style="font-weight:600;">${lcNumber}</td></tr>
    <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Feeder</td><td>${feeder}</td></tr>
  </table>
  <p style="color:#374151;font-size:14px;">${message}</p>
  ${actionUrl ? `<a href="${actionUrl}" style="display:inline-block;background:#1D4ED8;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">View Details</a>` : ''}
</div>`;

const notify = async ({ recipients, lc, title, message, type = 'INFO' }) => {
  if (!Array.isArray(recipients)) recipients = [recipients];
  const displayNumber = getDisplayNumber(lc);
  for (const user of recipients) {
    if (!user) continue;
    try {
      await Notification.create({ recipient: user._id, lc: lc._id, lcNumber: displayNumber, title, message, type, channel: 'APP' });
    } catch (e) { console.error('In-app notif failed:', e.message); }
    if (user.notifyEmail && user.email) {
      await sendEmail(user.email, `[BESCOM LC] ${title} - ${displayNumber}`,
        lcEmailTemplate({ title, lcNumber: displayNumber, feeder: lc.feeder, message, actionUrl: `${process.env.CLIENT_URL}/lc/${lc._id}` }));
    }
    if (user.notifySMS && user.phone) {
      await sendSMS(user.phone, `BESCOM LC: ${title} | ${displayNumber} | ${lc.feeder}`);
    }
  }
};

module.exports = {
  notify,
  notifyLCInitiated: (lc, approvers) => notify({ recipients: approvers, lc, title: 'New LC Request', message: `New request ${getDisplayNumber(lc)} for ${lc.feeder}. Please approve.`, type: 'ACTION_REQUIRED' }),
  notifyLCApproved: (lc, user) => notify({ recipients: [user], lc, title: 'LC Approved', message: `Your request ${getDisplayNumber(lc)} for ${lc.feeder} is approved. Awaiting LC issuance.`, type: 'INFO' }),
  notifyJEReviewed: (lc, users) => notify({ recipients: users, lc, title: 'LC Issued - Action Required', message: `LC ${getDisplayNumber(lc)} issued for ${lc.feeder}. Secret code generated. Assign to lineman.`, type: 'ACTION_REQUIRED' }),
  notifyDelegated: (lc, user) => notify({ recipients: [user], lc, title: 'Work Assigned', message: `You are assigned to ${lc.feeder}. Get secret code from your SO.`, type: 'ACTION_REQUIRED' }),
  notifyWorkComplete: (lc, user) => notify({ recipients: [user], lc, title: 'Field Work Complete', message: `Work done on ${lc.feeder}. Submit close request.`, type: 'ACTION_REQUIRED' }),
  notifyCloseRequested: (lc, users) => notify({ recipients: users, lc, title: 'Close Request', message: `${lc.feeder} area cleared. Remove earth and restore CB.`, type: 'ACTION_REQUIRED' }),
  notifyLCReleased: (lc, users) => notify({ recipients: users, lc, title: 'LC Released - Awaiting Feeder Energization', message: `LC ${getDisplayNumber(lc)} released for ${lc.feeder}. Feeder energization pending final clearance.`, type: 'INFO' }),
  notifyFeederEnergized: (lc, users) => notify({ recipients: users, lc, title: 'Feeder Energized', message: `${lc.feeder} energized after all pending LCs were cleared.`, type: 'SUCCESS' }),
  notifyLCDelegated: (lc, shiftJEs) => notify({ recipients: shiftJEs, lc, title: 'LC Delegated', message: `LC ${getDisplayNumber(lc)} delegated for ${lc.natureOfWork}. Review and take action.`, type: 'ACTION_REQUIRED' }),
};
