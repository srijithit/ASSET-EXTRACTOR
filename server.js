const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const archiver = require('archiver');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Browser User Agents
const USER_AGENTS = {
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
};

function cleanUrl(url, baseUri) {
  if (!url || typeof url !== 'string') return null;
  url = url.trim();
  if (url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('tel:')) return null;
  try {
    return new URL(url, baseUri).href;
  } catch (e) {
    return null;
  }
}

function getExtension(url) {
  if (!url) return 'png';
  if (url.startsWith('data:image/svg+xml')) return 'svg';
  if (url.startsWith('data:image/png')) return 'png';
  if (url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg')) return 'jpg';
  if (url.startsWith('data:image/webp')) return 'webp';
  if (url.startsWith('data:video/mp4')) return 'mp4';

  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
    if (match) return match[1].toLowerCase();
  } catch (e) {}
  return 'png';
}

function getFileName(url, defaultName = 'asset') {
  if (url.startsWith('data:')) {
    const ext = getExtension(url) || 'png';
    return `${defaultName}_${Date.now().toString(36)}.${ext}`;
  }
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    let name = segments.length ? segments[segments.length - 1] : defaultName;
    name = decodeURIComponent(name).replace(/[^\w.-]/g, '_');
    if (!name.includes('.')) {
      name = `${name}.${getExtension(url)}`;
    }
    return name;
  } catch (e) {
    return `${defaultName}_${Date.now().toString(36)}.${getExtension(url)}`;
  }
}

/**
 * POST /api/extract
 * Scrapes target URL and returns extracted assets
 */
app.post('/api/extract', async (req, res) => {
  let { url, device = 'desktop' } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required.' });
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': device === 'mobile' ? USER_AGENTS.mobile : USER_AGENTS.desktop,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const baseUri = url;
    const pageTitle = $('title').text().trim() || 'Extracted Assets';
    const pageHost = new URL(url).hostname;

    const assets = [];
    const seen = new Set();

    function add(item) {
      if (!item || !item.url) return;
      const u = item.url;
      if (seen.has(u)) return;
      seen.add(u);

      const ext = item.ext || getExtension(u);
      const filename = item.filename || getFileName(u, item.type || 'asset');

      assets.push({
        id: 'asset_' + (assets.length + 1) + '_' + Math.random().toString(36).substr(2, 6),
        url: u,
        type: item.type || 'image',
        category: item.category || 'image',
        ext: ext,
        filename: filename,
        width: item.width || 0,
        height: item.height || 0,
        alt: item.alt || '',
        isMobile: item.isMobile || false,
        device: item.device || (item.isMobile ? 'mobile' : 'all'),
        sourceTag: item.sourceTag || ''
      });
    }

    // 1. Favicons & Apple Touch Icons
    $('link[rel*="icon"], link[rel*="apple-touch-icon"]').each((_, el) => {
      const href = cleanUrl($(el).attr('href'), baseUri);
      if (href) {
        add({
          url: href,
          type: 'image',
          category: 'logo',
          alt: 'Site Favicon / App Icon',
          sourceTag: 'link[rel=icon]'
        });
      }
    });

    // 2. OpenGraph & Twitter Cards
    $('meta[property^="og:image"], meta[name^="twitter:image"]').each((_, el) => {
      const content = cleanUrl($(el).attr('content'), baseUri);
      if (content) {
        add({
          url: content,
          type: 'image',
          category: 'logo',
          alt: 'Social Preview Card',
          sourceTag: 'meta[og:image]'
        });
      }
    });

    // 3. Images (img tags, srcset, lazy)
    $('img').each((_, el) => {
      const img = $(el);
      const alt = img.attr('alt') || img.attr('title') || '';
      const isLogo = /logo|brand/i.test((img.attr('class') || '') + ' ' + (img.attr('id') || '') + ' ' + alt);

      const src = cleanUrl(img.attr('src') || img.attr('data-src') || img.attr('data-original') || img.attr('data-lazy-src'), baseUri);
      if (src) {
        add({
          url: src,
          type: 'image',
          category: isLogo ? 'logo' : 'image',
          alt: alt,
          width: parseInt(img.attr('width'), 10) || 0,
          height: parseInt(img.attr('height'), 10) || 0,
          sourceTag: 'img'
        });
      }

      // Parse srcset
      const srcset = img.attr('srcset');
      if (srcset) {
        srcset.split(/,\s+/).forEach(part => {
          const tokens = part.trim().split(/\s+/);
          const u = cleanUrl(tokens[0], baseUri);
          const desc = tokens[1] || '';
          if (u) {
            const isMob = desc.endsWith('w') && parseInt(desc, 10) <= 768;
            add({
              url: u,
              type: 'image',
              category: 'image',
              alt: alt + (isMob ? ' (Mobile)' : ''),
              isMobile: isMob,
              sourceTag: 'img[srcset]'
            });
          }
        });
      }
    });

    // 4. Picture Sources (Responsive Mobile)
    $('picture source').each((_, el) => {
      const s = $(el);
      const media = s.attr('media') || '';
      const isMob = /(max-width:\s*(?:3[0-9]{2}|4[0-9]{2}|5[0-9]{2}|6[0-9]{2}|7[6-9][0-9]|8[0-9]{2})px)|orientation:\s*portrait/i.test(media);
      const srcset = s.attr('srcset') || s.attr('src');
      if (srcset) {
        srcset.split(/,\s+/).forEach(part => {
          const u = cleanUrl(part.trim().split(/\s+/)[0], baseUri);
          if (u) {
            add({
              url: u,
              type: 'image',
              category: 'image',
              alt: `Responsive Media (${media || 'picture source'})`,
              isMobile: isMob,
              sourceTag: 'picture>source'
            });
          }
        });
      }
    });

    // 5. Videos & Audio
    $('video, audio').each((_, el) => {
      const isVid = el.tagName === 'video';
      const m = $(el);
      const src = cleanUrl(m.attr('src'), baseUri);
      const poster = cleanUrl(m.attr('poster'), baseUri);

      if (src) {
        add({
          url: src,
          type: isVid ? 'video' : 'audio',
          category: isVid ? 'video' : 'audio',
          alt: isVid ? 'HTML5 Video' : 'Audio Track',
          sourceTag: el.tagName
        });
      }

      if (poster) {
        add({
          url: poster,
          type: 'image',
          category: 'image',
          alt: 'Video Poster Thumbnail',
          sourceTag: 'video[poster]'
        });
      }

      m.find('source').each((__, sEl) => {
        const sSrc = cleanUrl($(sEl).attr('src'), baseUri);
        if (sSrc) {
          add({
            url: sSrc,
            type: isVid ? 'video' : 'audio',
            category: isVid ? 'video' : 'audio',
            alt: isVid ? 'Video Stream Source' : 'Audio Stream Source',
            sourceTag: `${el.tagName}>source`
          });
        }
      });
    });

    // 6. Media Links <a>
    const mediaExtRegex = /\.(mp4|webm|ogv|mov|mkv|mp3|wav|ogg|flac)([?#]|$)/i;
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && mediaExtRegex.test(href)) {
        const u = cleanUrl(href, baseUri);
        if (u) {
          const isVid = /\.(mp4|webm|ogv|mov|mkv)/i.test(u);
          add({
            url: u,
            type: isVid ? 'video' : 'audio',
            category: isVid ? 'video' : 'audio',
            alt: $(el).text().trim() || (isVid ? 'Video Link' : 'Audio Link'),
            sourceTag: 'a[href]'
          });
        }
      }
    });

    // 7. CSS Background Images
    const bgUrlRegex = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
    $('[style*="background"]').each((_, el) => {
      const style = $(el).attr('style') || '';
      let match;
      while ((match = bgUrlRegex.exec(style)) !== null) {
        const u = cleanUrl(match[1], baseUri);
        if (u) {
          add({
            url: u,
            type: 'image',
            category: 'background',
            alt: 'CSS Background Image',
            sourceTag: 'style[background]'
          });
        }
      }
    });

    res.json({
      success: true,
      pageUrl: url,
      pageHost: pageHost,
      pageTitle: pageTitle,
      totalCount: assets.length,
      assets: assets
    });
  } catch (err) {
    console.error('Extract error:', err.message);
    res.status(500).json({
      success: false,
      error: `Failed to fetch or parse URL: ${err.message}`
    });
  }
});

/**
 * GET /api/proxy
 * Proxies cross-origin media images
 */
app.get('/api/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing url parameter');

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': USER_AGENTS.desktop,
        'Referer': new URL(url).origin
      },
      timeout: 12000
    });

    const contentType = response.headers['content-type'] || 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(response.data);
  } catch (e) {
    res.status(500).send('Proxy fetch failed');
  }
});

/**
 * POST /api/download-zip
 * Streams server-generated ZIP archive of selected assets
 */
app.post('/api/download-zip', async (req, res) => {
  const { assets = [], format = 'zip', domain = 'WebAssets' } = req.body;
  if (!assets.length) return res.status(400).json({ error: 'No assets selected.' });

  const archive = archiver('zip', { zlib: { level: 6 } });
  const filename = `AssetExtractors_${domain.replace(/[^\w.-]/g, '_')}_${Date.now().toString(36)}.${format}`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  archive.pipe(res);

  for (let i = 0; i < assets.length; i++) {
    const a = assets[i];
    try {
      if (a.url.startsWith('data:')) {
        const b64 = a.url.split(',')[1];
        if (b64) {
          const buf = Buffer.from(b64, 'base64');
          archive.append(buf, { name: `${a.category || 'images'}s/${a.filename || `file_${i + 1}.png`}` });
        }
      } else {
        const fileResp = await axios.get(a.url, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: { 'User-Agent': USER_AGENTS.desktop }
        }).catch(() => null);

        if (fileResp && fileResp.data) {
          archive.append(fileResp.data, { name: `${a.category || 'images'}s/${a.filename || `file_${i + 1}.${a.ext || 'bin'}`}` });
        }
      }
    } catch (err) {
      console.warn('Zip append error:', a.url, err.message);
    }
  }

  await archive.finalize();
});

/**
 * GET /api/ping and /health
 * Lightweight health check & keep-alive endpoint
 */
app.get(['/api/ping', '/health', '/ping'], (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'Asset Extractors Web Service',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    keepAlive: true
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`🚀 Asset Extractors Web Server running on http://localhost:${PORT}`);
  startAutoKeepAlive();
});

/**
 * Auto Keep-Alive Heartbeat (1-Minute Interval)
 * Prevents Render free tier from sleeping by self-pinging
 */
function startAutoKeepAlive() {
  const ONE_MINUTE = 60 * 1000;
  
  setInterval(async () => {
    try {
      // Render automatically sets RENDER_EXTERNAL_URL (e.g. https://asset-extractors.onrender.com)
      const targetBase = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || `http://localhost:${PORT}`;
      const pingUrl = `${targetBase.replace(/\/$/, '')}/api/ping`;
      
      const res = await axios.get(pingUrl, {
        timeout: 8000,
        headers: { 'User-Agent': 'AssetExtractors-KeepAlive-Bot/1.0' }
      });
      
      if (res.status === 200) {
        console.log(`⏱️ [Keep-Alive 1-Min Ping] Pinged ${pingUrl} - Status: OK (${new Date().toLocaleTimeString()})`);
      }
    } catch (err) {
      // Internal heartbeat backup ping
      try {
        await axios.get(`http://127.0.0.1:${PORT}/api/ping`, { timeout: 4000 });
      } catch (e) {}
    }
  }, ONE_MINUTE);

  console.log(`🟢 Auto Keep-Alive Heartbeat initialized (running once every 1 minute)`);
}
