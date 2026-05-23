// ===== Navigation =====
let currentPage = 'home';
let currentFilters = {};
let allNews = [...NEWS_DATA];
const API_BASE = window.location.origin + '/api';
let apiAvailable = false;

async function checkApi() {
  try {
    const res = await fetch(API_BASE + '/news?limit=1', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      apiAvailable = true;
      await loadNewsFromApi();
    }
  } catch { apiAvailable = false; }
}

async function loadNewsFromApi() {
  try {
    const res = await fetch(API_BASE + '/news?limit=50');
    const data = await res.json();
    if (data.news && data.news.length > 0) {
      allNews = data.news.map(n => ({
        id: n.id,
        title: n.title,
        excerpt: n.excerpt,
        content: n.content,
        category: n.cat_slug || 'education',
        subcategory: n.subcategory || '',
        image: n.image || '',
        date: n.created_at ? n.created_at.split('T')[0] : '2026-05-23',
        source: n.source || 'MYSTUDIES',
        featured: !!n.featured,
        topNews: !!n.top_news
      }));
      renderHomeNews();
      renderAiSuggestions();
    }
  } catch {}
}

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav a').forEach(a => a.classList.remove('active'));
  const navLink = document.querySelector(`.nav a[data-page="${page}"]`);
  if (navLink) navLink.classList.add('active');
  document.querySelectorAll('.category-page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  closeMenu();
  if (page !== 'home') {
    renderCategoryGrid(page);
  }
}

function toggleMenu() {
  const nav = document.getElementById('mainNav');
  const btn = document.getElementById('menuBtn');
  nav.classList.toggle('open');
  btn.classList.toggle('active');
}

function closeMenu() {
  document.getElementById('mainNav').classList.remove('open');
  document.getElementById('menuBtn').classList.remove('active');
}

// ===== Search =====
function toggleSearch() {
  const overlay = document.getElementById('searchOverlay');
  const isActive = overlay.classList.contains('active');
  overlay.classList.toggle('active');
  if (!isActive) {
    setTimeout(() => document.getElementById('searchInput').focus(), 100);
  }
}

function closeSearchOutside(e) {
  if (e.target === e.currentTarget) toggleSearch();
}

function performSearch(query) {
  const results = document.getElementById('searchResults');
  if (!query.trim()) {
    results.innerHTML = '';
    return;
  }
  const q = query.toLowerCase();
  const matches = allNews.filter(item =>
    item.title.includes(q) || item.excerpt.includes(q) || item.content.includes(q)
  );
  if (matches.length === 0) {
    results.innerHTML = `
      <div class="search-no-results">
        <i class="fas fa-search"></i>
        <h3>لا توجد نتائج</h3>
        <p>لم نعثر على نتائج مطابقة لـ "${query}"</p>
      </div>`;
    return;
  }
  results.innerHTML = matches.slice(0, 8).map(item => `
    <div class="search-result-item" onclick="closeSearchAndOpen(${item.id})">
      <img class="search-result-img" src="${item.image || getPlaceholder(item.category)}" alt="${item.title}" onerror="this.src='${getPlaceholder(item.category)}'">
      <div class="search-result-info">
        <h4>${highlight(item.title, q)}</h4>
        <p><i class="${getCategoryIcon(item.category)}"></i> ${getCategoryLabel(item.category)} · ${formatDateShort(item.date)}</p>
      </div>
    </div>
  `).join('');
}

function highlight(text, query) {
  const re = new RegExp(`(${query})`, 'gi');
  return text.replace(re, '<mark style="background: #fde68a; padding: 0 2px; border-radius: 2px;">$1</mark>');
}

function closeSearchAndOpen(id) {
  toggleSearch();
  openArticle(id);
}

// ===== Article Modal =====
let currentArticleId = null;

function openArticle(id) {
  const article = allNews.find(a => a.id === id);
  if (!article) return;
  currentArticleId = id;
  document.getElementById('articleImg').src = article.image || getPlaceholder(article.category);
  document.getElementById('articleImg').onerror = function() { this.src = getPlaceholder(article.category); };
  document.getElementById('articleCategory').textContent = getCategoryLabel(article.category);
  document.getElementById('articleTitle').textContent = article.title;
  document.getElementById('articleDate').textContent = formatDate(article.date);
  document.getElementById('articleSource').textContent = article.source;
  const summary = generateSummary(article.content);
  document.getElementById('aiSummaryText').textContent = summary;
  document.getElementById('articleText').innerHTML = article.content.split('\n').map(p => `<p>${p}</p>`).join('');
  document.getElementById('articleModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeArticle() {
  document.getElementById('articleModal').classList.remove('active');
  document.body.style.overflow = '';
}

function closeArticleOutside(e) {
  if (e.target === e.currentTarget) closeArticle();
}

function generateSummary(text) {
  const sentences = text.split(/[.،\n]/).filter(s => s.trim().length > 15);
  if (sentences.length <= 3) return text.slice(0, 150) + '...';
  return sentences.slice(0, 3).join('. ') + '.';
}

function shareArticle() {
  const article = allNews.find(a => a.id === currentArticleId);
  if (!article) return;
  if (navigator.share) {
    navigator.share({ title: article.title, text: article.excerpt });
  } else {
    navigator.clipboard.writeText(article.title + ' - ' + window.location.href);
    showToast('تم نسخ الرابط', 'success');
  }
}

function saveArticle() {
  const saved = JSON.parse(localStorage.getItem('savedArticles') || '[]');
  if (!saved.includes(currentArticleId)) {
    saved.push(currentArticleId);
    localStorage.setItem('savedArticles', JSON.stringify(saved));
    showToast('تم حفظ المقال', 'success');
  } else {
    showToast('المقال محفوظ مسبقاً', 'error');
  }
}

// ===== News Rendering =====
function getPlaceholder(category) {
  const colors = {
    education: '1a56db',
    scholarship: 'f59e0b',
    job: 'ef4444',
    internship: '10b981',
    guidance: '7c3aed'
  };
  const color = colors[category] || '1a56db';
  return `https://placehold.co/600x360/${color}/ffffff?text=${encodeURIComponent(getCategoryLabel(category))}`;
}

function renderNewsCard(item, featured = false) {
  const catLabel = getCategoryLabel(item.category);
  const catColor = getCategoryColor(item.category);
  const topBadge = item.topNews ? '<span class="top-news-badge"><i class="fas fa-fire"></i> أهم الأخبار</span>' : '';
  return `
    <div class="news-card ${featured ? 'featured' : ''}" onclick="openArticle(${item.id})">
      <div class="news-card-img">
        <img src="${item.image || getPlaceholder(item.category)}" alt="${item.title}" loading="lazy" onerror="this.src='${getPlaceholder(item.category)}'">
        <span class="news-card-category ${catColor}">${catLabel}</span>
      </div>
      <div class="news-card-body">
        <div class="news-card-date"><i class="far fa-clock"></i> ${formatDateShort(item.date)}</div>
        <h3 class="news-card-title">${item.title}${topBadge}</h3>
        <p class="news-card-excerpt">${item.excerpt}</p>
      </div>
      <div class="news-card-footer">
        <span class="news-card-source"><i class="far fa-user"></i> ${item.source}</span>
        <div class="news-card-actions">
          <i class="far fa-bookmark" onclick="event.stopPropagation(); saveArticleById(${item.id})"></i>
          <i class="fas fa-share-alt" onclick="event.stopPropagation(); shareArticleById(${item.id})"></i>
        </div>
      </div>
    </div>
  `;
}

function renderHomeNews() {
  const grid = document.getElementById('newsGrid');
  const latest = [...allNews].sort((a, b) => new Date(b.date) - new Date(a.date));
  const featured = latest.filter(a => a.featured).slice(0, 3);
  const rest = latest.filter(a => !featured.includes(a)).slice(0, 6);
  const toShow = [...featured, ...rest].slice(0, 8);
  if (toShow.length === 0) {
    grid.innerHTML = '<div class="empty-state"><i class="fas fa-newspaper"></i><h3>لا توجد أخبار حالياً</h3><p>سيتم إضافة الأخبار قريباً</p></div>';
    return;
  }
  grid.innerHTML = toShow.map((item, i) => renderNewsCard(item, i === 0)).join('');

  // Hero featured
  const top = latest.find(a => a.topNews) || latest[0];
  if (top) {
    document.getElementById('heroFeaturedTitle').textContent = top.title;
    document.getElementById('heroFeaturedExcerpt').textContent = top.excerpt;
    document.getElementById('heroFeaturedDate').textContent = formatDate(top.date);
    document.getElementById('heroFeaturedCat').textContent = getCategoryLabel(top.category);
    document.querySelector('#heroFeatured .btn-white').onclick = () => openArticle(top.id);
  }
}

function renderAiSuggestions() {
  const container = document.getElementById('aiSuggestions');
  const guidance = allNews.filter(a => a.category === 'guidance' || a.category === 'scholarship');
  const picks = guidance.length >= 3 ? guidance.slice(0, 3) : allNews.slice(0, 3);
  container.innerHTML = picks.map(item => renderNewsCard(item)).join('');
}

function renderCategoryGrid(page) {
  let items = allNews.filter(a => a.category === page);
  if (currentFilters[page] && currentFilters[page] !== 'all') {
    items = items.filter(a => a.subcategory === currentFilters[page]);
  }
  const gridId = `${page}Grid`;
  const grid = document.getElementById(gridId);
  if (!grid) return;
  if (items.length === 0) {
    grid.innerHTML = '<div class="empty-state"><i class="fas fa-filter"></i><h3>لا توجد نتائج</h3><p>لا توجد محتويات في هذا التصنيف حالياً</p></div>';
    return;
  }
  grid.innerHTML = items.map(item => renderNewsCard(item)).join('');
}

// ===== Category Filtering =====
function filterCategory(cat) {
  document.querySelectorAll('.cat-strip-item').forEach(el => el.classList.remove('active'));
  const target = document.querySelector(`.cat-strip-item[onclick*="'${cat}'"]`);
  if (target) target.classList.add('active');
  if (cat === 'all') {
    renderHomeNews();
    return;
  }
  const pageMap = { education: 'education', scholarship: 'scholarships', job: 'jobs', internship: 'internships', guidance: 'guidance' };
  const page = pageMap[cat];
  if (page) navigateTo(page);
}

function filterSubCategory(page, sub) {
  currentFilters[page] = sub;
  document.querySelectorAll(`#page-${page} .filter-btn`).forEach(btn => btn.classList.remove('active'));
  const target = document.querySelector(`#page-${page} .filter-btn[onclick*="'${sub}'"]`);
  if (target) target.classList.add('active');
  renderCategoryGrid(page);
}

// ===== AI Assistant =====
function toggleAiAssistant() {
  const panel = document.getElementById('aiPanel');
  panel.classList.toggle('active');
}

function sendAiMessage() {
  const input = document.getElementById('aiInput');
  const msg = input.value.trim();
  if (!msg) return;
  const container = document.getElementById('aiMessages');
  container.innerHTML += `<div class="ai-message user">${msg}</div>`;
  input.value = '';
  setTimeout(() => {
    const reply = getAiReply(msg);
    container.innerHTML += `<div class="ai-message bot">${reply}</div>`;
    container.scrollTop = container.scrollHeight;
  }, 500);
  container.scrollTop = container.scrollHeight;
}

function getAiReply(msg) {
  const q = msg.toLowerCase();
  if (q.includes('منحة') || q.includes('منح')) {
    const count = allNews.filter(a => a.category === 'scholarship').length;
    return `🎓 يوجد <strong>${count}</strong> منحة دراسية متاحة حالياً. يمكنك زيارة قسم "المنح الدراسية" للاطلاع على التفاصيل. هل تريد مني عرض أحدث المنح؟`;
  }
  if (q.includes('وظيفة') || q.includes('توظيف') || q.includes('مباراة')) {
    const count = allNews.filter(a => a.category === 'job').length;
    return `💼 يتوفر <strong>${count}</strong> إعلان توظيف. تصفح قسم "مباريات التوظيف" للمزيد من التفاصيل. هل هناك مجال معين يهمك؟`;
  }
  if (q.includes('تدريب') || q.includes('stage') || q.includes('internship')) {
    const count = allNews.filter(a => a.category === 'internship').length;
    return `📋 يوجد <strong>${count}</strong> فرصة تدريب متاحة. تفقد قسم "فرص التدريب" للمزيد.`;
  }
  if (q.includes('توجيه') || q.includes('اختيار تخصص') || q.includes('جامعة')) {
    return `🧭 يمكنك الاطلاع على قسم "التوجيه الدراسي" للحصول على نصائح وإرشادات حول اختيار التخصص والمسارات الدراسية. هل لديك سؤال محدد عن التوجيه؟`;
  }
  if (q.includes('سلام') || q.includes('مرحبا') || q.includes('hello') || q.includes('hi')) {
    return `👋 مرحباً بك في MYSTUDIES! كيف يمكنني مساعدتك اليوم؟ يمكنني: \n• البحث عن أخبار التعليم\n• عرض المنح الدراسية المتاحة\n• اقتراح فرص التدريب\n• تقديم نصائح التوجيه`;
  }
  if (q.includes('أخبار') || q.includes('جديد') || q.includes('مستجدات')) {
    const latest = allNews.slice(0, 3);
    return `📰 إليك آخر الأخبار:\n${latest.map((a, i) => `${i + 1}. ${a.title}`).join('\n')}\n\nهل تريد قراءة أي منها؟`;
  }
  if (q.includes('شكر') || q.includes('thanks')) {
    return '🙏 العفو! دائماً في الخدمة. هل هناك شيء آخر يمكنني مساعدتك به؟';
  }
  return `🤔 شكراً على سؤالك! يمكنني مساعدتك في:\n• البحث عن المنح الدراسية 🎓\n• مباريات التوظيف 💼\n• فرص التدريب 📋\n• التوجيه الدراسي 🧭\n• آخر الأخبار 📰\n\nما الذي تريد معرفته بالتحديد؟`;
}

// ===== Contact Form =====
async function handleContactSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('contactName').value;
  const email = document.getElementById('contactEmail').value;
  const subject = document.getElementById('contactSubject').value;
  const message = document.getElementById('contactMessage').value;
  if (!name || !email || !message) {
    showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
    return;
  }
  if (apiAvailable) {
    try {
      const res = await fetch(API_BASE + '/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      });
      if (!res.ok) { showToast('حدث خطأ، حاول مرة أخرى', 'error'); return; }
    } catch { /* fallback */ }
  }
  showToast(`شكراً ${name}! تم إرسال رسالتك بنجاح. سنتواصل معك قريباً.`, 'success');
  e.target.reset();
}

// ===== Newsletter =====
async function handleNewsletter(e) {
  e.preventDefault();
  const email = e.target.querySelector('input').value;
  if (!email) return;
  if (apiAvailable) {
    try {
      await fetch(API_BASE + '/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    } catch { /* fallback */ }
  }
  showToast('🎉 تم الاشتراك بنجاح! شكراً لانضمامك إلى نشرتنا البريدية.', 'success');
  e.target.reset();
}

// ===== Stats Counter =====
function animateCounters() {
  const counters = document.querySelectorAll('.stat-number[data-target]');
  counters.forEach(counter => {
    const target = parseInt(counter.dataset.target);
    const increment = target / 50;
    let current = 0;
    const update = () => {
      current += increment;
      if (current < target) {
        counter.textContent = Math.floor(current);
        requestAnimationFrame(update);
      } else {
        counter.textContent = target.toLocaleString('ar-MA');
      }
    };
    update();
  });
}

// ===== Toast =====
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ===== Utility =====
function saveArticleById(id) {
  const saved = JSON.parse(localStorage.getItem('savedArticles') || '[]');
  if (!saved.includes(id)) {
    saved.push(id);
    localStorage.setItem('savedArticles', JSON.stringify(saved));
    showToast('تم حفظ المقال', 'success');
  } else {
    showToast('المقال محفوظ مسبقاً', 'error');
  }
}

function shareArticleById(id) {
  const article = allNews.find(a => a.id === id);
  if (!article) return;
  if (navigator.share) {
    navigator.share({ title: article.title, text: article.excerpt });
  } else {
    navigator.clipboard.writeText(article.title);
    showToast('تم نسخ الرابط', 'success');
  }
}

// ===== Auto Update Timer =====
function startAutoUpdate() {
  setInterval(() => {
    const now = new Date();
    const hrs = now.getHours();
    const mins = now.getMinutes();
    if (hrs % 1 === 0 && mins === 0) {
      renderHomeNews();
      showToast('تم تحديث الأخبار تلقائياً', 'success');
    }
  }, 60000);
}

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', e => {
  if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
    const active = document.activeElement;
    if (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA') {
      e.preventDefault();
      toggleSearch();
    }
  }
  if (e.key === 'Escape') {
    if (document.getElementById('articleModal').classList.contains('active')) closeArticle();
    if (document.getElementById('searchOverlay').classList.contains('active')) toggleSearch();
    if (document.getElementById('aiPanel').classList.contains('active')) toggleAiAssistant();
  }
});

// ===== Scroll Effects =====
window.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  header.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  renderHomeNews();
  renderAiSuggestions();
  setTimeout(animateCounters, 500);
  startAutoUpdate();
  // Initialize all category pages
  ['education', 'scholarships', 'jobs', 'internships', 'guidance'].forEach(page => {
    renderCategoryGrid(page);
  });
  // Try fetching news from RSS sources (frontend)
  if (typeof fetchNewsFromRSS === 'function') {
    fetchNewsFromRSS().catch(() => {});
  }
  // Check if backend API is available and load dynamic news
  checkApi();
});
