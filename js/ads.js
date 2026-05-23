let ADS_CONFIG = {
  network: 'custom',
  adsense: { publisher_id: 'pub-0000000000000000', slot_header: '', slot_sidebar: '', slot_inarticle: '', slot_footer: '' },
  propeller: { zone_id: '' },
  custom: { header: '', sidebar: '', inarticle: '', footer: '' },
  display: { header_enabled: true, sidebar_enabled: true, inarticle_enabled: true, footer_enabled: false }
};

async function loadAdConfig() {
  try {
    const res = await fetch('/api/ads');
    if (res.ok) {
      const data = await res.json();
      ADS_CONFIG = data;
    }
  } catch {}
}

function renderAd(position) {
  const config = ADS_CONFIG;
  if (!config.display[position + '_enabled']) return '';
  let html = '';
  const net = config.network;
  if (net === 'adsense' && config.adsense.publisher_id !== 'pub-0000000000000000') {
    const slot = config.adsense['slot_' + position];
    html = `<div class="ad-container ad-${position}"><ins class="adsbygoogle" style="display:block" data-ad-client="${config.adsense.publisher_id}" data-ad-slot="${slot}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});<\/script></div>`;
  } else if (net === 'propeller') {
    html = `<div class="ad-container ad-${position}"><script type="text/javascript">var zflag=zflag||[];zflag.push(['${config.propeller.zone_id}','${position}']);<\/script></div>`;
  } else if (net === 'custom') {
    html = config.custom[position] || '';
  }
  return html;
}

function loadAdsense() {
  if (ADS_CONFIG.network !== 'adsense') return;
  if (ADS_CONFIG.adsense.publisher_id === 'pub-0000000000000000') return;
  const s = document.createElement('script');
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADS_CONFIG.adsense.publisher_id;
  s.async = true;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadAdConfig();
  setTimeout(() => {
    loadAdsense();
    document.querySelectorAll('.ad-container').forEach(el => {
      el.style.minHeight = '90px'; el.style.background = '#f8fafc'; el.style.borderRadius = '8px';
      el.style.display = 'flex'; el.style.alignItems = 'center'; el.style.justifyContent = 'center';
      el.style.margin = '16px 0'; el.style.overflow = 'hidden';
    });
  }, 0);
});
