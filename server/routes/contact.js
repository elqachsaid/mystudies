const express = require('express');
const { getDB, save, newId } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.post('/', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'الاسم والبريد الإلكتروني والرسالة مطلوبة' });
  }
  const db = getDB();
  db.contacts.push({
    id: newId('contacts'), name, email, subject: subject || '', message,
    is_read: 0, created_at: new Date().toISOString()
  });
  save();
  res.status(201).json({ message: 'تم إرسال رسالتك بنجاح' });
});

router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  const { page = 1, limit = 20 } = req.query;
  let msgs = [...db.contacts].reverse();
  const total = msgs.length;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  res.json({ messages: msgs.slice(offset, offset + parseInt(limit)), total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

router.put('/:id/read', authMiddleware, (req, res) => {
  const db = getDB();
  const msg = db.contacts.find(m => m.id === parseInt(req.params.id));
  if (msg) msg.is_read = 1;
  save();
  res.json({ message: 'تم تحديث الحالة' });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const idx = db.contacts.findIndex(m => m.id === parseInt(req.params.id));
  if (idx !== -1) db.contacts.splice(idx, 1);
  save();
  res.json({ message: 'تم الحذف بنجاح' });
});

module.exports = router;
