/* Creators page: the pay example slider and the application form's checks.
   No dependencies, no tracking, no network calls. The form still submits without this file
   (the browser's own required-field checks run instead). */
(function () {
  'use strict';

  var money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
  var count = new Intl.NumberFormat('en-US');

  /* ---- Pay example --------------------------------------------------------------------------
     View pay for one video at Bronze, before campaign caps. Canvas/app/PAY-SPEC.md section 4:
     $1.50 per 1,000 counted views after the first 1,000 up to 100K, $1.00 per 1,000 to 1M,
     $0.50 per 1,000 after that, +$50 at 100K and +$250 at 1M. Worked in cents.
     Check values: 10K = $13.50, 100K = $198.50, 1M = $1,348.50. */
  function viewPayCents(views) {
    var k = views / 1000;
    var cents = 0;
    if (k > 1) cents += 150 * (Math.min(k, 100) - 1);
    if (k > 100) cents += 100 * (Math.min(k, 1000) - 100);
    if (k > 1000) cents += 50 * (k - 1000);
    if (views >= 100000) cents += 5000;
    if (views >= 1000000) cents += 25000;
    return Math.round(cents);
  }

  var STOPS = [1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
  var range = document.getElementById('example-views');
  var viewsOut = document.getElementById('example-views-out');
  var payOut = document.getElementById('example-pay-out');

  if (range && viewsOut && payOut) {
    var showExample = function () {
      var i = Math.max(0, Math.min(STOPS.length - 1, parseInt(range.value, 10) || 0));
      var views = STOPS[i];
      var pay = money.format(viewPayCents(views) / 100);
      viewsOut.textContent = count.format(views);
      payOut.textContent = pay;
      range.setAttribute('aria-valuetext', count.format(views) + ' views, ' + pay + ' view pay');
    };
    range.disabled = false;
    range.addEventListener('input', showExample);
    showExample();
  }

  /* ---- Application form ------------------------------------------------------------------ */
  var form = document.querySelector('form[name="creators"]');
  if (!form) return;

  form.noValidate = true; /* our inline messages replace the browser bubbles */

  var tiktok = document.getElementById('f-tiktok');
  var instagram = document.getElementById('f-instagram');
  var handlesError = document.getElementById('f-handles-error');
  var sample = document.getElementById('f-sample');
  var ref = document.getElementById('f-ref');
  var heard = document.getElementById('f-heard');
  var submit = form.querySelector('button[type="submit"]');
  var status = form.querySelector('.form-status');
  var tried = false;

  var MESSAGES = {
    name: 'Enter your name.',
    email: 'Enter your email, like name@example.com.',
    phone: 'Enter a phone number, or leave it blank.',
    niche: 'Choose the niche closest to what you post.',
    phone_type: 'Choose iPhone, Android or Other.',
    sample_video: 'Paste the full link, starting with https://, or leave it blank.',
    city_state: 'Enter your city and state, like Provo, UT.',
    days_per_week: 'Choose how many days a week you can post.',
    heard_from: 'Choose how you heard about us.',
    age_confirmed: 'Check this box to confirm you’re 18 or older. Boomkit is for adults only.'
  };

  /* "@name", "name" or a pasted profile link all become "@name". */
  function cleanHandle(value) {
    var v = value.trim();
    var m = v.match(/(?:tiktok\.com\/@|instagram\.com\/)([A-Za-z0-9._]+)/i);
    if (m) v = m[1];
    v = v.replace(/^@+/, '');
    return v ? '@' + v : '';
  }

  /* "tiktok.com/@name/video/1" becomes "https://tiktok.com/@name/video/1". */
  function cleanUrl(value) {
    var v = value.trim();
    if (v && !/^[a-z][a-z0-9+.-]*:\/\//i.test(v) && /\.[a-z]{2,}/i.test(v)) v = 'https://' + v;
    return v;
  }

  [tiktok, instagram].forEach(function (input) {
    if (!input) return;
    input.addEventListener('change', function () { input.value = cleanHandle(input.value); });
  });
  if (sample) sample.addEventListener('change', function () { sample.value = cleanUrl(sample.value); });

  /* A share link like /creators/?ref=MIA7K2 fills the referral code. */
  try {
    var code = new URLSearchParams(window.location.search).get('ref');
    if (code && ref && /^[A-Za-z0-9]{2,20}$/.test(code)) {
      ref.value = code.toUpperCase();
      if (heard && !heard.value) heard.value = 'A friend';
    }
  } catch (e) { /* old browser: skip the prefill */ }

  function showError(control, errorEl, message) {
    control.setAttribute('aria-invalid', 'true');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
  }

  function clearError(control, errorEl) {
    control.removeAttribute('aria-invalid');
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = '';
    }
  }

  function checkHandles() {
    if (!tiktok || !instagram) return true;
    var ok = true;
    var message = '';
    if (!tiktok.value.trim() && !instagram.value.trim()) {
      ok = false;
      message = 'Add your TikTok or Instagram handle. One is enough.';
    } else if (!tiktok.validity.valid || !instagram.validity.valid) {
      ok = false;
      message = 'Use just the handle, like @yourname: letters, numbers, periods and underscores.';
    }
    [tiktok, instagram].forEach(function (input) {
      if (ok) input.removeAttribute('aria-invalid');
      else if (!input.value.trim() || !input.validity.valid) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    });
    if (ok) {
      handlesError.hidden = true;
      handlesError.textContent = '';
    } else {
      handlesError.textContent = message;
      handlesError.hidden = false;
    }
    return ok;
  }

  /* While someone types, only take away messages they have fixed; new messages wait for change or submit. */
  function clearFixed(control) {
    if (!control || !control.name) return;
    if (control.hasAttribute('data-handle')) {
      if (!handlesError.hidden && checkHandlesQuiet()) checkHandles();
      return;
    }
    if (control.validity.valid) clearError(control, document.getElementById(control.id + '-error'));
  }

  function checkHandlesQuiet() {
    return (tiktok.value.trim() || instagram.value.trim()) && tiktok.validity.valid && instagram.validity.valid;
  }

  /* Returns the first control that failed, or null. */
  function checkAll() {
    var first = null;
    Array.prototype.forEach.call(form.elements, function (control) {
      if (!control.name || control.type === 'hidden' || control.name === 'bot-field' || control.hasAttribute('data-handle')) return;
      if (control.tagName === 'BUTTON' || control.tagName === 'FIELDSET') return;
      var errorEl = document.getElementById(control.id + '-error');
      if (control.validity.valid) {
        clearError(control, errorEl);
      } else {
        showError(control, errorEl, MESSAGES[control.name] || 'Check this answer.');
        if (!first) first = control;
      }
    });
    if (!checkHandles()) {
      var handleFirst = (!tiktok.value.trim() || !tiktok.validity.valid) ? tiktok : instagram;
      /* keep page order: the handles come after phone and before niche */
      if (!first || (handleFirst.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING)) first = handleFirst;
    }
    return first;
  }

  /* After the first try, fix messages as people correct them. */
  form.addEventListener('input', function (event) { if (tried) clearFixed(event.target); });
  form.addEventListener('change', function () { if (tried) checkAll(); });

  form.addEventListener('submit', function (event) {
    if (tiktok) tiktok.value = cleanHandle(tiktok.value);
    if (instagram) instagram.value = cleanHandle(instagram.value);
    if (sample) sample.value = cleanUrl(sample.value);
    tried = true;
    var first = checkAll();
    if (first) {
      event.preventDefault();
      if (status) status.textContent = 'Some answers need a fix. The first one is highlighted.';
      first.focus();
      return;
    }
    /* GitHub Pages can't take a form post: open the visitor's email app with the answers filled in. */
    event.preventDefault();
    var lines = [];
    Array.prototype.forEach.call(form.elements, function (control) {
      if (!control.name || control.name === 'bot-field' || control.tagName === 'BUTTON' || control.tagName === 'FIELDSET') return;
      if (control.type === 'checkbox' && !control.checked) return;
      if (!control.value.trim()) return;
      lines.push(control.name.replace(/_/g, ' ') + ': ' + control.value.trim());
    });
    var bot = form.querySelector('[name="bot-field"]');
    if (bot && bot.value) return;
    window.location.href = 'mailto:zack@topazstudiosllc.com?subject=' + encodeURIComponent('Boomkit creator application') +
      '&body=' + encodeURIComponent(lines.join('\n'));
    if (status) status.textContent = 'Your email app should open with your answers. Press send there to finish.';
  });

  /* Coming back with the Back button restores the page from cache: make the button usable again. */
  window.addEventListener('pageshow', function () {
    form.removeAttribute('data-sending');
    if (submit) {
      submit.removeAttribute('aria-disabled');
      submit.textContent = 'Send application';
    }
    if (status) status.textContent = '';
  });
})();
