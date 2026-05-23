const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/news', require('./routes/news'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/rss', require('./routes/rss'));
app.use('/api/subscribers', require('./routes/subscribers'));

// Stats endpoint
app.get('/api/stats', (req, res) => {
  const { getDB } = require('./db');
  const db = getDB();
  res.json({
    news: db.news.filter(n => n.status === 'published').length,
    scholarships: db.news.filter(n => db.categories.find(c => c.id === n.category_id)?.slug === 'scholarship' && n.status === 'published').length,
    jobs: db.news.filter(n => db.categories.find(c => c.id === n.category_id)?.slug === 'job' && n.status === 'published').length,
    contacts: db.contacts.length,
    subscribers: db.subscribers.length
  });
});

// Subscriber endpoint
app.post('/api/subscribe', (req, res) => {
  const { getDB, save, newId } = require('./db');
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
  const db = getDB();
  if (!db.subscribers.find(s => s.email === email)) {
    db.subscribers.push({ id: newId('subscribers'), email, is_active: 1, created_at: new Date().toISOString() });
    save();
  }
  res.json({ message: 'تم الاشتراك بنجاح' });
});

// Upload endpoint
const multer = require('multer');
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع الملف' });
  res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename });
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..')));

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'الرابط غير موجود' });
  }
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Seed admin on first run
const { getDB } = require('./db');
getDB();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MYSTUDIES Server running on http://0.0.0.0:${PORT}`);
  console.log(`📰 Admin: http://localhost:${PORT}/admin/`);
  console.log(`🔐 Login: admin@mystudies.ma / admin123`);
});
