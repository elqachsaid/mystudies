const express = require('express');
const { getDB, save, newId } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

function enrichNews(n, db) {
  const cat = db.categories.find(c => c.id === n.category_id);
  return {
    ...n,
    cat_slug: cat?.slug || '',
    cat_name: cat?.name_ar || '',
    cat_icon: cat?.icon || 'fa-newspaper',
    cat_color: cat?.color || 'primary',
    saves_count: db.saved_articles.filter(s => s.news_id === n.id).length
  };
}

router.get('/', (req, res) => {
  const db = getDB();
  let news = db.news.filter(n => n.status === 'published');
  const { category, subcategory, search, page = 1, limit = 20, featured } = req.query;

  if (category) news = news.filter(n => { const c = db.categories.find(cat => cat.id === n.category_id); return c?.slug === category; });
  if (subcategory) news = news.filter(n => n.subcategory === subcategory);
  if (featured === 'true') news = news.filter(n => n.featured);
  if (search) {
    const q = search.toLowerCase();
    news = news.filter(n => n.title?.toLowerCase().includes(q) || n.excerpt?.toLowerCase().includes(q));
  }

  const total = news.length;
  news.sort((a, b) => {
    if (b.top_news !== a.top_news) return b.top_news - a.top_news;
    if (b.featured !== a.featured) return b.featured - a.featured;
    return new Date(b.created_at) - new Date(a.created_at);
  });
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const paged = news.slice(offset, offset + parseInt(limit));

  res.json({ news: paged.map(n => enrichNews(n, db)), total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const article = db.news.find(n => n.id === parseInt(req.params.id));
  if (!article) return res.status(404).json({ error: 'الخبر غير موجود' });
  article.views = (article.views || 0) + 1;
  save();
  res.json(enrichNews(article, db));
});

router.post('/', authMiddleware, (req, res) => {
  const db = getDB();
  const { title, excerpt, content, category_id, subcategory, image, source, source_url, featured, top_news, status } = req.body;
  if (!title) return res.status(400).json({ error: 'العنوان مطلوب' });
  const article = {
    id: newId('news'),
    title, excerpt: excerpt || '', content: content || '',
    category_id: category_id || null, subcategory: subcategory || '',
    image: image || '', source: source || 'MYSTUDIES', source_url: source_url || '',
    author_id: req.user.id, featured: featured ? 1 : 0, top_news: top_news ? 1 : 0,
    status: status || 'published', views: 0,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  };
  db.news.push(article);
  save();
  res.status(201).json(article);
});

router.put('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const idx = db.news.findIndex(n => n.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'الخبر غير موجود' });
  const { title, excerpt, content, category_id, subcategory, image, source, source_url, featured, top_news, status } = req.body;
  const article = db.news[idx];
  if (title !== undefined) article.title = title;
  if (excerpt !== undefined) article.excerpt = excerpt;
  if (content !== undefined) article.content = content;
  if (category_id !== undefined) article.category_id = category_id;
  if (subcategory !== undefined) article.subcategory = subcategory;
  if (image !== undefined) article.image = image;
  if (source !== undefined) article.source = source;
  if (source_url !== undefined) article.source_url = source_url;
  if (featured !== undefined) article.featured = featured ? 1 : 0;
  if (top_news !== undefined) article.top_news = top_news ? 1 : 0;
  if (status !== undefined) article.status = status;
  article.updated_at = new Date().toISOString();
  save();
  res.json(article);
});

router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const idx = db.news.findIndex(n => n.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'الخبر غير موجود' });
  db.news.splice(idx, 1);
  save();
  res.json({ message: 'تم الحذف بنجاح' });
});

router.get('/admin/all', authMiddleware, (req, res) => {
  const db = getDB();
  let news = [...db.news];
  const { page = 1, limit = 20, status } = req.query;
  if (status) news = news.filter(n => n.status === status);
  const total = news.length;
  news.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const paged = news.slice(offset, offset + parseInt(limit)).map(n => {
    const cat = db.categories.find(c => c.id === n.category_id);
    const author = db.users.find(u => u.id === n.author_id);
    return { ...n, cat_slug: cat?.slug || '', cat_name: cat?.name_ar || '', author_name: author?.name || '' };
  });
  res.json({ news: paged, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

module.exports = router;
