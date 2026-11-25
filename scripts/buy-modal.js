/**
 * "Buy now" dialogs, matched to the source site's #countryModal and #buyModal.
 * Opened by links to #countryModal or #buyModal (see scripts.js).
 * - No saved country: a country picker. Picking a country saves it (cookies `country`
 *   and `cartlang`, as on the source) and opens that country's pricing.
 * - Saved country with an online shop: its pricing (products, prices, shop links).
 * - Saved country without a shop: the Marketo contact form, as on the source.
 * Countries and pricing come from /pricing.json.
 */
import { loadCSS } from './aem.js';
import { getSiteConfig, getLocale } from './site-config.js';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const base = () => (window.hlx && window.hlx.codeBasePath) || '';

let dataPromise;
function getPricingData() {
  if (!dataPromise) {
    dataPromise = fetch(`${base()}/pricing.json`)
      .then((resp) => (resp.ok ? resp.json() : null))
      .catch(() => null);
  }
  return dataPromise;
}

function getCookie(name) {
  const entry = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : '';
}

function saveCountry(country) {
  const opts = `max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
  document.cookie = `country=${encodeURIComponent(country.country)}; ${opts}`;
  document.cookie = `cartlang=${encodeURIComponent(country.lang)}; ${opts}`;
}

function savedCountry(data) {
  const country = getCookie('country');
  const lang = getCookie('cartlang');
  return country && data.countries.find((c) => c.country === country && c.lang === lang);
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== false) node.setAttribute(key, value);
  });
  node.append(...children.filter((c) => c !== undefined && c !== null));
  return node;
}

function flagImg(country) {
  return el('img', {
    src: `${base()}${country.flag}`, alt: '', width: 18, height: 18, loading: 'lazy',
  });
}

let dialogCount = 0;
function buildDialog(variant, title, closeLabel) {
  dialogCount += 1;
  const titleId = `buy-modal-title-${dialogCount}`;
  const dialog = el('dialog', { class: `buy-modal buy-modal-${variant}`, 'aria-labelledby': titleId });
  const header = el('div', { class: 'buy-modal-header' }, el('h2', { class: 'buy-modal-title', id: titleId }, title));
  if (closeLabel) {
    const close = el('button', { type: 'button', class: 'buy-modal-close', 'aria-label': closeLabel });
    close.addEventListener('click', () => dialog.close());
    header.append(close);
  }
  dialog.append(header);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  return dialog;
}

function openContactForm(attrs = {}) {
  const link = el('a', { href: '#marketoModal' });
  Object.entries(attrs).forEach(([key, value]) => { if (value) link.dataset[key] = value; });
  import('./marketo.js').then(({ default: openMarketoForm }) => openMarketoForm(link));
}

function renderProduct(product) {
  const actions = el('div', { class: 'buy-modal-product-actions' });
  if (product.buy?.contact) {
    actions.append(el('a', {
      href: '#marketoModal', class: 'button', 'data-mktoid': product.buy.mktoid, 'data-mktotitle': product.buy.mktotitle,
    }, product.buy.label));
  } else if (product.buy?.href) {
    actions.append(el('a', {
      href: product.buy.href, class: 'button', target: '_blank', rel: 'noopener',
    }, product.buy.label));
  }
  if (product.explore) {
    actions.append(el('a', { href: product.explore.href, class: 'buy-modal-explore' }, product.explore.label));
  }
  return el(
    'li',
    { class: 'buy-modal-product' },
    el('div', { class: 'buy-modal-product-image' }, el('img', {
      src: `${base()}${product.image}`, alt: product.alt, loading: 'lazy',
    })),
    el(
      'div',
      { class: 'buy-modal-product-body' },
      el('h3', { class: 'buy-modal-product-name' }, product.name),
      product.price ? el('p', { class: 'buy-modal-product-price' }, product.price) : null,
      ...(product.notes || []).map((note) => el('p', { class: 'buy-modal-product-note' }, note)),
      actions,
    ),
  );
}

async function showPricing(data, country) {
  const pricing = data.pricing[country.id];
  if (!pricing) {
    openContactForm();
    return;
  }
  const config = await getSiteConfig();
  const messages = config.marketo?.messages || {};
  const closeLabel = messages[country.locale]?.close || messages.en?.close || 'Close';
  const dialog = buildDialog('pricing', pricing.title, closeLabel);
  dialog.lang = country.locale;

  const body = el('div', { class: 'buy-modal-body' });
  pricing.groups.forEach((group, i) => {
    if (group.heading) body.append(el('h3', { class: 'buy-modal-group-heading' }, group.heading));
    body.append(el(
      'ul',
      { class: `buy-modal-products${i === 0 ? ' buy-modal-products-featured' : ''}` },
      ...group.products.map(renderProduct),
    ));
  });

  const change = el('button', { type: 'button', class: 'buy-modal-change' }, pricing.changeCountry);
  change.addEventListener('click', () => {
    dialog.close();
    // eslint-disable-next-line no-use-before-define
    showCountryPicker(data, getLocale(config));
  });
  const footer = el(
    'div',
    { class: 'buy-modal-footer' },
    el('p', { class: 'buy-modal-current' }, flagImg(country), pricing.countryLabel),
    change,
  );

  // the contact form opens on top of the page, so close pricing first
  body.addEventListener('click', (e) => {
    if (e.target.closest('a[href="#marketoModal"]')) dialog.close();
  });

  dialog.append(body, footer);
  dialog.showModal();
}

function showCountryPicker(data, locale) {
  const title = data.countryTitle[locale] || data.countryTitle.en;
  const dialog = buildDialog('picker', title);
  const columns = [];
  data.countries.forEach((country) => {
    columns[country.column] = columns[country.column] || el('ul', { class: 'buy-modal-country-list' });
    const button = el(
      'button',
      { type: 'button', class: 'buy-modal-country', lang: country.locale },
      flagImg(country),
      country.label,
      ' ',
      el('span', { class: 'buy-modal-country-lang' }, `(${country.langLabel})`),
    );
    button.addEventListener('click', () => {
      saveCountry(country);
      dialog.close();
      showPricing(data, country);
    });
    columns[country.column].append(el('li', {}, button));
  });
  dialog.append(el('div', { class: 'buy-modal-body' }, el('div', { class: 'buy-modal-countries' }, ...columns.filter(Boolean))));
  dialog.showModal();
}

/**
 * Opens the Buy now flow for a #countryModal / #buyModal link.
 */
export default async function openBuyModal() {
  const [data, config] = await Promise.all([
    getPricingData(),
    getSiteConfig(),
    loadCSS(`${base()}/styles/buy-modal.css`),
  ]);
  if (!data) return;
  const country = savedCountry(data);
  if (country) showPricing(data, country);
  else showCountryPicker(data, getLocale(config));
}
