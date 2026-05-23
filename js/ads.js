// ===== نظام الإعلانات - MYSTUDIES =====
// ادخل كود AdSense أو أي شبكة إعلانات أخرى هنا

const ADS_CONFIG = {
  // اختر شبكة الإعلانات: 'adsense' | 'propeller' | 'custom'
  network: 'custom',

  // Google AdSense
  adsense: {
    publisher_id: 'pub-0000000000000000', // غيّر هذا إلى ID الخاص بك
    slot_header: '1234567890',
    slot_sidebar: '1234567891',
    slot_inarticle: '1234567892',
    slot_footer: '1234567893'
  },

  // PropellerAds (بديل - ما يحتاش موافقة مسبقة)
  propeller: {
    zone_id: '000000' // غيّر إلى Zone ID الخاص بك
  },

  // إعلانات مخصصة (HTML مباشر)
  custom: {
    header: '',
    sidebar: '',
    inarticle: '',
    footer: ''
  },

  // إعدادات الظهور
  display: {
    header_enabled: true,
    sidebar_enabled: true,
    inarticle_enabled: true,
    footer_enabled: false,
    // كم ثانية بعد تحميل الصفحة يظهر الإعلان
    delay: 0,
    // إظهار للمستخدمين المسجلين فقط؟ (false = للكل)
    logged_in_only: false
  }
};

// دالة لعرض الإعلان حسب الشبكة المختارة
function renderAd(position) {
  const config = ADS_CONFIG;
  if (!config.display[position + '_enabled']) return '';

  if (config.logged_in_only && !document.body.classList.contains('logged-in')) return '';

  let html = '';
  const net = config.network;

  if (net === 'adsense' && config.adsense.publisher_id !== 'pub-0000000000000000') {
    const slot = config.adsense['slot_' + position];
    html = `
      <div class="ad-container ad-${position}">
        <ins class="adsbygoogle"
          style="display:block"
          data-ad-client="${config.adsense.publisher_id}"
          data-ad-slot="${slot}"
          data-ad-format="auto"
          data-full-width-responsive="true"></ins>
        <script>(adsbygoogle = window.adsbygoogle || []).push({});<\/script>
      </div>`;
  } else if (net === 'propeller') {
    html = `
      <div class="ad-container ad-${position}">
        <script type="text/javascript">
          var zflag=zflag||[];zflag.push(['${config.propeller.zone_id}','${position}']);
        <\/script>
      </div>`;
  } else if (net === 'custom') {
    html = config.custom[position] || '';
  }

  return html;
}

// تحميل AdSense مرة واحدة
function loadAdsense() {
  if (ADS_CONFIG.network !== 'adsense') return;
  if (ADS_CONFIG.adsense.publisher_id === 'pub-0000000000000000') return;
  const s = document.createElement('script');
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADS_CONFIG.adsense.publisher_id;
  s.async = true;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}

// تشغيل الإعلانات بعد تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    loadAdsense();
    // إضافة كلاسات CSS للفواصل الإعلانية
    document.querySelectorAll('.ad-container').forEach(el => {
      el.style.minHeight = '90px';
      el.style.background = '#f8fafc';
      el.style.borderRadius = '8px';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.margin = '16px 0';
      el.style.overflow = 'hidden';
    });
  }, ADS_CONFIG.display.delay * 1000);
});
