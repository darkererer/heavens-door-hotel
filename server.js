const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static website files (HTML, CSS, JS, images) from this folder
app.use(express.static(path.join(__dirname)));

// Basic health check
app.get('/health', (req, res) => res.json({ ok: true }));

// Root -> index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Configure transporter via environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

app.post('/api/book', async (req, res) => {
  try {
    const data = req.body || {};
    console.log('Received booking request:', JSON.stringify(data));
    // Derive room name only from the Referer HTML filename (ignore client-sent room)
    const clientRoom = (data.room || data.roomName || data.bookingRoom || data.room_name || '').toString();
    let finalRoom = '';
    try {
      const referer = req.get('Referer') || req.get('referrer') || '';
      if (referer) {
        const url = new URL(referer);
        const page = url.pathname.split('/').pop() || ''; // e.g. kingroom.html
        const filename = page.replace(/\.html$/i, '');
        let inferred = filename.replace(/[-_]+/g, ' ');
        inferred = inferred.replace(/([a-z])([A-Z])/g, '$1 $2');
        inferred = inferred.replace(/room$/i, ' room');
        inferred = inferred.split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (inferred) finalRoom = inferred;
      }
    } catch (e) {
      // ignore URL parse errors
    }

    // Prefer the client-sent hidden room name when provided; otherwise use the Referer-derived name
    const refererHeader = req.get('Referer') || req.get('referrer') || '';
    const trimmedClientRoom = (clientRoom || '').trim();
    let displayRoom = trimmedClientRoom || finalRoom || 'N/A';
    data.room = trimmedClientRoom || finalRoom || '';
    // Tiny debug log: Referer header, client-sent room, inferred room, and final display value
    console.log('Booking referer:', refererHeader, '| clientRoom:', trimmedClientRoom, '| inferredRoom:', finalRoom, '| displayRoom:', displayRoom);
    if (!data.name || !data.email || !data.checkin || !data.checkout) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hotelName = process.env.HOTEL_NAME || 'Heaven\'s Door';
    const html = `
      <div style="font-family: Arial,Helvetica,sans-serif; color: #333;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;border:1px solid #e6e6e6;">
          <tr style="background:#003366;color:#fff;">
            <td style="padding:20px;text-align:left;">
              <h2 style="margin:0;font-size:20px;">${hotelName}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:20px;">
              <h3 style="margin-top:0;color:#111;">Reservation Confirmation</h3>
              <p>Dear ${data.name},</p>
              <p>Thank you for choosing ${hotelName}. We have received your reservation request — details are below.</p>

              <table cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;">
                <tr style="background:#f7f7f7;"><td><strong>Room</strong></td><td>${displayRoom}</td></tr>
                <tr><td><strong>Check-in</strong></td><td>${data.checkin}</td></tr>
                <tr style="background:#f7f7f7;"><td><strong>Check-out</strong></td><td>${data.checkout}</td></tr>
                <tr><td><strong>Guests</strong></td><td>${data.adults || '1'} adult(s), ${data.children || '0'} child(ren)</td></tr>
                <tr style="background:#f7f7f7;"><td><strong>Phone</strong></td><td>${data.phone || 'N/A'}</td></tr>
                <tr><td><strong>Promo code</strong></td><td>${data.promo || '—'}</td></tr>
              </table>

              <p style="margin-top:12px;"><strong>Special requests:</strong><br>${data.message ? data.message.replace(/\n/g, '<br>') : 'None'}</p>

              <p>Our reservations team will review your request and contact you shortly to confirm availability and any payment details.</p>

              <p>If you need to make changes, reply to this email or contact us at ${process.env.ADMIN_EMAIL || ''}.</p>

              <p style="margin-bottom:0;">Warm regards,<br><strong>${hotelName} Reservations</strong></p>
            </td>
          </tr>
          <tr style="background:#f2f2f2;color:#666;font-size:12px;">
            <td style="padding:12px;text-align:center;">This is an automated message — please do not reply to this address.</td>
          </tr>
        </table>
      </div>
    `;

    // plain-text fallback for guest
    const text = `Reservation confirmation\n\n${hotelName}\nGuest: ${data.name}\nRoom: ${displayRoom}\nCheck-in: ${data.checkin}\nCheck-out: ${data.checkout}\nGuests: ${data.adults || '1'} adult(s), ${data.children || '0'} child(ren)\nPhone: ${data.phone || 'N/A'}\n\nSpecial requests:\n${data.message || 'None'}\n\nWe will contact you shortly to confirm availability and payment.`;

    // send confirmation to guest (html + text)
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: data.email,
      subject: `Reservation received — ${displayRoom}`,
      text,
      html
    });

    // notify admin/hotel with detailed template
    if (process.env.ADMIN_EMAIL) {
      const adminHtml = `
        <div style="font-family: Arial,Helvetica,sans-serif; color:#333;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;margin:0 auto;border:1px solid #e6e6e6;">
            <tr style="background:#003366;color:#fff;">
              <td style="padding:16px;">
                <h2 style="margin:0; font-size:18px;">${hotelName} — New Reservation</h2>
              </td>
            </tr>
            <tr>
              <td style="padding:16px;">
                <p style="margin:0 0 12px 0;">A new reservation request has been submitted. Details below:</p>
                <table cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;">
                  <tr style="background:#f7f7f7;"><td><strong>Guest name</strong></td><td>${data.name}</td></tr>
                  <tr><td><strong>Email</strong></td><td><a href="mailto:${data.email}">${data.email}</a></td></tr>
                  <tr style="background:#f7f7f7;"><td><strong>Phone</strong></td><td>${data.phone || 'N/A'}</td></tr>
                  <tr><td><strong>Room</strong></td><td>${displayRoom}</td></tr>
                  <tr style="background:#f7f7f7;"><td><strong>Check-in</strong></td><td>${data.checkin}</td></tr>
                  <tr><td><strong>Check-out</strong></td><td>${data.checkout}</td></tr>
                  <tr style="background:#f7f7f7;"><td><strong>Guests</strong></td><td>${data.adults || '1'} adult(s), ${data.children || '0'} child(ren)</td></tr>
                  <tr><td><strong>Promo</strong></td><td>${data.promo || '—'}</td></tr>
                </table>

                <h4 style="margin-top:12px;">Special requests</h4>
                <p style="white-space:pre-wrap;border:1px solid #eee;padding:10px;background:#fafafa;">${data.message ? data.message.replace(/\n/g,'<br>') : 'None'}</p>

                <p style="font-size:12px;color:#666;margin-top:12px;">Submitted: ${new Date().toLocaleString()}</p>
                <p style="margin-top:12px;">Reply directly to the guest: <a href="mailto:${data.email}">${data.email}</a></p>
              </td>
            </tr>
            <tr style="background:#f2f2f2;color:#666;font-size:12px;">
              <td style="padding:12px;text-align:center;">Reservation system notification — ${hotelName}</td>
            </tr>
          </table>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: process.env.ADMIN_EMAIL,
        subject: `New reservation — ${data.name} (${displayRoom})`,
        text: `New reservation from ${data.name} - Room: ${displayRoom}\nCheck-in: ${data.checkin}\nCheck-out: ${data.checkout}\nPhone: ${data.phone || 'N/A'}\n\nSpecial requests:\n${data.message || 'None'}`,
        html: adminHtml
      });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to send email', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
});

//Contact

app.post('/api/feedback', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};

    console.log('Received feedback:', req.body);

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hotelName = process.env.HOTEL_NAME || "Heaven's Door";

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#333;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;border:1px solid #e6e6e6;">
          <tr style="background:#003366;color:#fff;">
            <td style="padding:16px;">
              <h2 style="margin:0;font-size:18px;">${hotelName} — New Feedback</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:16px;">
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              <p><strong>Subject:</strong> ${subject || '—'}</p>

              <h4 style="margin-top:12px;">Message</h4>
              <p style="white-space:pre-wrap;border:1px solid #eee;padding:10px;background:#fafafa;">
                ${message.replace(/\n/g, '<br>')}
              </p>

              <p style="font-size:12px;color:#666;margin-top:12px;">
                Submitted: ${new Date().toLocaleString()}
              </p>
            </td>
          </tr>
        </table>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: `Website Feedback — ${subject || name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to send feedback email', err);
    return res.status(500).json({ error: 'Failed to send feedback' });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
