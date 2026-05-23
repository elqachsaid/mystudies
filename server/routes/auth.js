const express = require('express');
const bcrypt = require('bcryptjs');
const { getDB, save, newId } = require('../db');
const { generateToken, authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
  }
  const db = getDB();
  const user = db.users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'بريد إلكتروني أو كلمة مرور غير صحيحة' });
  }
  const token = generateToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
  });
});

router.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }
  const db = getDB();
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const user = { id: newId('users'), name, email, password: hash, role: 'editor', avatar: '', created_at: new Date().toISOString() };
  db.users.push(user);
  save();
  const token = generateToken(user);
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

router.get('/me', authMiddleware, (req, res) => {
  const db = getDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
  const { password, ...safe } = user;
  res.json(safe);
});

router.put('/profile', authMiddleware, (req, res) => {
  const { name, avatar } = req.body;
  const db = getDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
  if (name) user.name = name;
  if (avatar !== undefined) user.avatar = avatar;
  save();
  res.json({ message: 'تم التحديث' });
});

router.put('/password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }
  const db = getDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
  }
  user.password = bcrypt.hashSync(newPassword, 10);
  save();
  res.json({ message: 'تم تغيير كلمة المرور' });
});

module.exports = router;
