const express = require('express');
const { getDB, save, newId } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const RssParser = require('rss-parser');
const router = express.Router();

const rssParser = new RssParser({ timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });

// ===== Google News Search عن طريق keywords =====
const KEYWORD_FEEDS = [
  { keywords: 'المنح الدراسية المغرب', category_slug: 'scholarship', source_name: 'Google News - منح' },
  { keywords: 'منحة دراسية للطلاب', category_slug: 'scholarship', source_name: 'Google News - منح' },
  { keywords: 'مباريات التوظيف المغرب 2026', category_slug: 'job', source_name: 'Google News - وظائف' },
  { keywords: 'تشغيل المغرب fonction publique', category_slug: 'job', source_name: 'Google News - وظائف' },
  { keywords: 'أخبار التعليم المغرب', category_slug: 'education', source_name: 'Google News - تعليم' },
  { keywords: 'وزارة التربية الوطنية المغرب', category_slug: 'education', source_name: 'Google News - تعليم' },
  { keywords: 'التدريب المهني المغرب', category_slug: 'internship', source_name: 'Google News - تدريب' },
  { keywords: 'فرص التدريب المغرب stages', category_slug: 'internship', source_name: 'Google News - تدريب' },
  { keywords: 'التوجيه الدراسي المغرب', category_slug: 'guidance', source_name: 'Google News - توجيه' },
  { keywords: 'امتحانات البكالوريا المغرب', category_slug: 'education', source_name: 'Google News - امتحانات' }
];

// ===== RSS Feeds المباشرة =====
const RSS_FEEDS = [
  { url: 'https://www.maroc.ma/ar/rss.xml', category_slug: 'education', source_name: 'المغرب العربي' }
];

// ===== جلب الأخبار تلقائياً من كل المصادر =====
router.post('/fetch', async (req, res) => {
  const db = getDB();
  let fetched = 0;
  let errors = [];

  // 1. جلب من Google News RSS (بحث بالكلمات المفتاحية)
  for (const feed of KEYWORD_FEEDS) {
    try {
      const searchUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(feed.keywords)}&hl=ar&gl=MA&ceid=MA:ar`;
      const data = await rssParser.parseURL(searchUrl);
      if (!data?.items?.length) continue;
      const category = db.categories.find(c => c.slug === feed.category_slug);
      if (!category) continue;
      for (const item of data.items.slice(0, 5)) {
        const title = (item.title || '').replace(/^[^:]+:\s*/, '');
        if (!title || title.length < 10 || db.news.some(n => n.title === title)) continue;
        const excerpt = (item.contentSnippet || item.content || '').replace(/<[^>]*>/g, '').slice(0, 300);
        const content = (item.content || item.contentSnippet || excerpt).replace(/<[^>]*>/g, '');
        const image = '';
        const link = item.link || '';
        const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
        db.news.push({
          id: newId('news'), title, excerpt, content: content || excerpt,
          category_id: category.id, subcategory: '', image,
          source: feed.source_name, source_url: link,
          author_id: null, featured: 0, top_news: 0,
          status: 'published', views: 0,
          created_at: pubDate, updated_at: pubDate
        });
        fetched++;
      }
    } catch (e) {
      errors.push(`${feed.keywords}: ${e.message}`);
    }
  }

  // 2. جلب من RSS Feeds المباشرة
  for (const feed of RSS_FEEDS) {
    try {
      const data = await rssParser.parseURL(feed.url);
      if (!data?.items) continue;
      const category = db.categories.find(c => c.slug === feed.category_slug);
      if (!category) continue;
      for (const item of data.items.slice(0, 5)) {
        const title = item.title || '';
        if (!title || db.news.some(n => n.title === title)) continue;
        const excerpt = (item.contentSnippet || item.content || '').slice(0, 300);
        const content = item.content || item.contentSnippet || '';
        const link = item.link || '';
        const date = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
        db.news.push({
          id: newId('news'), title, excerpt, content: content || excerpt,
          category_id: category.id, subcategory: '',
          image: '', source: feed.source_name, source_url: link,
          author_id: null, featured: 0, top_news: 0,
          status: 'published', views: 0,
          created_at: date, updated_at: date
        });
        fetched++;
      }
    } catch (e) {
      errors.push(`${feed.source_name}: ${e.message}`);
    }
  }

  save();
  const msg = `✅ تم جلب ${fetched} خبر جديد`;
  const errMsg = errors.length ? `\n⚠️ فشل ${errors.length} مصدر (طبيعي - قد تكون محجوبة)` : '';
  res.json({ message: msg + errMsg, fetched, errors: errors.length });
});

// ===== جلب حسب كلمة مفتاحية مخصصة =====
router.post('/search', async (req, res) => {
  const { keywords, category_slug } = req.body;
  if (!keywords) return res.status(400).json({ error: 'الكلمة المفتاحية مطلوبة' });
  const db = getDB();
  let fetched = 0;
  try {
    const searchUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keywords)}&hl=ar&gl=MA&ceid=MA:ar`;
    const data = await rssParser.parseURL(searchUrl);
    const category = category_slug ? db.categories.find(c => c.slug === category_slug) : db.categories[0];
    if (!category) return res.status(400).json({ error: 'التصنيف غير موجود' });
    const results = [];
    for (const item of (data?.items || []).slice(0, 15)) {
      const title = (item.title || '').replace(/^[^:]+:\s*/, '');
      if (!title || title.length < 10 || db.news.some(n => n.title === title)) continue;
      const excerpt = (item.contentSnippet || item.content || '').replace(/<[^>]*>/g, '').slice(0, 200);
      results.push({ title, excerpt, source_url: item.link, date: item.pubDate });
    }
    res.json({ results, count: results.length });
  } catch (e) {
    res.status(500).json({ error: 'فشل البحث: ' + e.message });
  }
});

// ===== حفظ نتائج البحث كأخبار =====
router.post('/save-search', authMiddleware, async (req, res) => {
  const { articles, category_slug } = req.body;
  if (!articles?.length) return res.status(400).json({ error: 'لا توجد مقالات' });
  const db = getDB();
  const category = db.categories.find(c => c.slug === category_slug);
  if (!category) return res.status(400).json({ error: 'التصنيف غير موجود' });
  let saved = 0;
  for (const article of articles) {
    if (!article.title || db.news.some(n => n.title === article.title)) continue;
    db.news.push({
      id: newId('news'),
      title: article.title,
      excerpt: (article.excerpt || article.title).slice(0, 300),
      content: article.excerpt || article.title,
      category_id: category.id,
      subcategory: article.subcategory || '',
      image: article.image || '',
      source: article.source || 'Google News',
      source_url: article.source_url || '',
      author_id: req.user.id,
      featured: 0, top_news: 0,
      status: 'published', views: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    saved++;
  }
  save();
  res.json({ message: `✅ تم حفظ ${saved} خبر` });
});

router.get('/sources', (req, res) => {
  res.json({
    keywords: KEYWORD_FEEDS.map(f => ({ keywords: f.keywords, category: f.category_slug, source: f.source_name })),
    feeds: RSS_FEEDS
  });
});

router.post('/sources', authMiddleware, (req, res) => {
  const { type, keywords, url, category_slug, source_name } = req.body;
  if (type === 'keyword' && keywords) {
    KEYWORD_FEEDS.push({ keywords, category_slug: category_slug || 'education', source_name: source_name || 'مصدر جديد' });
  } else if (type === 'rss' && url) {
    RSS_FEEDS.push({ url, category_slug: category_slug || 'education', source_name: source_name || 'مصدر RSS' });
  } else {
    return res.status(400).json({ error: 'بيانات غير صحيحة' });
  }
  res.json({ message: 'تمت الإضافة' });
});

module.exports = router;
