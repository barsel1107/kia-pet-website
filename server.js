const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const config = require('./config');

const DATA_FILE = path.join(__dirname, 'appointments.json');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function loadAppointments() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function saveAppointments(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
}


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_APP_PASSWORD
  }
});

function sendPlainMail(to, subject, text) {
  return transporter.sendMail({
    from: `"${config.SITE_NAME}" <${config.EMAIL_USER}>`,
    to,
    subject,
    text 
  });
}

function sendVetNotification(appointment) {
  const approveUrl = `${config.BASE_URL}/api/appointments/${appointment.id}/approve?token=${appointment.token}`;
  const rejectUrl = `${config.BASE_URL}/appointments/${appointment.id}/reject-form?token=${appointment.token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #2C2620; max-width: 520px;">
      <h2 style="color:#37473B; margin-bottom: 4px;">Yeni Randevu Talebi</h2>
      <p style="color:#5B5147; margin-top:0;">${config.SITE_NAME}</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding:6px 0; color:#5B5147;">E-posta</td><td style="padding:6px 0;"><strong>${escapeHtml(appointment.email)}</strong></td></tr>
        <tr><td style="padding:6px 0; color:#5B5147;">Telefon</td><td style="padding:6px 0;">${escapeHtml(appointment.phone || '-')}</td></tr>
        <tr><td style="padding:6px 0; color:#5B5147;">Hayvan Cinsi</td><td style="padding:6px 0;">${escapeHtml(appointment.species || '-')}</td></tr>
        <tr><td style="padding:6px 0; color:#5B5147;">Irkı</td><td style="padding:6px 0;">${escapeHtml(appointment.breed || '-')}</td></tr>
        <tr><td style="padding:6px 0; color:#5B5147;">İşlem</td><td style="padding:6px 0;">${escapeHtml(appointment.service || '-')}</td></tr>
        <tr><td style="padding:6px 0; color:#5B5147;">Tarih / Saat</td><td style="padding:6px 0;">${escapeHtml(appointment.date)} - ${escapeHtml(appointment.time)}</td></tr>
        <tr><td style="padding:6px 0; color:#5B5147; vertical-align:top;">Mesaj</td><td style="padding:6px 0;">${escapeHtml(appointment.message || '-')}</td></tr>
      </table>
      <div style="margin-top: 24px;">
        <a href="${approveUrl}" style="display:inline-block; background:#4C6350; color:#fff; padding:12px 22px; border-radius:6px; text-decoration:none; font-weight:bold; margin-right: 12px;">✅ Onayla</a>
        <a href="${rejectUrl}" style="display:inline-block; background:#AD5C48; color:#fff; padding:12px 22px; border-radius:6px; text-decoration:none; font-weight:bold;">❌ Reddet</a>
      </div>
    </div>
  `;

  return transporter.sendMail({
    from: `"${config.SITE_NAME} Randevu" <${config.EMAIL_USER}>`,
    to: config.EMAIL_USER,
    subject: `Yeni Randevu Talebi - ${appointment.date} ${appointment.time}`,
    html
  });
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}



function renderPage(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body{font-family:Arial,sans-serif;background:#F7F1E8;color:#2C2620;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;}
  .box{background:#fff;border:1px solid #DCCFBE;border-radius:12px;padding:32px;max-width:420px;width:100%;}
  h1{font-size:1.3rem;color:#37473B;margin-top:0;}
  textarea{width:100%;min-height:110px;padding:10px;border:1px solid #DCCFBE;border-radius:8px;font-family:inherit;font-size:0.95rem;box-sizing:border-box;}
  button{background:#AD5C48;color:#fff;border:none;padding:12px 20px;border-radius:8px;font-size:0.95rem;font-weight:bold;cursor:pointer;margin-top:12px;}
  button:hover{background:#8F4536;}
  p{color:#5B5147;}
</style>
</head><body><div class="box">${bodyHtml}</div></body></html>`;
}



app.post('/api/appointments', async function (req, res) {
  try {
    const { email, phone, species, breed, service, date, time, message } = req.body;

    if (!email || !date || !time) {
      return res.status(400).json({ ok: false, error: 'E-posta, tarih ve saat zorunludur.' });
    }

    const appointment = {
      id: crypto.randomUUID(),
      token: crypto.randomBytes(16).toString('hex'),
      status: 'pending',
      createdAt: new Date().toISOString(),
      email,
      phone: phone || '',
      species: species || '',
      breed: breed || '',
      service: service || '',
      date,
      time,
      message: message || ''
    };

    const appointments = loadAppointments();
    appointments.push(appointment);
    saveAppointments(appointments);

    await sendVetNotification(appointment);

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Randevu oluşturma hatası:', err);
    res.status(500).json({ ok: false, error: 'Sunucu hatası.' });
  }
});


app.get('/api/appointments/:id/approve', async function (req, res) {
  const { id } = req.params;
  const { token } = req.query;

  const appointments = loadAppointments();
  const appointment = appointments.find(function (a) { return a.id === id; });

  if (!appointment || appointment.token !== token) {
    return res.status(400).send(renderPage('Geçersiz Bağlantı', '<h1>Geçersiz bağlantı</h1><p>Bu randevu bulunamadı veya bağlantı geçersiz.</p>'));
  }

  if (appointment.status !== 'pending') {
    return res.send(renderPage('Zaten İşlendi', `<h1>Bu randevu zaten işlendi</h1><p>Mevcut durum: <strong>${appointment.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}</strong></p>`));
  }

  appointment.status = 'approved';
  saveAppointments(appointments);

  try {
    await sendPlainMail(
      appointment.email,
      `${config.SITE_NAME} randevu durumu`,
      `Randevunuz onaylandı!\n\nTarih: ${appointment.date}\nSaat: ${appointment.time}\nİşlem: ${appointment.service || '-'}\n\nSizi salonumuzda görmekten mutluluk duyarız.\n\n${config.SITE_NAME}`
    );
  } catch (err) {
    console.error('Onay maili gönderilemedi:', err);
  }

  res.send(renderPage('Randevu Onaylandı', '<h1>Randevu onaylandı ✅</h1><p>Müşteriye bilgilendirme e-postası gönderildi.</p>'));
});



app.get('/appointments/:id/reject-form', function (req, res) {
  const { id } = req.params;
  const { token } = req.query;

  const appointments = loadAppointments();
  const appointment = appointments.find(function (a) { return a.id === id; });

  if (!appointment || appointment.token !== token) {
    return res.status(400).send(renderPage('Geçersiz Bağlantı', '<h1>Geçersiz bağlantı</h1><p>Bu randevu bulunamadı veya bağlantı geçersiz.</p>'));
  }

  if (appointment.status !== 'pending') {
    return res.send(renderPage('Zaten İşlendi', `<h1>Bu randevu zaten işlendi</h1><p>Mevcut durum: <strong>${appointment.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}</strong></p>`));
  }

  const body = `
    <h1>Randevuyu Reddet</h1>
    <p>${escapeHtml(appointment.email)} - ${escapeHtml(appointment.date)} ${escapeHtml(appointment.time)}</p>
    <form method="POST" action="/api/appointments/${appointment.id}/reject">
      <input type="hidden" name="token" value="${appointment.token}">
      <textarea name="reason" placeholder="Örn: Merhaba, ilginiz için teşekkür ederim. Maalesef seçtiğiniz tarihte boşluk yoktur." required></textarea>
      <br>
      <button type="submit">Reddet ve Gönder</button>
    </form>
  `;

  res.send(renderPage('Randevuyu Reddet', body));
});


app.post('/api/appointments/:id/reject', async function (req, res) {
  const { id } = req.params;
  const { token, reason } = req.body;

  const appointments = loadAppointments();
  const appointment = appointments.find(function (a) { return a.id === id; });

  if (!appointment || appointment.token !== token) {
    return res.status(400).send(renderPage('Geçersiz Bağlantı', '<h1>Geçersiz bağlantı</h1><p>Bu randevu bulunamadı veya bağlantı geçersiz.</p>'));
  }

  if (appointment.status !== 'pending') {
    return res.send(renderPage('Zaten İşlendi', `<h1>Bu randevu zaten işlendi</h1><p>Mevcut durum: <strong>${appointment.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}</strong></p>`));
  }

  appointment.status = 'rejected';
  appointment.reason = reason || '';
  saveAppointments(appointments);

  try {
    await sendPlainMail(
      appointment.email,
      `${config.SITE_NAME} randevu durumu`,
      `Randevunuz maalesef onaylanmadı.\n\n${reason || 'Belirtilen tarihte uygun randevu bulunmuyor.'}\n\nBaşka bir tarih için bizimle tekrar iletişime geçebilirsiniz.\n\n${config.SITE_NAME}`
    );
  } catch (err) {
    console.error('Red maili gönderilemedi:', err);
  }

  res.send(renderPage('Randevu Reddedildi', '<h1>Randevu reddedildi</h1><p>Müşteriye bilgilendirme e-postası gönderildi.</p>'));
});

app.listen(config.PORT, function () {
  console.log(`Randevu sunucusu ${config.PORT} portunda çalışıyor: http://localhost:${config.PORT}`);
});
