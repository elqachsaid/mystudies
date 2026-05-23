const express = require('express');
const { getDB, save } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  const subs = [...db.subscribers].reverse();
  res.json({ subscribers: subs, total: subs.length });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const idx = db.subscribers.findIndex(s => s.id === parseInt(req.params.id));
  if (idx !== -1) db.subscribers.splice(idx, 1);
  save();
  res.json({ message: 'تم الحذف' });
});

module.exports = router;
