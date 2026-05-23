const express = require('express');
const router = express.Router();
const { getDB, save } = require('../db');
const { authMiddleware } = require('../middleware/auth');

// Default ad settings
function defaultAdSettings() {
  return {
    network: 'custom',
    adsense: { publisher_id: 'pub-0000000000000000', slot_header: '', slot_sidebar: '', slot_inarticle: '', slot_footer: '' },
    propeller: { zone_id: '' },
    custom: { header: '', sidebar: '', inarticle: '', footer: '' },
    display: { header_enabled: true, sidebar_enabled: true, inarticle_enabled: true, footer_enabled: false }
  };
}

// GET /api/ads - get ad settings (public)
router.get('/', (req, res) => {
  const db = getDB();
  if (!db.ads_settings) db.ads_settings = defaultAdSettings();
  res.json(db.ads_settings);
});

// PUT /api/ads - update ad settings (admin only)
router.put('/', authMiddleware, (req, res) => {
  const db = getDB();
  db.ads_settings = { ...defaultAdSettings(), ...req.body };
  save();
  res.json({ message: 'تم حفظ إعدادات الإعلانات' });
});

module.exports = router;
