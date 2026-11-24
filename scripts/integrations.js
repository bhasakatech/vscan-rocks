/**
 * Third-party integrations, all driven by /config.json.
 * Consent-gated tags load only after the consent manager reports consent,
 * as on the source site; ungated tags load directly.
 */
import { loadScript } from './aem.js';
import { getSiteConfig } from './site-config.js';

const loaded = new Set();

const loaders = {
  adobeLaunch: ({ src }) => {
    if (!src) return;
    loadScript(src, { async: '' });
  },

  googleTagManager: ({ id }) => {
    if (!id) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    loadScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`, { async: '' });
  },

  googleAds: ({ id }) => {
    if (!id) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', id);
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`, { async: '' });
  },

  optimizely: ({ projectId }) => {
    if (!projectId) return;
    loadScript(`https://cdn.optimizely.com/js/${encodeURIComponent(projectId)}.js`, { async: '' });
  },

  metaPixel: ({ id }) => {
    if (!id || window.fbq) return;
    const fbq = function fbqStub(...args) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;
    // eslint-disable-next-line no-underscore-dangle
    window._fbq = window._fbq || fbq;
    window.fbq('init', id);
    window.fbq('track', 'PageView');
    loadScript('https://connect.facebook.net/en_US/fbevents.js', { async: '' });
  },

  nrich: ({ id, cookieless = false }) => {
    if (!id) return;
    const nt = window.nt || function ntStub(...args) {
      (nt.q = nt.q || []).push(args);
    };
    nt.l = Date.now();
    window.nt = nt;
    window.nt('load', id, { cookieless });
    loadScript('https://serve.nrich.ai/tracker/assets/tracker.js?nto=nt', { async: '' });
  },

  sixsense: ({
    token, endpoint, epsilonKey,
  }) => {
    if (!token) return;
    // eslint-disable-next-line no-underscore-dangle
    const si = window._6si || [];
    // eslint-disable-next-line no-underscore-dangle
    window._6si = si;
    si.push(['enableEventTracking', true]);
    si.push(['setToken', token]);
    if (endpoint) si.push(['setEndpoint', endpoint]);
    if (epsilonKey) {
      si.push(['setEpsilonKey', epsilonKey]);
      si.push(['enableCompanyDetails', true, () => {}, 3]);
    }
    loadScript('https://j.6sc.co/6si.min.js', { async: '' });
  },

  ahrefs: ({ key }) => {
    if (!key) return;
    loadScript('https://analytics.ahrefs.com/analytics.js', { 'data-key': key, async: '' });
  },

  // Qualtrics site intercept renders into this zone (its tag is deployed through Adobe Launch).
  qualtrics: ({ zoneId }) => {
    if (!zoneId || document.getElementById(zoneId)) return;
    const zone = document.createElement('div');
    zone.id = zoneId;
    document.body.append(zone);
  },
};

/**
 * Loads the enabled integrations of one group (consent-gated or not), each once.
 * @param {object} integrations config.integrations
 * @param {boolean} gated true for the tags that require consent
 */
function loadIntegrations(integrations, gated) {
  Object.entries(integrations || {}).forEach(([name, settings]) => {
    if (!settings || settings.enabled === false || loaded.has(name)) return;
    if (Boolean(settings.requiresConsent) !== gated) return;
    const loader = loaders[name];
    if (!loader) {
      // eslint-disable-next-line no-console
      console.warn(`config.json: no loader for integration "${name}"`);
      return;
    }
    loaded.add(name);
    try {
      loader(settings);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Integration "${name}" failed to load`, error);
    }
  });
}

/**
 * Starts the Evidon consent notice; consent-gated tags load from its consent callback.
 * @param {object} consent config.consent
 * @param {Function} onConsent called when the visitor has given consent
 */
async function loadEvidon(consent, onConsent) {
  const { id } = consent;
  const parts = window.location.hostname.split('.');
  const rootDomain = consent.rootDomain || (parts.length >= 2 ? parts[parts.length - 2] : '');

  window.evidon = window.evidon || {};
  window.evidon.id = id;
  window.evidon.test = Boolean(consent.test);
  window.evidon.priorConsentCallback = () => onConsent();
  window.evidon.closeCallback = () => {};
  window.evidon.consentWithdrawnCallback = () => {};
  window.evidon.consentDeclinedCallback = () => {
    window.evidon.notice?.dropSuppressionCookie?.(consent.suppressionCookieDays || 365);
  };

  const cdn = 'https://c.evidon.com/';
  const noticeCdn = `${cdn}sitenotice/`;
  await loadScript(`${noticeCdn}evidon-sitenotice-tag.js`, { id: 'evidon-notice' });
  loadScript(`${cdn}geo/country.js`, { id: 'evidon-location', async: '' });
  loadScript(`${noticeCdn}${id}/snthemes.js`, { id: 'evidon-themes', async: '' });
  if (rootDomain) {
    loadScript(`${noticeCdn}${id}/${rootDomain}${consent.test ? '/test' : ''}/settingsV2.js`, { id: 'evidon-settings', async: '' });
  }
}

/**
 * Opens the consent preferences dialog (footer "Cookie Preferences" link).
 * @returns {boolean} true if the dialog could be opened
 */
export function showConsentPreferences() {
  const notice = window.evidon && window.evidon.notice;
  if (notice && typeof notice.showPreferencesDialog === 'function') {
    notice.showPreferencesDialog();
    return true;
  }
  return false;
}

/**
 * Loads all integrations configured in /config.json.
 */
export default async function loadAllIntegrations() {
  const config = await getSiteConfig();
  const { consent = {}, integrations = {} } = config;

  // Adobe Launch rules call _satellite.track before the library has loaded.
  // eslint-disable-next-line no-underscore-dangle
  if (typeof window._satellite === 'undefined') window._satellite = { track() {} };

  loadIntegrations(integrations, false);

  const loadGated = () => loadIntegrations(integrations, true);
  if (consent.enabled && consent.provider === 'evidon' && consent.id) {
    try {
      await loadEvidon(consent, loadGated);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Consent manager failed to load; consent-gated tags stay off', error);
    }
  } else {
    loadGated();
  }
}
