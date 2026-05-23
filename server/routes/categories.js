const express = require('express');
const { getDB, save, newId } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/', (req, res) => {
  const db = getDB();
  const cats = db.categories.map(c => ({
    ...c,
    news_count: db.news.filter(n => n.category_id === c.id && n.status === 'published').length
  }));
  res.json(cats);
});

router.post('/', authMiddleware, (req, res) => {
  const { slug, name_ar, name_en, icon, color } = req.body;
  if (!slug || !name_ar) return res.status(400).json({ error: 'Slug والاسم بالعربية مطلوبان' });
  const db = getDB();
  db.categories.push({ id: newId('categories'), slug, name_ar, name_en: name_en || '', icon: icon || 'fa-newspaper', color: color || 'primary', created_at: new Date().toISOString() });
  save();
  res.status(201).json({ message: 'تمت الإضافة' });
});

router.put('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const cat = db.categories.find(c => c.id === parseInt(req.params.id));
  if (!cat) return res.status(404).json({ error: 'غير موجود' });
  const { slug, name_ar, name_en, icon, color } = req.body;
  if (slug) cat.slug = slug;
  if (name_ar) cat.name_ar = name_ar;
  if (name_en) cat.name_en = name_en;
  if (icon) cat.icon = icon;
  if (color) cat.color = color;
  save();
  res.json({ message: 'تم التحديث' });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const idx = db.categories.findIndex(c => c.id === parseInt(req.params.id));
  if (idx !== -1) db.categories.splice(idx, 1);
  save();
  res.json({ message: 'تم الحذف' });
});

module.exports = router;
