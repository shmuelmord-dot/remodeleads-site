/* ==========================================================================
   RemodeLeads — marketing site behaviour
   Plain ES5-safe-ish ES6. No framework, no build step. Every module is
   defensive: if its markup isn't on the page, it silently does nothing.
   ========================================================================== */
(function () {
  'use strict';

  /* ----------------------------------------------------------------------
     SITE CONFIG — the only block you normally need to edit.
     ---------------------------------------------------------------------- */
  var CONFIG = {
    phone: '(323) 800-8381',
    phoneHref: 'tel:+13238008381',
    email: 'info@remodeleads.com',

    // Shachar's WhatsApp. This is the primary contact channel now - the
    // booking calendar was retired in favour of it. Keep in sync with the
    // hrefs in the HTML and WHATSAPP_URL in quote.js.
    whatsappNumber: '+972 55-712-7466',
    whatsappUrl: 'https://wa.me/972557127466?text=Hi%2C%20I%20came%20from%20your%20website%20and%20I%27d%20love%20to%20ask%20a%20few%20questions.',

    // The live calendar is the LeadConnector/GHL widget embedded directly in
    // book.html, because its form_embed.js script needs the original iframe id
    // to post height updates back. Leave this EMPTY — setting it makes
    // initScheduler() replace that widget with a plain iframe that won't resize.
    // Only use it if you switch to a different scheduler (Calendly, Cal.com…).
    schedulerUrl: '',

    // Bump this together with the ?v= on the CSS/JS tags in the HTML. Client
    // logos are cached by the browser, so without it a logo you DELETE keeps
    // rendering for returning visitors — served from their cache long after
    // the file 404s on the server.
    assetVersion: 5,

    // ONE offer: a delivered appointment, billed per appointment. There is no
    // ad-budget track on this site — the contractor never funds media.
    // Keep in sync with pricing.html and the quote builder.
    appointmentFee: 250,

    // Optional filters the contractor switches on in the app. Per appointment.
    // 'confirmed' is the Confirmation + Insurance plan: 250 + 100 = the $350
    // headline price. The other three are targeting filters.
    addOns: {
      confirmed:    { label: 'Confirmation + Insurance', price: 100 },
      kitchen:      { label: 'Kitchen only',             price: 35 },
      luxury:       { label: 'Luxury homes only',        price: 40 },
      noApartments: { label: 'No apartments or condos',  price: 50 }
    },

    // Territory availability shown by the hero widget + coverage grid.
    // 'open' | 'limited' | 'waitlist'
    counties: {
      'Los Angeles':    'open',
      'Orange County':  'limited',
      'Ventura':        'open',
      'San Bernardino': 'open',
      'Riverside':      'limited',
      'Kern':           'open'
    }
  };

  window.REMODELEADS_CONFIG = CONFIG;

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  var usd = function (n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  };
  var usdShort = function (n) {
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(n >= 10000000 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1000)    return '$' + Math.round(n / 1000) + 'k';
    return usd(n);
  };

  /* ----------------------------------------------------------------------
     1. Header — stuck state, mobile drawer, active link
     ---------------------------------------------------------------------- */
  function initHeader() {
    var header = $('.site-header');
    if (header) {
      var onScroll = function () {
        header.classList.toggle('is-stuck', window.scrollY > 6);
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    var toggle = $('.nav__toggle');
    var menu = $('.mobile-menu');
    if (toggle && menu) {
      toggle.addEventListener('click', function () {
        var open = menu.classList.toggle('is-open');
        toggle.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      // Close the drawer after tapping a link
      $$('a', menu).forEach(function (a) {
        a.addEventListener('click', function () {
          menu.classList.remove('is-open');
          toggle.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // Mark the current page in the nav.
    // Extension-agnostic: Firebase Hosting `cleanUrls` serves /pricing while the
    // markup links to pricing.html, so both sides get normalised before comparing.
    var slug = function (p) {
      return (p || '').split('#')[0].split('?')[0].split('/').pop().replace(/\.html$/, '') || 'index';
    };
    var here = slug(location.pathname);
    $$('.nav__links a, .mobile-menu a').forEach(function (a) {
      if (slug(a.getAttribute('href')) === here) a.classList.add('is-active');
    });
  }

  /* ----------------------------------------------------------------------
     2. Scroll reveal
     ---------------------------------------------------------------------- */
  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    // threshold 0 (not a ratio) so an element taller than the viewport can
    // never get stuck permanently invisible — it reveals as soon as any
    // part of it enters the viewport.
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------------
     3. Count-up numbers — <span data-count="10000" data-suffix="+">
     ---------------------------------------------------------------------- */
  function initCounters() {
    var nums = $$('[data-count]');
    if (!nums.length || !('IntersectionObserver' in window)) {
      nums.forEach(function (el) {
        el.textContent = (el.dataset.prefix || '') + Number(el.dataset.count).toLocaleString('en-US') + (el.dataset.suffix || '');
      });
      return;
    }

    var run = function (el) {
      var target = Number(el.dataset.count) || 0;
      var prefix = el.dataset.prefix || '';
      var suffix = el.dataset.suffix || '';
      var decimals = Number(el.dataset.decimals || 0);
      var dur = 1200, t0 = null;

      var tick = function (ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = target * eased;
        el.textContent = prefix +
          (decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString('en-US')) +
          suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    nums.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------------
     4. Accordion (FAQ)
     ---------------------------------------------------------------------- */
  function initAccordion() {
    $$('.accordion').forEach(function (acc) {
      var single = acc.dataset.single !== 'false';
      $$('.acc-btn', acc).forEach(function (btn) {
        var panel = btn.nextElementSibling;
        if (!panel) return;

        // Pages that omit the attribute in markup would otherwise start with
        // no closed-state styling on the +/× icon, and no a11y state at all.
        if (!btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded', 'false');

        btn.addEventListener('click', function () {
          var isOpen = btn.getAttribute('aria-expanded') === 'true';

          if (single) {
            $$('.acc-btn', acc).forEach(function (other) {
              if (other === btn) return;
              other.setAttribute('aria-expanded', 'false');
              if (other.nextElementSibling) other.nextElementSibling.style.maxHeight = null;
            });
          }
          btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
          panel.style.maxHeight = isOpen ? null : panel.scrollHeight + 'px';
        });
      });
    });

    // Keep an open panel correctly sized after a resize
    window.addEventListener('resize', function () {
      $$('.acc-btn[aria-expanded="true"]').forEach(function (btn) {
        if (btn.nextElementSibling) btn.nextElementSibling.style.maxHeight = btn.nextElementSibling.scrollHeight + 'px';
      });
    });
  }

  /* ----------------------------------------------------------------------
     5. Tabs — [data-tabs] wrapper, buttons carry data-tab="key",
        panels carry data-panel="key"
     ---------------------------------------------------------------------- */
  function initTabs() {
    $$('[data-tabs]').forEach(function (wrap) {
      var buttons = $$('[data-tab]', wrap);
      var panels  = $$('[data-panel]', wrap);

      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var key = btn.dataset.tab;
          buttons.forEach(function (b) {
            var on = b === btn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          panels.forEach(function (p) {
            p.classList.toggle('is-active', p.dataset.panel === key);
          });
        });
      });
    });
  }

  /* ----------------------------------------------------------------------
     5b. Cinematic hero slideshow
         Slow Ken Burns drift + crossfade. Slide 1 is inlined in the HTML so
         it paints before JS runs; the rest are created and lazily warmed.
         Swap these for real project photos when you have them — see README.
     ---------------------------------------------------------------------- */
  var SLIDES = [
    { img: 'assets/img/hero/hero-1.jpg', title: 'Whole-Home Renovation', sub: 'The kind of project we book' },
    { img: 'assets/img/hero/hero-2.jpg', title: 'Full Kitchen Remodel',  sub: 'Cabinetry, counters, full tear-out' },
    { img: 'assets/img/hero/hero-3.jpg', title: 'Chef Kitchen Build',    sub: 'Pro range, stone, custom millwork' },
    { img: 'assets/img/hero/hero-4.jpg', title: 'Master Bath Overhaul',  sub: 'Freestanding tub, walk-in shower' },
    { img: 'assets/img/hero/hero-5.jpg', title: 'Open-Plan Conversion',  sub: 'Wall removal, kitchen relocation' }
  ];
  var SLIDE_MS = 13000; // must match the kenburns + dotfill durations in the CSS

  function initHeroSlideshow() {
    var bg = $('#hero-bg');
    if (!bg || SLIDES.length < 2) return;

    var caption = $('#hero-caption');
    var capTitle = caption && $('.hero__caption-title', caption);
    var capSub = caption && $('.hero__caption-sub', caption);
    var dotsWrap = $('#hero-dots');

    // Build the remaining slides (slide 0 already exists in the markup)
    var slides = [bg.firstElementChild];
    for (var i = 1; i < SLIDES.length; i++) {
      var el = document.createElement('div');
      el.className = 'hero__slide';
      bg.appendChild(el);
      slides.push(el);
    }

    // Dots
    var dots = [];
    if (dotsWrap) {
      SLIDES.forEach(function (s, i) {
        var b = document.createElement('button');
        b.className = 'hero__dot' + (i === 0 ? ' is-active' : '');
        b.type = 'button';
        b.setAttribute('aria-label', 'Show ' + s.title);
        b.addEventListener('click', function () { go(i, true); });
        dotsWrap.appendChild(b);
        dots.push(b);
      });
    }

    var current = 0;
    var timer = null;
    var loaded = { 0: true };

    // Warm the next image before we need it, so a crossfade never shows a gap
    var preload = function (i) {
      if (loaded[i]) return;
      loaded[i] = true;
      var im = new Image();
      im.src = SLIDES[i].img;
      slides[i].style.backgroundImage = "url('" + SLIDES[i].img + "')";
    };

    function go(next, manual) {
      if (next === current) return;
      preload(next);

      slides[current].classList.remove('is-active');
      slides[next].classList.add('is-active');

      if (dots[current]) dots[current].classList.remove('is-active');
      if (dots[next]) {
        // re-trigger the CSS fill animation by forcing a reflow
        dots[next].classList.remove('is-active');
        void dots[next].offsetWidth;
        dots[next].classList.add('is-active');
      }

      if (caption) {
        caption.style.opacity = '0';
        setTimeout(function () {
          if (capTitle) capTitle.textContent = SLIDES[next].title;
          if (capSub) capSub.textContent = SLIDES[next].sub;
          caption.style.opacity = '1';
        }, 380);
      }

      current = next;
      preload((next + 1) % SLIDES.length);
      if (manual) restart();
    }

    function tick() { go((current + 1) % SLIDES.length); }
    function restart() { clearInterval(timer); timer = setInterval(tick, SLIDE_MS); }

    preload(1);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    restart();

    // Don't burn frames (or advance unseen) while the tab is hidden
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearInterval(timer);
      else restart();
    });
  }

  /* ----------------------------------------------------------------------
     5c. Client logo marquee
         Drop files into assets/img/clients/ named client-1.png … client-12.png
         and add the company name below. Names are only used for alt text and
         the hover title, so a missing entry still renders — it just reads
         "Client logo" to a screen reader.

         A static site can't list a directory, so each candidate is probed by
         loading it. Anything that 404s is dropped, and the whole band stays
         hidden unless at least MIN_LOGOS actually load — a half-filled folder
         must never ship as a row of broken images.
     ---------------------------------------------------------------------- */
  var CLIENT_NAMES = {
    'client-1': "A-Team Builders",
    'client-2': "Better Together Builders",
    'client-3': "Concierge Home Remodeling",
    'client-4': "Alpha Dream Construction",
    'client-5': "Barak Builders",
    'client-6': "BAU Design & Build",
    'client-7': "TopPro Home Builders",
    'client-8': "Sky Renovation & New Construction",
    'client-9': "Premier Custom Builders",
    'client-10': "Precision Home Remodeling",
    'client-11': "Papaya Construction",
    'client-12': "Lio James Construction",
    'client-13': "Remodelers, Inc.",
    'client-14': "Mela Builders",
    'client-15': "King Remodeling Corp.",
    'client-16': "I Do Remodeling",
    'client-17': "Level Up Construction",
    'client-18': "Hinomi",
    'client-19': "Horizon Design Renovate Build",
    'client-20': "Evertrust Construction",
    'client-21': "Home Pro Green Remodeling",
    'client-22': "AHI American Home Improvement",
    'client-23': "770 Construction",
    'client-24': "One Week Bath",
    'client-25': "Kavin Constructions",
    'client-26': "Paradise Remodeling",
    'client-27': "Mega Builders",
    'client-28': "Express Remodeling",
    'client-29': "SoCal Contractors Remodeling",
    'client-30': "AEC Home Renovation",
    'client-31': "Saban Global",
    'client-32': "LA Construction"
  };
  var CLIENT_MAX = 40;   // highest client-N we look for
  var CLIENT_EXTS = ['png', 'svg', 'jpg', 'webp'];
  var MIN_LOGOS = 3;     // fewer than this looks thin — better to show nothing

  function initClientMarquee() {
    var band = $('#logo-band');
    if (!band) return;
    var track = $('.marquee__track', band);
    if (!track) return;

    var ver = '?v=' + (CONFIG.assetVersion || 1);

    // Try each extension for one slot; resolve with the first that loads.
    var probe = function (slot) {
      return new Promise(function (resolve) {
        var i = 0;
        var attempt = function () {
          if (i >= CLIENT_EXTS.length) return resolve(null);
          var src = 'assets/img/clients/' + slot + '.' + CLIENT_EXTS[i++] + ver;
          var im = new Image();
          im.onload = function () { resolve(im.naturalWidth ? src : attempt()); };
          im.onerror = attempt;
          im.src = src;
        };
        attempt();
      });
    };

    var slots = [];
    for (var n = 1; n <= CLIENT_MAX; n++) slots.push('client-' + n);

    Promise.all(slots.map(probe)).then(function (found) {
      var logos = [];
      found.forEach(function (src, idx) {
        if (!src) return;
        var name = CLIENT_NAMES['client-' + (idx + 1)];
        if (!name) {
          // A file with no entry in CLIENT_NAMES is either a leftover or a
          // stale cache hit. Showing a nameless mark in a trust bar is worse
          // than showing one fewer, so skip it — and say why.
          if (window.console) console.warn('[marquee] skipping client-' + (idx + 1) + ': no company name in CLIENT_NAMES');
          return;
        }
        logos.push({ src: src, name: name });
      });

      if (logos.length < MIN_LOGOS) return; // band stays hidden

      // Two copies back to back so the -50% keyframe loops seamlessly.
      var html = logos.map(function (l) {
        return '<div class="marquee__item" title="' + l.name + '">' +
                 '<img src="' + l.src + '" alt="' + l.name + '" loading="lazy">' +
               '</div>';
      }).join('');
      track.innerHTML = html + html;

      band.classList.add('is-ready');

      // Drive the duration off the measured track width, not the logo count, so
      // the band always drifts at the same reading pace. Counting logos meant
      // 33 of them crawled past at a 165-second loop.
      var PX_PER_SEC = 55;
      var setPace = function () {
        var half = track.scrollWidth / 2;       // one copy of the set
        if (!half) return;
        track.style.setProperty('--marquee-duration', Math.round(half / PX_PER_SEC) + 's');
      };
      // Images may still be decoding; re-measure once they've all settled.
      setPace();
      Promise.all([].map.call(track.querySelectorAll('img'), function (im) {
        return im.complete ? null : new Promise(function (r) { im.onload = im.onerror = r; });
      })).then(setPace);
      window.addEventListener('resize', setPace);
    });
  }

  /* ----------------------------------------------------------------------
     6. Hero widget — territory availability check
     ---------------------------------------------------------------------- */
  function initTerritoryWidget() {
    var form = $('#territory-form');
    if (!form) return;

    var result = $('#territory-result');
    var countySel = $('#territory-county', form);
    var serviceSel = $('#territory-service', form);

    // Populate counties from CONFIG so the list lives in one place
    if (countySel && !countySel.dataset.static) {
      Object.keys(CONFIG.counties).forEach(function (name) {
        var opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        countySel.appendChild(opt);
      });
    }

    // Toggle state classes rather than reassigning className — the result box
    // carries a different base class in the hero (.hero__result) than it would
    // inside a card (.widget__result), and blowing it away would unstyle it.
    var show = function (html, warn) {
      result.innerHTML = html;
      result.classList.add('is-open');
      result.classList.toggle('is-warn', !!warn);
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var county = countySel ? countySel.value : '';
      var service = serviceSel ? serviceSel.value : '';

      if (!county || !service) {
        show('Pick a service type and a county so we can check capacity.', true);
        return;
      }

      var status = CONFIG.counties[county] || 'open';

      if (status === 'waitlist') {
        show('<strong>' + county + ' is currently at capacity.</strong> ' +
          'We cap how many contractors we run per territory so appointments stay exclusive. ' +
          'Book a call and we\'ll put you first in line as soon as a slot frees up.', true);
      } else if (status === 'limited') {
        show('<strong>Limited capacity in ' + county + '.</strong> ' +
          'We still have room for ' + service.toLowerCase() + ' consultations, but this territory is filling up. ' +
          'Book a call to lock your slots.', true);
      } else {
        show('<strong>Good news — we have capacity in ' + county + '.</strong> ' +
          'We can start booking ' + service.toLowerCase() + ' consultations onto your calendar. ' +
          'Next step is a 15-minute call to set your territory, weekly volume and budget.', false);
      }

      // Reveal both routes: straight into onboarding, or book a call first.
      var actions = $('#territory-actions');
      if (actions) actions.style.display = '';
    });
  }

  /* ----------------------------------------------------------------------
     7. Coverage grid — render county cards from CONFIG
     ---------------------------------------------------------------------- */
  function initCoverageGrid() {
    var grid = $('#coverage-grid');
    if (!grid) return;

    var labels = { open: 'Accepting', limited: 'Limited', waitlist: 'Waitlist' };

    grid.innerHTML = Object.keys(CONFIG.counties).map(function (name) {
      var status = CONFIG.counties[name];
      var cls = status === 'open' ? 'open' : 'limited';
      return '<div class="county">' +
               '<span class="county__name">' + name + '</span>' +
               '<span class="county__status county__status--' + cls + '">' +
                 (status === 'open' ? '● ' : '◐ ') + (labels[status] || 'Open') +
               '</span>' +
             '</div>';
    }).join('');
  }

  /* ----------------------------------------------------------------------
     8. Activity feed
        ⚠️ SAMPLE DATA — representative of the consultations we book, not a
        live database read. Replace this array (or wire it to a real feed)
        before treating it as literal.
     ---------------------------------------------------------------------- */
  var ACTIVITY = [
    { city: 'Pasadena',      county: 'LA County',       job: 'Full Kitchen Remodel',     size: '$45k–$60k range',  when: 'Tomorrow, 10:00 AM' },
    { city: 'Irvine',        county: 'Orange County',   job: 'Master Bath Overhaul',     size: '$28k–$35k range',  when: 'Wed, 2:30 PM' },
    { city: 'Thousand Oaks', county: 'Ventura',         job: 'Kitchen & Bath Combo',     size: '$70k+ range',      when: 'Thu, 9:15 AM' },
    { city: 'Rancho Cucamonga', county: 'San Bernardino', job: 'Full Kitchen Remodel',  size: '$40k–$55k range',  when: 'Thu, 4:00 PM' },
    { city: 'Bakersfield',   county: 'Kern',            job: 'Whole-Home Renovation',    size: '$120k+ range',     when: 'Fri, 11:00 AM' },
    { city: 'Glendale',      county: 'LA County',       job: 'Two Full Baths',           size: '$36k–$48k range',  when: 'Fri, 1:45 PM' },
    { city: 'Corona',        county: 'Riverside',       job: 'Full Kitchen Remodel',     size: '$38k–$50k range',  when: 'Mon, 9:00 AM' },
    { city: 'Santa Clarita', county: 'LA County',       job: 'Master Bath + Powder Room', size: '$30k–$42k range', when: 'Mon, 3:15 PM' }
  ];

  function initActivityFeed() {
    var feed = $('#activity-feed');
    if (!feed) return;

    var visible = 4;
    var cursor = 0;

    var cardHTML = function (item, isNew) {
      return '<div class="ticker__item' + (isNew ? ' ticker__item--new' : '') + '">' +
               '<span class="dot' + (isNew ? ' dot--pulse' : '') + '"></span>' +
               '<div class="ticker__body">' +
                 '<div class="ticker__title">' + item.job + ' — ' + item.city + '</div>' +
                 '<div class="ticker__meta">' + item.county + ' · ' + item.size + '</div>' +
               '</div>' +
               '<span class="ticker__when">' + item.when + '</span>' +
             '</div>';
    };

    // Seed
    for (var i = 0; i < visible; i++) {
      feed.insertAdjacentHTML('beforeend', cardHTML(ACTIVITY[i % ACTIVITY.length], false));
      cursor++;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    setInterval(function () {
      if (document.hidden) return;
      var item = ACTIVITY[cursor % ACTIVITY.length];
      cursor++;
      feed.insertAdjacentHTML('afterbegin', cardHTML(item, true));
      // Drop the oldest and clear the "new" highlight on the previous top card
      while (feed.children.length > visible) feed.removeChild(feed.lastElementChild);
      if (feed.children[1]) {
        feed.children[1].classList.remove('ticker__item--new');
        var d = $('.dot', feed.children[1]);
        if (d) d.classList.remove('dot--pulse');
      }
    }, 4200);
  }

  /* ----------------------------------------------------------------------
     9. ROI calculator
     ---------------------------------------------------------------------- */
  function initCalculator() {
    var calc = $('#roi-calc');
    if (!calc) return;

    var addonBtns = $$('[data-addon]', calc);
    var apptWrap  = $('#calc-appts-wrap', calc);

    var elAppts   = $('#calc-appts', calc);
    var elValue   = $('#calc-value', calc);
    var elClose   = $('#calc-close', calc);
    var elMargin  = $('#calc-margin', calc);

    var outAppts  = $('#calc-appts-out', calc);
    var outValue  = $('#calc-value-out', calc);
    var outClose  = $('#calc-close-out', calc);
    var outMargin = $('#calc-margin-out', calc);

    var resRevenue = $('#res-revenue', calc);
    var resAppts   = $('#res-appts', calc);
    var resJobs    = $('#res-jobs', calc);
    var resProfit  = $('#res-profit', calc);
    var resCost    = $('#res-cost', calc);
    var resNet     = $('#res-net', calc);
    var resRoi     = $('#res-roi', calc);
    var resNote    = $('#res-note', calc);

    // The confirmed-arrival add-on is the only thing that changes the per
    // appointment price, so the calculator exposes it as a toggle.
    var confirmedOn = false;

    // Average project value spans 10k–1.2M — 120x. On a linear track the
    // 10k–100k band that most remodels fall into would occupy the first 7% of
    // the slider and be impossible to set on a phone. So the input carries a
    // 0–100 position and we map it logarithmically, then round to a figure a
    // human would actually say out loud.
    var VALUE_MIN = 10000, VALUE_MAX = 1200000;
    var posToValue = function (pos) {
      var v = VALUE_MIN * Math.pow(VALUE_MAX / VALUE_MIN, Number(pos) / 100);
      if (v < 100000)  return Math.round(v / 1000) * 1000;
      if (v < 500000)  return Math.round(v / 10000) * 10000;
      return Math.round(v / 25000) * 25000;
    };

    var paintSlider = function (el) {
      if (!el) return;
      var min = Number(el.min), max = Number(el.max), val = Number(el.value);
      var pct = ((val - min) / (max - min)) * 100;
      el.style.background =
        'linear-gradient(90deg, var(--orange-500) 0%, var(--orange-500) ' + pct + '%, var(--line) ' + pct + '%, var(--line) 100%)';
    };

    var recalc = function () {
      var avgValue  = posToValue(elValue.value);
      var closeRate = Number(elClose.value) / 100;
      var margin    = Number(elMargin.value) / 100;

      // Single track: you pick a weekly volume and pay per delivered
      // appointment. No ad budget to model — we fund the media.
      var perWeek = Number(elAppts.value);
      var apptsPerMonth = Math.round(perWeek * 4.33);
      var feePerAppt = CONFIG.appointmentFee + (confirmedOn ? CONFIG.addOns.confirmed.price : 0);
      var totalCost = apptsPerMonth * feePerAppt;
      var costLabel = 'What you pay us';
      var note = usd(feePerAppt) + ' per delivered appointment' +
                 (confirmedOn ? ', including the confirmed-arrival add-on' : '') +
                 '. No retainer, no setup fee, no ad spend, no contract — you are billed per ' +
                 'appointment that reaches your calendar, and nothing else.';
      if (outAppts) outAppts.textContent = perWeek + '/week';

      var jobs = apptsPerMonth * closeRate;
      var revenue = jobs * avgValue;
      // Gross profit is what actually has to cover our fee. Comparing our cost
      // against gross contract value would flatter the numbers dishonestly.
      var grossProfit = revenue * margin;
      var net = grossProfit - totalCost;
      var roi = totalCost > 0 ? grossProfit / totalCost : 0;

      if (outValue)  outValue.textContent  = usdShort(avgValue);
      if (outClose)  outClose.textContent  = elClose.value + '%';
      if (outMargin) outMargin.textContent = elMargin.value + '%';

      if (resRevenue) resRevenue.textContent = usdShort(revenue);
      if (resAppts)   resAppts.textContent   = apptsPerMonth;
      if (resJobs)    resJobs.textContent    = jobs.toFixed(1);
      if (resProfit)  resProfit.textContent  = usdShort(grossProfit);
      if (resCost)    resCost.textContent    = usdShort(totalCost);
      if (resNet)     resNet.textContent     = (net < 0 ? '–' : '') + usdShort(Math.abs(net));
      if (resRoi)     resRoi.textContent     = roi.toFixed(1) + '×';
      if (resNote)    resNote.textContent    = note;

      var costRow = $('#res-cost-label', calc);
      if (costRow) costRow.textContent = costLabel;

      [elAppts, elValue, elClose, elMargin].forEach(paintSlider);
    };

    addonBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        confirmedOn = btn.dataset.addon === 'confirmed';
        addonBtns.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
        recalc();
      });
    });

    [elAppts, elValue, elClose, elMargin].forEach(function (el) {
      if (el) el.addEventListener('input', recalc);
    });

    recalc();
  }

  /* ----------------------------------------------------------------------
     10. Apply form
         No backend on this site. The form validates, then hands off to the
         user's mail client with everything pre-filled. Swap `submitLead`
         for a real endpoint (Formspree / Firebase / CRM webhook) later.
     ---------------------------------------------------------------------- */
  function initApplyForm() {
    var form = $('#apply-form');
    if (!form) return;

    var status = $('#apply-status');
    var countySel = $('#apply-county', form);

    if (countySel && !countySel.dataset.static) {
      Object.keys(CONFIG.counties).forEach(function (name) {
        var opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        countySel.appendChild(opt);
      });
    }

    // Prefill from ?county=&service= handed over by the hero widget
    var params = new URLSearchParams(location.search);
    ['county', 'service'].forEach(function (key) {
      var val = params.get(key);
      var field = $('#apply-' + key, form);
      if (val && field) field.value = val;
    });

    var setError = function (field, on) {
      var wrap = field.closest('.field');
      if (wrap) wrap.classList.toggle('field--error', on);
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var required = $$('[required]', form);
      var bad = false;
      required.forEach(function (field) {
        var empty = !field.value.trim();
        var badEmail = field.type === 'email' && field.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(field.value);
        setError(field, empty || badEmail);
        if (empty || badEmail) bad = true;
      });

      if (bad) {
        if (status) {
          status.className = 'widget__result is-open is-warn';
          status.textContent = 'Please fill in the highlighted fields so we can route you to the right territory.';
        }
        return;
      }

      var get = function (id) { var el = $('#apply-' + id, form); return el ? el.value.trim() : ''; };

      var lines = [
        'Company: '      + get('company'),
        'Contact name: ' + get('name'),
        'Phone: '        + get('phone'),
        'Email: '        + get('email'),
        'County: '       + get('county'),
        'Service focus: '+ get('service'),
        'Salespeople: '  + get('salespeople'),
        'Target appointments per week: ' + get('volume'),
        'Add-ons of interest: ' + get('addons'),
        '',
        'Notes:',
        get('notes') || '—'
      ];

      var subject = 'Contractor application — ' + (get('company') || get('name'));
      var body = lines.join('\n');

      // Hand off to WhatsApp, not mailto. A mailto: needs a configured mail
      // client, which most phones do not have - the lead just vanished with no
      // error shown. WhatsApp is the channel we actually answer on.
      if (status) {
        status.className = 'widget__result is-open';
        status.innerHTML = '<strong>Opening WhatsApp…</strong> If nothing happens, message us at ' +
          '<a href="' + CONFIG.whatsappUrl + '" target="_blank" rel="noopener">' + CONFIG.whatsappNumber + '</a>, ' +
          'email <a href="mailto:' + CONFIG.email + '">' + CONFIG.email + '</a> or call ' +
          '<a href="' + CONFIG.phoneHref + '">' + CONFIG.phone + '</a>.';
      }

      window.location.href = CONFIG.whatsappUrl.split('?')[0] +
        '?text=' + encodeURIComponent(subject + '\n\n' + body);
    });

    // Clear the error state as soon as the user fixes a field
    $$('[required]', form).forEach(function (field) {
      field.addEventListener('input', function () { setError(field, false); });
    });
  }

  /* ----------------------------------------------------------------------
     10b. Long-form story disclosure
          max-height animates; cleared to 'none' once open so the panel can
          still reflow if the window is resized or a font loads late.
     ---------------------------------------------------------------------- */
  function initStory() {
    var btn = $('#story-toggle');
    var panel = $('#story-panel');
    if (!btn || !panel) return;

    var open = function (yes) {
      btn.setAttribute('aria-expanded', yes ? 'true' : 'false');
      if (yes) {
        panel.style.maxHeight = panel.scrollHeight + 'px';
        var done = function () { panel.style.maxHeight = 'none'; panel.removeEventListener('transitionend', done); };
        panel.addEventListener('transitionend', done);
      } else {
        panel.style.maxHeight = panel.scrollHeight + 'px';  // from 'none' back to a number
        requestAnimationFrame(function () { panel.style.maxHeight = '0px'; });
      }
      btn.lastChild.nodeValue = yes ? ' Hide the story' : ' Read why we built it this way';
    };

    btn.addEventListener('click', function () {
      open(btn.getAttribute('aria-expanded') !== 'true');
    });

    // Deep link: /about.html#story opens it and scrolls there
    if (location.hash === '#story') {
      open(true);
      setTimeout(function () { btn.scrollIntoView({ block: 'start' }); }, 60);
    }
  }

  /* ----------------------------------------------------------------------
     11. Scheduler embed — swaps the placeholder for a real calendar as soon
         as CONFIG.schedulerUrl is filled in.
     ---------------------------------------------------------------------- */
  function initScheduler() {
    var slot = $('#scheduler-embed');
    if (!slot || !CONFIG.schedulerUrl) return;

    slot.classList.add('is-live');
    slot.innerHTML = '';

    var frame = document.createElement('iframe');
    frame.src = CONFIG.schedulerUrl;
    frame.title = 'Book a call with RemodeLeads';
    frame.loading = 'lazy';
    frame.setAttribute('frameborder', '0');
    slot.appendChild(frame);
  }

  /* ----------------------------------------------------------------------
     12. Footer year
     ---------------------------------------------------------------------- */
  function initYear() {
    $$('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */
  function boot() {
    initHeader();
    initReveal();
    initCounters();
    initAccordion();
    initTabs();
    initHeroSlideshow();
    initClientMarquee();
    initTerritoryWidget();
    initCoverageGrid();
    initActivityFeed();
    initCalculator();
    initApplyForm();
    initStory();
    initScheduler();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
