const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data.json');

function getDefaultData() {
  return {
    users: [],
    categories: [
      { id: 1, slug: 'education', name_ar: 'أخبار التعليم', icon: 'fa-graduation-cap', color: 'primary', created_at: new Date().toISOString() },
      { id: 2, slug: 'scholarship', name_ar: 'المنح الدراسية', icon: 'fa-award', color: 'accent', created_at: new Date().toISOString() },
      { id: 3, slug: 'job', name_ar: 'مباريات التوظيف', icon: 'fa-briefcase', color: 'danger', created_at: new Date().toISOString() },
      { id: 4, slug: 'immigration', name_ar: 'فرص الهجرة', icon: 'fa-plane', color: 'info', created_at: new Date().toISOString() },
      { id: 5, slug: 'guidance', name_ar: 'التوجيه الدراسي', icon: 'fa-compass', color: 'purple', created_at: new Date().toISOString() }
    ],
    news: [],
    contacts: [],
    subscribers: [],
    saved_articles: [],
    ads_settings: { network: 'custom', adsense: { publisher_id: 'pub-0000000000000000', slot_header: '', slot_sidebar: '', slot_inarticle: '', slot_footer: '' }, propeller: { zone_id: '' }, custom: { header: '', sidebar: '', inarticle: '', footer: '' }, display: { header_enabled: true, sidebar_enabled: true, inarticle_enabled: true, footer_enabled: false } },
    nextId: { users: 2, categories: 6, news: 1, contacts: 1, subscribers: 1, saved_articles: 1 }
  };
}

let data = null;

function getDB() {
  if (!data) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      data = JSON.parse(raw);
    } catch {
      data = getDefaultData();
      seedAdmin();
      save();
    }
  }
  return data;
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function seedAdmin() {
  const exists = data.users.find(u => u.email === 'admin@mystudies.ma');
  if (!exists) {
    data.users.push({
      id: 1,
      name: 'مدير الموقع',
      email: 'admin@mystudies.ma',
      password: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      avatar: '',
      created_at: new Date().toISOString()
    });
  }
}

function newId(type) {
  const id = data.nextId[type];
  data.nextId[type]++;
  save();
  return id;
}

module.exports = { getDB, save, newId };
