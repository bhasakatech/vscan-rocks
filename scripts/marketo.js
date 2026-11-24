/**
 * Marketo forms in a dialog, configured in /config.json (marketo).
 * Opened by links to #marketoModal: "Contact us" uses the page's or the locale's
 * contact form, links inside a gated-video block use the locale's gated-content form.
 */
import { loadScript } from './aem.js';
import { getSiteConfig, getLocale, getPagePath } from './site-config.js';

let formsLibrary;

function loadFormsLibrary(baseUrl) {
  if (!formsLibrary) {
    const origin = baseUrl.startsWith('//') ? `https:${baseUrl}` : baseUrl;
    formsLibrary = loadScript(`${origin}/js/forms2/js/forms2.min.js`)
      .catch((error) => {
        formsLibrary = undefined;
        throw error;
      });
  }
  return formsLibrary;
}

/**
 * Picks the Marketo form for a link.
 * @param {object} marketo config.marketo
 * @param {Element} link the clicked link
 * @param {string} locale page locale
 * @returns {number|undefined}
 */
export function resolveFormId(marketo, link, locale) {
  if (link.dataset.mktoid) return Number(link.dataset.mktoid);
  const { contactForms = {}, gatedForms = {}, pageForms = {} } = marketo;
  if (link.closest('.gated-video')) return gatedForms[locale] || gatedForms.en;
  return pageForms[getPagePath()] || contactForms[locale] || contactForms.en;
}

function buildDialog(messages) {
  const dialog = document.createElement('dialog');
  dialog.className = 'marketo-modal';
  dialog.innerHTML = `
    <div class="marketo-modal-header">
      <h2 class="marketo-modal-title"></h2>
      <button type="button" class="marketo-modal-close" aria-label="${messages.close}"></button>
    </div>
    <div class="marketo-modal-body">
      <p class="marketo-modal-status" role="status"></p>
      <form></form>
    </div>`;
  dialog.querySelector('.marketo-modal-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  return dialog;
}

/**
 * Opens the Marketo form for a #marketoModal link.
 * @param {Element} link the clicked link
 */
export default async function openMarketoForm(link) {
  const config = await getSiteConfig();
  const { marketo } = config;
  if (!marketo || marketo.enabled === false || !marketo.baseUrl || !marketo.munchkinId) return;

  const locale = getLocale(config);
  const messages = { ...(marketo.messages?.en || {}), ...(marketo.messages?.[locale] || {}) };
  const formId = resolveFormId(marketo, link, locale);
  if (!formId) return;

  const dialog = buildDialog(messages);
  const title = link.dataset.mktotitle || link.textContent.trim();
  dialog.querySelector('.marketo-modal-title').textContent = title;
  dialog.setAttribute('aria-label', title);
  const status = dialog.querySelector('.marketo-modal-status');
  const formEl = dialog.querySelector('form');
  formEl.id = `mktoForm_${formId}`;
  status.textContent = messages.loading || '';
  dialog.showModal();

  try {
    await loadFormsLibrary(marketo.baseUrl);
    window.MktoForms2.loadForm(marketo.baseUrl, marketo.munchkinId, formId, (form) => {
      status.textContent = '';
      form.onSuccess(() => {
        formEl.hidden = true;
        status.textContent = messages.thankYou || '';
        return false;
      });
    });
  } catch (error) {
    status.textContent = '';
    // eslint-disable-next-line no-console
    console.error('Marketo form failed to load', error);
  }
}
