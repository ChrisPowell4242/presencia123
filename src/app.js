/**
 * PRESENCIA DIGITAL — Quiet Luxury Restaurant Template
 * app.js: Fetches config.json and renders the entire site at runtime.
 *
 * HOW TO RUN (required — fetch() is blocked on file:// protocol):
 *   From the project root: python -m http.server 8081
 *   Then open: http://localhost:8081/
 *
 * To swap clients: edit config.json only. No HTML or JS changes needed.
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     UTILITY: escape HTML special chars for safe innerHTML injection
  ------------------------------------------------------------------ */
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function $(id) {
    return document.getElementById(id);
  }

  /* ------------------------------------------------------------------
     1. APPLY THEME
     Writes all config.theme values as CSS custom properties on :root.
     --color-border and --color-accent-hover are auto-derived from
     colorAccent so changing one value in config cascades everywhere.
  ------------------------------------------------------------------ */

  /**
   * Parse a 6-digit hex color (#rrggbb) → { r, g, b }
   * Returns null if the format isn't recognised.
   */
  function parseHex(hex) {
    var h = hex.trim();
    if (h.charAt(0) === '#') h = h.slice(1);
    if (h.length !== 6) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  /**
   * Lighten each channel by a ratio (0–1).
   * e.g. lighten(rgb, 0.1) pushes each channel 10% toward 255.
   */
  function lightenRgb(rgb, ratio) {
    return {
      r: Math.min(255, Math.round(rgb.r + (255 - rgb.r) * ratio)),
      g: Math.min(255, Math.round(rgb.g + (255 - rgb.g) * ratio)),
      b: Math.min(255, Math.round(rgb.b + (255 - rgb.b) * ratio))
    };
  }

  function rgbToHex(rgb) {
    return '#' + [rgb.r, rgb.g, rgb.b]
      .map(function (v) { return v.toString(16).padStart(2, '0'); })
      .join('');
  }

  function applyTheme(theme) {
    var root = document.documentElement;

    // --- Mapping table: config key → CSS custom property ---
    // To add a new themeable property, add one line here. No other JS change needed.
    var cssVarMap = [
      ['colorBg',        '--color-bg'],
      ['colorSurface',   '--color-surface'],
      ['colorText',      '--color-text'],
      ['colorTextMuted', '--color-text-muted'],
      ['navHeight',      '--nav-height'],
    ];

    cssVarMap.forEach(function (pair) {
      if (theme[pair[0]] !== undefined) {
        root.style.setProperty(pair[1], theme[pair[0]]);
      }
    });

    // --- Accent color (canonical: accentColor; legacy fallback: colorAccent) ---
    var accent = theme.accentColor || theme.colorAccent;
    root.style.setProperty('--color-accent', accent);

    // Auto-derive hover (12% lighter) and border (20% opacity) from accent.
    // Override either by adding colorAccentHover or colorBorder to config.theme.
    var accentRgb = parseHex(accent);

    var hoverColor = theme.colorAccentHover ||
      (accentRgb ? rgbToHex(lightenRgb(accentRgb, 0.12)) : accent);
    root.style.setProperty('--color-accent-hover', hoverColor);

    var borderColor = theme.colorBorder ||
      (accentRgb
        ? 'rgba(' + accentRgb.r + ',' + accentRgb.g + ',' + accentRgb.b + ',0.2)'
        : 'rgba(201,169,110,0.2)');
    root.style.setProperty('--color-border', borderColor);

    // --- Fonts (need fallback stacks, so handled outside the loop) ---
    root.style.setProperty('--font-heading', "'" + theme.fontHeading + "', Georgia, serif");
    root.style.setProperty('--font-body',    "'" + theme.fontBody    + "', system-ui, sans-serif");

    // Apply background immediately to prevent flash of unstyled content
    document.body.style.backgroundColor = theme.colorBg;
    document.body.style.color           = theme.colorText;

    // --- Google Fonts: load both heading and body typefaces from config ---
    var hFamily = encodeURIComponent(theme.fontHeading);
    var bFamily = encodeURIComponent(theme.fontBody);
    $('google-fonts-stylesheet').href =
      'https://fonts.googleapis.com/css2?family=' + hFamily +
      ':ital,wght@0,400;0,600;0,700;1,400;1,600&family=' + bFamily +
      ':wght@300;400;500;600&display=swap';
  }

  /* ------------------------------------------------------------------
     2. APPLY META
     Sets all SEO-relevant tags from config: <title>, description,
     Open Graph (og:*) for social sharing, and Twitter Card (twitter:*).
     Builds the <title> as "restaurantName — subtitle" so changing
     brand.restaurantName is the only touch-point needed.
  ------------------------------------------------------------------ */

  /** Set the content attribute of a meta tag matched by attribute selector. */
  function setMeta(selector, value) {
    var el = document.querySelector(selector);
    if (el && value) el.setAttribute('content', value);
  }

  function applyMeta(meta, brand) {
    var name = brand.restaurantName || brand.name || '';

    // Build full title: "Lumière Chicago — Fine Dining Chicago"
    // meta.siteTitle holds the subtitle; restaurantName is the prefix.
    var subtitle = meta.siteTitle.indexOf('\u2014') !== -1 || meta.siteTitle.indexOf('-') !== -1
      ? meta.siteTitle.split(/\u2014|-/).pop().trim()
      : meta.siteTitle;
    var fullTitle = name ? name + ' \u2014 ' + subtitle : meta.siteTitle;

    // --- Standard ---
    $('page-title').textContent   = fullTitle;
    $('meta-description').content = meta.description;
    $('favicon-link').href        = meta.favicon;

    // --- Open Graph (Facebook, LinkedIn, WhatsApp link previews) ---
    setMeta('meta[property="og:title"]',       fullTitle);
    setMeta('meta[property="og:description"]', meta.description);
    setMeta('meta[property="og:image"]',       meta.ogImage || '');
    setMeta('meta[property="og:url"]',         meta.canonicalUrl || window.location.href);

    // --- Twitter Card ---
    setMeta('meta[name="twitter:title"]',       fullTitle);
    setMeta('meta[name="twitter:description"]', meta.description);
    setMeta('meta[name="twitter:image"]',       meta.ogImage || '');

    // --- Canonical URL (optional) ---
    if (meta.canonicalUrl) {
      var canonical = document.getElementById('canonical-link');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.id  = 'canonical-link';
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = meta.canonicalUrl;
    }
  }

  /* ------------------------------------------------------------------
     3. RENDER NAV
  ------------------------------------------------------------------ */
  function renderNav(brand, nav) {
    // Restaurant name — the primary visible identity in the nav
    var name = brand.restaurantName || brand.name || brand.logoAlt || '';
    $('nav-brand-name').textContent = name;

    // Logo image (kept as progressive enhancement; hidden via CSS by default)
    var logo = $('nav-logo');
    logo.src = brand.logo;
    logo.alt = name;

    // Update the nav link accessible label
    var logoLink = $('nav-logo-link');
    if (logoLink) logoLink.setAttribute('aria-label', name);

    // Desktop CTA
    const cta = $('nav-cta');
    cta.href        = nav.ctaHref;
    cta.textContent = nav.ctaLabel;

    // Desktop links
    const desktopLinks = nav.links.map(link =>
      `<li><a href="${esc(link.href)}" class="nav-link">${esc(link.label)}</a></li>`
    ).join('');
    $('nav-links').innerHTML = desktopLinks;

    // Mobile links (italic heading style, each <li> carries stagger class)
    const mobileLinks = nav.links.map(link =>
      `<li class="mobile-nav-link-item"><a href="${esc(link.href)}" class="mobile-nav-link">${esc(link.label)}</a></li>`
    ).join('');
    $('mobile-nav-links').innerHTML = mobileLinks;

    const mobileCta = $('mobile-nav-cta');
    mobileCta.href        = nav.ctaHref;
    mobileCta.textContent = nav.ctaLabel;

    // Footer logo (same asset)
    $('footer-logo').src = brand.logo;
    $('footer-logo').alt = brand.logoAlt;
  }

  /* ------------------------------------------------------------------
     4. RENDER HERO
  ------------------------------------------------------------------ */
  function renderHero(hero) {
    // Background image
    $('hero-bg').style.backgroundImage = `url('${hero.backgroundImage}')`;

    // Overlay
    $('hero-overlay').style.backgroundColor = `rgba(0,0,0,${hero.overlayOpacity})`;

    // Text
    $('hero-headline').textContent    = hero.headline;
    $('hero-subheadline').textContent = hero.subheadline;

    // CTAs
    const cta1 = $('hero-cta1');
    cta1.href        = hero.cta1Href;
    cta1.textContent = hero.cta1Label;

    const cta2 = $('hero-cta2');
    cta2.href        = hero.cta2Href;
    cta2.textContent = hero.cta2Label;
  }

  /* ------------------------------------------------------------------
     5. RENDER ABOUT
     about.body accepts either a string or an array of strings.
     Each string becomes its own <p> element.
  ------------------------------------------------------------------ */
  function renderAbout(about) {
    $('about-eyebrow').textContent  = about.eyebrow;
    $('about-headline').textContent = about.headline;

    // Normalise: wrap a plain string in an array so the map always works
    var paragraphs = Array.isArray(about.body) ? about.body : [about.body];
    $('about-body').innerHTML = paragraphs
      .filter(function (p) { return p && p.trim(); }) // skip empty entries
      .map(function (p) { return '<p>' + esc(p) + '</p>'; })
      .join('');

    var img = $('about-image');
    img.src = about.image;
    img.alt = about.imageAlt || '';
  }

  /* ------------------------------------------------------------------
     6. RENDER MENU
     Loops over menu.categories; each becomes a tab + panel pair.
     item.price and item.description are optional — omit either in
     config and the element is simply not rendered.
  ------------------------------------------------------------------ */
  function renderMenu(menu) {
    $('menu-eyebrow').textContent  = menu.eyebrow;
    $('menu-headline').textContent = menu.headline;

    var tabsEl   = $('menu-tabs');
    var panelsEl = $('menu-panels');

    // Clear any previous render (safe to call multiple times)
    tabsEl.innerHTML   = '';
    panelsEl.innerHTML = '';

    menu.categories.forEach(function (cat, i) {
      /* --- Tab button --- */
      var tab = document.createElement('button');
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      tab.setAttribute('aria-controls', 'panel-' + cat.id);
      tab.dataset.tab = cat.id;
      tab.textContent = cat.label;
      tab.className   = i === 0 ? 'tab-btn tab-btn--active' : 'tab-btn';
      tabsEl.appendChild(tab);

      /* --- Tab panel --- */
      var panel = document.createElement('div');
      panel.id = 'panel-' + cat.id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', 'tab-' + cat.id);
      panel.hidden = i !== 0;

      // Loop over items; price and description are optional
      var items = (cat.items || []).map(function (item) {
        var priceHtml = item.price
          ? '<span style="color:var(--color-accent);font-size:0.9375rem;font-weight:500;white-space:nowrap;flex-shrink:0">' + esc(item.price) + '</span>'
          : '';
        var descHtml = item.description
          ? '<p style="color:var(--color-text-muted);font-size:0.875rem;line-height:1.65">' + esc(item.description) + '</p>'
          : '';
        return (
          '<div class="menu-item">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:1rem;margin-bottom:0.5rem">' +
              '<h3 class="font-heading" style="font-size:1.1875rem;color:var(--color-text);line-height:1.3">' + esc(item.name) + '</h3>' +
              priceHtml +
            '</div>' +
            descHtml +
          '</div>'
        );
      }).join('');

      panel.innerHTML =
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr));gap:2rem 4rem">' +
        items + '</div>';

      panelsEl.appendChild(panel);
    });
  }

  /* ------------------------------------------------------------------
     7. RENDER RESERVATIONS
  ------------------------------------------------------------------ */
  function renderReservations(res) {
    $('res-eyebrow').textContent  = res.eyebrow;
    $('res-headline').textContent = res.headline;
    $('res-body').textContent     = res.body;

    const resCta = $('res-cta');
    resCta.href        = res.ctaHref;
    resCta.textContent = res.ctaLabel;

    // Build WhatsApp deep link
    const wa = res.whatsapp;
    const waUrl = `https://wa.me/${esc(wa.number)}?text=${encodeURIComponent(wa.message)}`;
    const waBtn = $('res-whatsapp');
    waBtn.href        = waUrl;
    waBtn.textContent = wa.label;
  }

  /* ------------------------------------------------------------------
     8. RENDER FOOTER
  ------------------------------------------------------------------ */
  function renderFooter(footer) {
    $('footer-address').textContent   = footer.address;
    $('footer-phone').textContent     = footer.phone;
    $('footer-email').textContent     = footer.email;
    $('footer-copyright').textContent = footer.copyright;

    // Footer links
    $('footer-links').innerHTML = footer.links.map(link =>
      `<li><a href="${esc(link.href)}" class="footer-link">${esc(link.label)}</a></li>`
    ).join('');

    // Social icons
    $('footer-social').innerHTML = footer.social.map(s =>
      `<a href="${esc(s.href)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(s.platform)}">
         <img src="${esc(s.icon)}" alt="${esc(s.platform)}" class="social-icon" />
       </a>`
    ).join('');
  }

  /* ------------------------------------------------------------------
     8b. RENDER FLOATING WHATSAPP BUTTON
     Builds the wa.me deep link and reveals the button with a short
     delay so it doesn't compete with the hero entrance animation.
  ------------------------------------------------------------------ */
  function renderFloatingWhatsApp(whatsapp) {
    var btn = $('whatsapp-float');
    if (!btn || !whatsapp || !whatsapp.number) return;
    var url = 'https://wa.me/' + esc(whatsapp.number) +
              '?text=' + encodeURIComponent(whatsapp.message || '');
    btn.href = url;
    btn.setAttribute('aria-label', whatsapp.label || 'Chat on WhatsApp');
    // Delay reveal so it pops in after the hero has settled
    setTimeout(function () { btn.classList.add('is-ready'); }, 1200);
  }

  /* ------------------------------------------------------------------
     9. INIT BEHAVIORS
     Nav scroll state, hamburger, tab switching, scroll animations.
  ------------------------------------------------------------------ */
  function initBehaviors() {
    const nav          = $('nav');
    const hamburger    = $('hamburger');
    const mobileMenu   = $('mobile-menu');
    const mobileClose  = $('mobile-close');
    const mobileLinks  = $('mobile-nav-links');
    const menuTabs     = $('menu-tabs');

    /* --- Nav scroll backdrop --- */
    function handleNavScroll() {
      nav.classList.toggle('nav-scrolled', window.scrollY > 50);
    }
    window.addEventListener('scroll', handleNavScroll, { passive: true });
    handleNavScroll(); // run once on load

    /* --- Hamburger open --- */
    hamburger.addEventListener('click', function () {
      mobileMenu.classList.add('is-open');
      hamburger.classList.add('hamburger--open');
      document.body.style.overflow = 'hidden';
      hamburger.setAttribute('aria-expanded', 'true');
      mobileClose.focus();
    });

    /* --- Mobile menu close --- */
    function closeMobileMenu() {
      mobileMenu.classList.remove('is-open');
      hamburger.classList.remove('hamburger--open');
      document.body.style.overflow = '';
      hamburger.setAttribute('aria-expanded', 'false');
    }

    mobileClose.addEventListener('click', closeMobileMenu);

    // Close when a nav link is tapped
    mobileLinks.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') closeMobileMenu();
    });
    $('mobile-nav-cta').addEventListener('click', closeMobileMenu);

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
        closeMobileMenu();
      }
    });

    /* --- Menu tabs (event delegation) --- */
    menuTabs.addEventListener('click', function (e) {
      const btn = e.target.closest('[role="tab"]');
      if (!btn) return;

      // Deactivate all
      menuTabs.querySelectorAll('[role="tab"]').forEach(function (t) {
        t.setAttribute('aria-selected', 'false');
        t.classList.remove('tab-btn--active');
      });
      document.querySelectorAll('[role="tabpanel"]').forEach(function (p) {
        p.hidden = true;
      });

      // Activate clicked
      btn.setAttribute('aria-selected', 'true');
      btn.classList.add('tab-btn--active');
      var panelId = 'panel-' + btn.dataset.tab;
      var panel = document.getElementById(panelId);
      if (panel) panel.hidden = false;
    });

    /* --- Scroll-triggered fade-in (IntersectionObserver) --- */
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });

      document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
        observer.observe(el);
      });
    } else {
      // Fallback for very old browsers — just show everything
      document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
        el.classList.add('is-visible');
      });
    }
  }

  /* ------------------------------------------------------------------
     MAIN INIT
     Fetch config.json, run all renderers in order.
  ------------------------------------------------------------------ */
  function init(config) {
    applyTheme(config.theme);
    applyMeta(config.meta, config.brand);
    renderNav(config.brand, config.nav);
    renderHero(config.hero);
    renderAbout(config.about);
    renderMenu(config.menu);
    renderReservations(config.reservations);
    renderFooter(config.footer);
    renderFloatingWhatsApp(config.reservations.whatsapp);
    initBehaviors();
  }

  /* ------------------------------------------------------------------
     BOOTSTRAP
     Fetches config.json relative to index.html (project root).
     From http://localhost:PORT/ this resolves to http://localhost:PORT/config.json.

     Start the server from the PROJECT ROOT (the folder containing config.json):
       python -m http.server 8081
     Then open: http://localhost:8081/
  ------------------------------------------------------------------ */
  fetch('config.json')
    .then(function (res) {
      if (!res.ok) {
        throw new Error(
          'HTTP ' + res.status + ' fetching config.json. ' +
          'Make sure your server is running from the project root ' +
          '(the folder that contains config.json, not the src/ folder).'
        );
      }
      return res.json();
    })
    .then(function (config) {
      console.log(
        '[Presencia] config.json loaded \u2713  restaurant: "' +
        (config.brand && config.brand.restaurantName) + '"'
      );
      init(config);
    })
    .catch(function (err) {
      console.error('[Presencia] Failed to load config.json —', err.message);

      // Show a visible diagnostic banner so the problem is obvious without DevTools
      var banner = document.createElement('div');
      banner.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:9999',
        'display:flex', 'flex-direction:column',
        'align-items:center', 'justify-content:center',
        'background:#0a0a0a', 'color:#f5f0eb',
        'font-family:system-ui,sans-serif', 'padding:2rem',
        'text-align:center', 'gap:1rem'
      ].join(';');
      banner.innerHTML =
        '<p style="font-size:1.5rem;font-weight:600;color:#c9a96e">config.json not loaded</p>' +
        '<p style="max-width:480px;line-height:1.6;opacity:0.75">' + err.message + '</p>' +
        '<p style="font-size:0.8rem;opacity:0.45;font-family:monospace">' +
        'Start your server from the project root:<br>' +
        'python -m http.server 8081<br>' +
        'then open http://localhost:8081/src/' +
        '</p>';
      document.body.appendChild(banner);
    });

})();
