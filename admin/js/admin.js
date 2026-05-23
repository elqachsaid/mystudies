const API = window.location.origin + '/api';
let TOKEN = localStorage.getItem('adminToken') || '';
let currentUser = null;
let currentAdminPage = 'dashboard';

// ===== Auth =====
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';
  try {
    const res = await fetch(API + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) { errorEl.textContent = data.error; return; }
    TOKEN = data.token;
    localStorage.setItem('adminToken', TOKEN);
    currentUser = data.user;
    showDashboard();
  } catch (e) {
    errorEl.textContent = 'تعذر الاتصال بالخادم';
  }
}

function handleLogout() {
  localStorage.removeItem('adminToken');
  TOKEN = '';
  currentUser = null;
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

async function checkAuth() {
  if (!TOKEN) return false;
  try {
    const res = await fetch(API + '/auth/me', { headers: { Authorization: 'Bearer ' + TOKEN } });
    if (!res.ok) { handleLogout(); return false; }
    currentUser = await res.json();
    return true;
  } catch { handleLogout(); return false; }
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'flex';
  document.getElementById('adminName').textContent = currentUser?.name || 'مدير';
  document.getElementById('adminRole').textContent = currentUser?.role || 'editor';
  document.getElementById('adminAvatar').textContent = (currentUser?.name || 'A')[0];
  navigateAdmin('dashboard');
}

// ===== Navigation =====
function navigateAdmin(page) {
  currentAdminPage = page;
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  const link = document.querySelector(`.sidebar-nav a[onclick*="'${page}'"]`);
  if (link) link.classList.add('active');
  const titles = { dashboard: 'لوحة الإحصائيات', news: 'إدارة الأخبار', categories: 'التصنيفات', contacts: 'الرسائل', subscribers: 'المشتركون', rss: 'مصادر RSS', profile: 'الملف الشخصي' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  const content = document.getElementById('adminContent');
  if (page === 'dashboard') renderDashboard(content);
  else if (page === 'news') renderNewsList(content);
  else if (page === 'categories') renderCategories(content);
  else if (page === 'contacts') renderContacts(content);
  else if (page === 'subscribers') renderSubscribers(content);
  else if (page === 'rss') renderRssManager(content);
  else if (page === 'profile') renderProfile(content);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ===== Dashboard =====
async function renderDashboard(el) {
  el.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i></div>';
  try {
    const [statsRes, newsRes] = await Promise.all([
      fetch(API + '/stats', { headers: { Authorization: 'Bearer ' + TOKEN } }),
      fetch(API + '/news?limit=5', { headers: { Authorization: 'Bearer ' + TOKEN } })
    ]);
    const stats = await statsRes.json();
    const newsData = await newsRes.json();
    el.innerHTML = `
      <div class="cards-grid">
        <div class="stat-card">
          <div class="stat-card-icon" style="background:#dbeafe;color:var(--primary)"><i class="fas fa-newspaper"></i></div>
          <div class="stat-card-info"><h3>${stats.news||0}</h3><p>إجمالي الأخبار</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:#fef3c7;color:var(--accent)"><i class="fas fa-award"></i></div>
          <div class="stat-card-info"><h3>${stats.scholarships||0}</h3><p>المنح الدراسية</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:#d1fae5;color:var(--success)"><i class="fas fa-briefcase"></i></div>
          <div class="stat-card-info"><h3>${stats.jobs||0}</h3><p>مباريات التوظيف</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:#fee2e2;color:var(--danger)"><i class="fas fa-envelope"></i></div>
          <div class="stat-card-info"><h3>${stats.contacts||0}</h3><p>الرسائل الواردة</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:#e0e7ff;color:#4f46e5"><i class="fas fa-users"></i></div>
          <div class="stat-card-info"><h3>${stats.subscribers||0}</h3><p>المشتركون</p></div>
        </div>
      </div>
      <div class="table-wrap">
        <div class="table-header"><h3>آخر الأخبار المنشورة</h3></div>
        ${newsData.news?.length ? `
        <table>
          <thead><tr><th>العنوان</th><th>التصنيف</th><th>التاريخ</th><th>المشاهدات</th></tr></thead>
          <tbody>${newsData.news.map(n => `
            <tr><td style="font-weight:600">${n.title}</td>
            <td><span class="badge primary">${n.cat_name||''}</span></td>
            <td style="color:var(--gray-500);font-size:13px">${new Date(n.created_at).toLocaleDateString('ar-MA')}</td>
            <td>${n.views||0}</td></tr>
          `).join('')}</tbody>
        </table>` : '<div class="empty-state"><p>لا توجد أخبار بعد</p></div>'}
      </div>
    `;
  } catch(e) { el.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>خطأ في التحميل</h3></div>'; }
}

// ===== News List =====
async function renderNewsList(el, page = 1) {
  el.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i></div>';
  try {
    const res = await fetch(API + '/news/admin/all?page=' + page + '&limit=20', { headers: { Authorization: 'Bearer ' + TOKEN } });
    const data = await res.json();
    el.innerHTML = `
      <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="openNewsEditor()"><i class="fas fa-plus"></i> إضافة خبر جديد</button>
        <button class="btn btn-outline" onclick="navigateAdmin('rss')"><i class="fas fa-rss"></i> جلب من RSS</button>
      </div>
      <div class="table-wrap">
        <div class="table-header">
          <h3>الأخبار (${data.total})</h3>
          <div class="table-search"><i class="fas fa-search"></i><input placeholder="بحث..." oninput="searchNews(this.value)"></div>
        </div>
        ${data.news?.length ? `
        <table>
          <thead><tr><th>العنوان</th><th>التصنيف</th><th>الحالة</th><th>التاريخ</th><th>المشاهدات</th><th></th></tr></thead>
          <tbody>${data.news.map(n => `
            <tr>
              <td style="font-weight:600;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n.top_news ? '🔥 ' : ''}${n.featured ? '⭐ ' : ''}${n.title}</td>
              <td><span class="badge primary">${n.cat_name||''}</span></td>
              <td><span class="badge ${n.status==='published'?'success':'gray'}">${n.status==='published'?'منشور':'مسودة'}</span></td>
              <td style="font-size:13px;color:var(--gray-500)">${new Date(n.created_at).toLocaleDateString('ar-MA')}</td>
              <td>${n.views||0}</td>
              <td>
                <div class="actions-cell">
                  <button class="btn-icon edit" onclick="openNewsEditor(${n.id})" title="تعديل"><i class="fas fa-edit"></i></button>
                  <button class="btn-icon delete" onclick="deleteNews(${n.id})" title="حذف"><i class="fas fa-trash"></i></button>
                </div>
              </td>
            </tr>
          `).join('')}</tbody>
        </table>
        ${data.pages > 1 ? `
        <div class="pagination">${Array.from({length:data.pages}, (_,i) => `
          <button class="${i+1===data.page?'active':''}" onclick="navigateAdmin('news');renderNewsList(document.getElementById('adminContent'),${i+1})">${i+1}</button>
        `).join('')}</div>` : ''}
        ` : '<div class="empty-state"><i class="fas fa-newspaper"></i><h3>لا توجد أخبار</h3></div>'}
      </div>
    `;
  } catch(e) { el.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>خطأ في التحميل</h3></div>'; }
}

let newsSearchTimeout;
function searchNews(q) {
  clearTimeout(newsSearchTimeout);
  newsSearchTimeout = setTimeout(() => {
    navigateAdmin('news');
  }, 500);
}

// ===== News Editor =====
async function openNewsEditor(id = null) {
  const el = document.getElementById('adminContent');
  const catsRes = await fetch(API + '/categories');
  const cats = await catsRes.json();
  let article = { title: '', excerpt: '', content: '', category_id: '', subcategory: '', image: '', source: 'MYSTUDIES', source_url: '', featured: 0, top_news: 0, status: 'published' };
  if (id) {
    const res = await fetch(API + '/news/' + id, { headers: { Authorization: 'Bearer ' + TOKEN } });
    article = await res.json();
  }
  el.innerHTML = `
    <div class="form-card">
      <h3>${id ? 'تعديل الخبر' : 'إضافة خبر جديد'}</h3>
      <form id="newsForm" onsubmit="saveNews(event, ${id || 'null'})">
        <div class="form-group">
          <label>العنوان *</label>
          <input name="title" value="${article.title}" required placeholder="عنوان الخبر">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>التصنيف *</label>
            <select name="category_id" required>
              <option value="">اختر التصنيف</option>
              ${cats.map(c => `<option value="${c.id}" ${article.category_id==c.id?'selected':''}>${c.name_ar}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>التصنيف الفرعي</label>
            <input name="subcategory" value="${article.subcategory}" placeholder="مثال: جامعات، منح خارجية...">
          </div>
        </div>
        <div class="form-group">
          <label>نبذة مختصرة</label>
          <textarea name="excerpt" rows="2" placeholder="نبذة قصيرة عن الخبر">${article.excerpt}</textarea>
        </div>
        <div class="form-group">
          <label>المحتوى</label>
          <textarea name="content" rows="8" placeholder="محتوى الخبر كاملاً">${article.content}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>رابط الصورة</label>
            <input name="image" value="${article.image}" placeholder="https://..." id="imageInput">
            <div style="margin-top:8px"><button type="button" class="btn btn-sm btn-outline" onclick="document.getElementById('fileInput').click()"><i class="fas fa-upload"></i> رفع صورة</button></div>
            <input type="file" id="fileInput" accept="image/*" style="display:none" onchange="uploadImage(this)">
          </div>
          <div class="form-group">
            <label>المصدر</label>
            <input name="source" value="${article.source}" placeholder="اسم المصدر">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>رابط المصدر</label>
            <input name="source_url" value="${article.source_url}" placeholder="https://...">
          </div>
          <div class="form-group">
            <label>الحالة</label>
            <select name="status">
              <option value="published" ${article.status==='published'?'selected':''}>منشور</option>
              <option value="draft" ${article.status==='draft'?'selected':''}>مسودة</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <label class="switch"><input type="checkbox" name="featured" ${article.featured?'checked':''}><span class="slider"></span></label>
          <span style="font-size:14px">خبر مميز</span>
          <label class="switch" style="margin-right:24px"><input type="checkbox" name="top_news" ${article.top_news?'checked':''}><span class="slider"></span></label>
          <span style="font-size:14px">أهم الأخبار</span>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> ${id ? 'تحديث' : 'نشر'}</button>
          <button type="button" class="btn btn-outline" onclick="navigateAdmin('news')">إلغاء</button>
        </div>
      </form>
    </div>
  `;
}

async function uploadImage(input) {
  const file = input.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await fetch(API + '/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN }, body: formData });
    const data = await res.json();
    if (data.url) {
      document.querySelector('[name="image"]').value = data.url;
      showToast('تم رفع الصورة', 'success');
    }
  } catch(e) { showToast('فشل رفع الصورة', 'error'); }
}

async function saveNews(e, id) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  data.featured = form.featured.checked ? 1 : 0;
  data.top_news = form.top_news.checked ? 1 : 0;
  const url = id ? API + '/news/' + id : API + '/news';
  const method = id ? 'PUT' : 'POST';
  try {
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) { showToast(result.error || 'حدث خطأ', 'error'); return; }
    showToast(id ? 'تم تحديث الخبر' : 'تم نشر الخبر بنجاح', 'success');
    navigateAdmin('news');
  } catch(e) { showToast('فشل الاتصال بالخادم', 'error'); }
}

async function deleteNews(id) {
  if (!confirm('هل أنت متأكد من حذف هذا الخبر؟')) return;
  try {
    const res = await fetch(API + '/news/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + TOKEN } });
    if (!res.ok) { const d = await res.json(); showToast(d.error, 'error'); return; }
    showToast('تم حذف الخبر', 'success');
    navigateAdmin('news');
  } catch(e) { showToast('فشل الحذف', 'error'); }
}

// ===== Categories =====
async function renderCategories(el) {
  el.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i></div>';
  try {
    const res = await fetch(API + '/categories');
    const cats = await res.json();
    el.innerHTML = `
      <div style="margin-bottom:20px">
        <button class="btn btn-primary" onclick="openCategoryEditor()"><i class="fas fa-plus"></i> إضافة تصنيف</button>
      </div>
      <div class="table-wrap">
        <div class="table-header"><h3>التصنيفات (${cats.length})</h3></div>
        ${cats.length ? `
        <table>
          <thead><tr><th>الاسم</th><th>الرمز</th><th>الأيقونة</th><th>عدد الأخبار</th><th></th></tr></thead>
          <tbody>${cats.map(c => `
            <tr>
              <td style="font-weight:600">${c.name_ar}</td>
              <td style="color:var(--gray-500)">${c.slug}</td>
              <td><i class="fas ${c.icon}" style="color:var(--primary)"></i></td>
              <td>${c.news_count||0}</td>
              <td><div class="actions-cell">
                <button class="btn-icon edit" onclick="openCategoryEditor(${c.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-icon delete" onclick="deleteCategory(${c.id})"><i class="fas fa-trash"></i></button>
              </div></td>
            </tr>
          `).join('')}</tbody>
        </table>` : '<div class="empty-state"><p>لا توجد تصنيفات</p></div>'}
      </div>
    `;
  } catch(e) { el.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>خطأ في التحميل</h3></div>'; }
}

async function openCategoryEditor(id = null) {
  const el = document.getElementById('adminContent');
  let cat = { name_ar: '', slug: '', icon: 'fa-newspaper', color: 'primary' };
  if (id) {
    const res = await fetch(API + '/categories');
    const cats = await res.json();
    cat = cats.find(c => c.id === id) || cat;
  }
  el.innerHTML = `
    <div class="form-card">
      <h3>${id ? 'تعديل تصنيف' : 'إضافة تصنيف'}</h3>
      <form onsubmit="saveCategory(event, ${id || 'null'})">
        <div class="form-row">
          <div class="form-group"><label>الاسم بالعربية *</label><input name="name_ar" value="${cat.name_ar}" required></div>
          <div class="form-group"><label>Slug *</label><input name="slug" value="${cat.slug}" required></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>الأيقونة</label>
            <select name="icon">
              <option value="fa-graduation-cap" ${cat.icon==='fa-graduation-cap'?'selected':''}>تخرج</option>
              <option value="fa-award" ${cat.icon==='fa-award'?'selected':''}>جائزة</option>
              <option value="fa-briefcase" ${cat.icon==='fa-briefcase'?'selected':''}>عمل</option>
              <option value="fa-laptop-code" ${cat.icon==='fa-laptop-code'?'selected':''}>برمجة</option>
              <option value="fa-compass" ${cat.icon==='fa-compass'?'selected':''}>بوصلة</option>
              <option value="fa-newspaper" ${cat.icon==='fa-newspaper'?'selected':''}>صحيفة</option>
            </select>
          </div>
          <div class="form-group"><label>اللون</label>
            <select name="color">
              <option value="primary" ${cat.color==='primary'?'selected':''}>أزرق</option>
              <option value="accent" ${cat.color==='accent'?'selected':''}>ذهبي</option>
              <option value="success" ${cat.color==='success'?'selected':''}>أخضر</option>
              <option value="danger" ${cat.color==='danger'?'selected':''}>أحمر</option>
              <option value="purple" ${cat.color==='purple'?'selected':''}>بنفسجي</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> حفظ</button>
          <button type="button" class="btn btn-outline" onclick="navigateAdmin('categories')">إلغاء</button>
        </div>
      </form>
    </div>
  `;
}

async function saveCategory(e, id) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const url = id ? API + '/categories/' + id : API + '/categories';
  const method = id ? 'PUT' : 'POST';
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify(data) });
    if (!res.ok) { showToast('حدث خطأ', 'error'); return; }
    showToast(id ? 'تم التحديث' : 'تمت الإضافة', 'success');
    navigateAdmin('categories');
  } catch(e) { showToast('فشل', 'error'); }
}

async function deleteCategory(id) {
  if (!confirm('هل أنت متأكد؟')) return;
  await fetch(API + '/categories/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + TOKEN } });
  showToast('تم الحذف', 'success');
  navigateAdmin('categories');
}

// ===== Contacts =====
async function renderContacts(el) {
  el.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i></div>';
  try {
    const res = await fetch(API + '/contact', { headers: { Authorization: 'Bearer ' + TOKEN } });
    const data = await res.json();
    el.innerHTML = `
      <div class="table-wrap">
        <div class="table-header"><h3>الرسائل (${data.total})</h3></div>
        ${data.messages?.length ? `
        <table>
          <thead><tr><th>الاسم</th><th>البريد</th><th>الموضوع</th><th>التاريخ</th><th>الحالة</th><th></th></tr></thead>
          <tbody>${data.messages.map(m => `
            <tr onclick="markContactRead(${m.id})" style="cursor:pointer">
              <td style="font-weight:600">${m.name}</td>
              <td style="color:var(--gray-500)">${m.email}</td>
              <td>${m.subject||'—'}</td>
              <td style="font-size:13px;color:var(--gray-500)">${new Date(m.created_at).toLocaleDateString('ar-MA')}</td>
              <td><span class="badge ${m.is_read?'gray':'success'}">${m.is_read?'مقروءة':'جديدة'}</span></td>
              <td><button class="btn-icon delete" onclick="event.stopPropagation();deleteContact(${m.id})"><i class="fas fa-trash"></i></button></td>
            </tr>
          `).join('')}</tbody>
        </table>` : '<div class="empty-state"><p>لا توجد رسائل</p></div>'}
      </div>
    `;
  } catch(e) { el.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>خطأ</h3></div>'; }
}

async function markContactRead(id) {
  await fetch(API + '/contact/' + id + '/read', { method: 'PUT', headers: { Authorization: 'Bearer ' + TOKEN } });
}

async function deleteContact(id) {
  if (!confirm('حذف الرسالة؟')) return;
  await fetch(API + '/contact/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + TOKEN } });
  showToast('تم الحذف', 'success');
  navigateAdmin('contacts');
}

// ===== Subscribers =====
async function renderSubscribers(el) {
  el.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i></div>';
  try {
    const res = await fetch(API + '/subscribers', { headers: { Authorization: 'Bearer ' + TOKEN } });
    const data = await res.json();
    el.innerHTML = `
      <div class="table-wrap">
        <div class="table-header"><h3>المشتركون في النشرة البريدية</h3></div>
        ${data.subscribers?.length ? `
        <table>
          <thead><tr><th>البريد الإلكتروني</th><th>تاريخ الاشتراك</th><th></th></tr></thead>
          <tbody>${data.subscribers.map(s => `
            <tr><td>${s.email}</td>
            <td style="font-size:13px;color:var(--gray-500)">${new Date(s.created_at).toLocaleDateString('ar-MA')}</td>
            <td><button class="btn-icon delete" onclick="deleteSubscriber(${s.id})"><i class="fas fa-trash"></i></button></td></tr>
          `).join('')}</tbody>
        </table>` : '<div class="empty-state"><p>لا يوجد مشتركون</p></div>'}
      </div>
    `;
  } catch(e) { el.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>خطأ</h3></div>'; }
}

async function deleteSubscriber(id) {
  if (!confirm('حذف المشترك؟')) return;
  try {
    const res = await fetch(API + '/subscribers/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + TOKEN } });
    showToast('تم الحذف', 'success');
    navigateAdmin('subscribers');
  } catch(e) { showToast('فشل', 'error'); }
}

// ===== RSS Manager =====
async function renderRssManager(el) {
  // Fetch sources
  let keywordSources = [], feedSources = [];
  try {
    const res = await fetch(API + '/rss/sources');
    const data = await res.json();
    keywordSources = data.keywords || [];
    feedSources = data.feeds || [];
  } catch(e) {}

  el.innerHTML = `
    <div class="cards-grid">
      <div class="stat-card"><div class="stat-card-icon" style="background:#dbeafe;color:var(--primary)"><i class="fas fa-search"></i></div>
        <div class="stat-card-info"><h3>${keywordSources.length}</h3><p>بحث تلقائي (Google News)</p></div></div>
      <div class="stat-card"><div class="stat-card-icon" style="background:#fef3c7;color:var(--accent)"><i class="fas fa-rss"></i></div>
        <div class="stat-card-info"><h3>${feedSources.length}</h3><p>مصادر RSS مباشرة</p></div></div>
    </div>

    <div class="table-wrap" style="margin-bottom:20px">
      <div class="table-header"><h3>🔍 جلب ذكي - بحث بكلمات مفتاحية</h3>
        <div style="display:flex;gap:8px">
          <button class="btn btn-accent btn-sm" onclick="fetchRssNow()"><i class="fas fa-sync"></i> جلب الكل تلقائياً</button>
        </div>
      </div>
      <div style="padding:20px">
        <p style="color:var(--gray-500);margin-bottom:16px">يستخدم Google News RSS للبحث عن أخبار حقيقية بالكلمات المفتاحية التالية:</p>
        <table>
          <thead><tr><th>كلمة البحث</th><th>التصنيف</th><th>المصدر</th></tr></thead>
          <tbody>${keywordSources.map(s => `
            <tr><td style="font-weight:600">${s.keywords}</td>
            <td><span class="badge primary">${s.category}</span></td>
            <td style="color:var(--gray-500)">${s.source}</td></tr>
          `).join('')}</tbody>
        </table>
      </div>
    </div>

    <div class="table-wrap" style="margin-bottom:20px">
      <div class="table-header"><h3>📡 بحث مخصص</h3></div>
      <div style="padding:20px">
        <div class="form-row">
          <div class="form-group">
            <label>كلمة مفتاحية للبحث</label>
            <input id="customKeyword" value="المنح الدراسية المغرب" placeholder="مثال: مباريات التوظيف">
          </div>
          <div class="form-group">
            <label>التصنيف</label>
            <select id="customCategory"></select>
          </div>
        </div>
        <button class="btn btn-primary" onclick="customSearch()"><i class="fas fa-search"></i> بحث وجلب</button>
        <div id="searchResults" style="margin-top:16px"></div>
      </div>
    </div>

    <div class="table-wrap">
      <div class="table-header"><h3>مصادر RSS المباشرة</h3></div>
      <div style="padding:20px">
        ${feedSources.length ? `
        <table>
          <thead><tr><th>المصدر</th><th>الرابط</th><th>التصنيف</th></tr></thead>
          <tbody>${feedSources.map(s => `
            <tr><td>${s.source||'—'}</td>
            <td style="font-size:13px;color:var(--gray-500);direction:ltr">${s.url}</td>
            <td><span class="badge primary">${s.category||'?'}</span></td></tr>
          `).join('')}</tbody>
        </table>` : '<p style="color:var(--gray-400)">لا توجد مصادر RSS</p>'}
      </div>
    </div>
  `;

  // Fill category dropdown
  try {
    const catRes = await fetch(API + '/categories');
    const cats = await catRes.json();
    const sel = document.getElementById('customCategory');
    sel.innerHTML = cats.map(c => `<option value="${c.slug}">${c.name_ar}</option>`).join('');
  } catch(e) {}
}

async function customSearch() {
  const keywords = document.getElementById('customKeyword').value.trim();
  const category = document.getElementById('customCategory').value;
  if (!keywords) return showToast('أدخل كلمة مفتاحية', 'error');
  const container = document.getElementById('searchResults');
  container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i> جاري البحث...</div>';
  try {
    const res = await fetch(API + '/rss/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
      body: JSON.stringify({ keywords, category_slug: category })
    });
    const data = await res.json();
    if (!data.results?.length) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h3>لا توجد نتائج</h3></div>';
      return;
    }
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <p style="color:var(--gray-500)">تم العثور على <strong>${data.count}</strong> نتيجة</p>
        <button class="btn btn-sm btn-primary" onclick="saveSearchResults('${category}')"><i class="fas fa-save"></i> حفظ الكل</button>
      </div>
      <div style="max-height:400px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:var(--radius-sm)">
        ${data.results.map((r, i) => `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--gray-100);cursor:pointer"
               onclick="window.open('${r.source_url}','_blank')">
            <span style="background:var(--gray-100);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${i+1}</span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.title}">${r.title}</div>
              <div style="font-size:12px;color:var(--gray-400)">${r.excerpt?.slice(0,100)||''}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    // Store results for saving
    container.dataset.results = JSON.stringify(data.results);
  } catch(e) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>خطأ</h3><p>${e.message}</p></div>`;
  }
}

async function saveSearchResults(category) {
  const container = document.getElementById('searchResults');
  const results = JSON.parse(container.dataset.results || '[]');
  if (!results.length) return;
  try {
    const res = await fetch(API + '/rss/save-search', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
      body: JSON.stringify({ articles: results, category_slug: category })
    });
    const data = await res.json();
    showToast(data.message || 'تم الحفظ', 'success');
  } catch(e) { showToast('فشل الحفظ', 'error'); }
}

async function fetchRssNow() {
  try {
    const res = await fetch(API + '/rss/fetch', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN } });
    const data = await res.json();
    showToast(data.message || 'تم الجلب', 'success');
  } catch(e) { showToast('فشل جلب الأخبار', 'error'); }
}

// ===== Profile =====
function renderProfile(el) {
  el.innerHTML = `
    <div class="form-card">
      <h3>الملف الشخصي</h3>
      <form onsubmit="updateProfile(event)">
        <div class="form-group"><label>الاسم</label><input name="name" value="${currentUser?.name||''}" required></div>
        <div class="form-group"><label>البريد الإلكتروني</label><input value="${currentUser?.email||''}" disabled style="background:var(--gray-100)"></div>
        <div class="form-group"><label>الدور</label><input value="${currentUser?.role||'editor'}" disabled style="background:var(--gray-100)"></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> حفظ التغييرات</button></div>
      </form>
      <hr style="margin:32px 0;border-color:var(--gray-200)">
      <h3 style="margin-bottom:16px">تغيير كلمة المرور</h3>
      <form onsubmit="changePassword(event)">
        <div class="form-group"><label>كلمة المرور الحالية</label><input type="password" name="currentPassword" required></div>
        <div class="form-group"><label>كلمة المرور الجديدة</label><input type="password" name="newPassword" required minlength="6"></div>
        <div class="form-actions"><button type="submit" class="btn btn-accent"><i class="fas fa-key"></i> تغيير كلمة المرور</button></div>
      </form>
    </div>
  `;
}

async function updateProfile(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    const res = await fetch(API + '/auth/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify(data) });
    if (!res.ok) { showToast('فشل التحديث', 'error'); return; }
    currentUser.name = data.name;
    document.getElementById('adminName').textContent = data.name;
    showToast('تم تحديث الملف الشخصي', 'success');
  } catch(e) { showToast('فشل', 'error'); }
}

async function changePassword(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    const res = await fetch(API + '/auth/password', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify(data) });
    const result = await res.json();
    if (!res.ok) { showToast(result.error, 'error'); return; }
    showToast('تم تغيير كلمة المرور', 'success');
    e.target.reset();
  } catch(e) { showToast('فشل', 'error'); }
}

// ===== Utility =====
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ===== Init =====
async function init() {
  const authed = await checkAuth();
  if (authed) {
    showDashboard();
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
  }
}
init();
