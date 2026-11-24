/**
 * Site configuration (third-party integrations, consent, forms) from /config.json.
 */

let configPromise;

/**
 * Fetches /config.json once and caches the result.
 * @returns {Promise<object>} the site config, or an empty object if it can't be loaded
 */
export function getSiteConfig() {
  if (!configPromise) {
    const base = (window.hlx && window.hlx.codeBasePath) || '';
    configPromise = fetch(`${base}/config.json`)
      .then((resp) => (resp.ok ? resp.json() : {}))
      .catch(() => ({}));
  }
  return configPromise;
}

/**
 * Returns the page path without the /content prefix the local preview adds.
 * @param {string} [pathname] defaults to the current page path
 * @returns {string}
 */
export function getPagePath(pathname = window.location.pathname) {
  const path = pathname.replace(/^\/content(?=\/)/, '').replace(/\.html$/, '').replace(/\/$/, '');
  return path || '/';
}

/**
 * Returns the page locale from its first path segment (e.g. /de/...), else the default.
 * @param {object} config the site config
 * @param {string} [pathname] defaults to the current page path
 * @returns {string}
 */
export function getLocale(config, pathname) {
  const { default: fallback = 'en', prefixed = [] } = (config && config.locales) || {};
  const [first] = getPagePath(pathname).split('/').filter(Boolean);
  return prefixed.includes(first) ? first : fallback;
}
