import { loadCSS } from '../../scripts/aem.js';

/**
 * The AEM content source delivers the columns-promo and columns-probe-specs variants as a
 * plain `columns` block (their Universal Editor models share the columns resource type).
 * Tell them apart by shape:
 * - columns-promo: a column holding only a picture next to a text column
 * - columns-probe-specs: text-only columns split by sub-headings, no pictures
 * @param {Element} block The block element
 * @returns {string|undefined} the variant block name
 */
function detectVariant(block) {
  const cols = [...block.querySelectorAll(':scope > div > div')];
  if (!cols.length) return undefined;
  const pictureOnly = (col) => !!col.querySelector('picture') && col.textContent.trim() === '';
  if (cols.some(pictureOnly) && cols.some((col) => !pictureOnly(col))) return 'columns-promo';
  if (!block.querySelector('picture') && cols.every((col) => col.querySelector('h3, h4, h5, h6'))) {
    return 'columns-probe-specs';
  }
  return undefined;
}

export default async function decorate(block) {
  const variant = detectVariant(block);
  if (variant) {
    const base = `${window.hlx.codeBasePath}/blocks/${variant}/${variant}`;
    const [mod] = await Promise.all([import(`${base}.js`), loadCSS(`${base}.css`)]);
    block.classList.replace('columns', variant);
    block.dataset.blockName = variant;
    const wrapper = block.parentElement;
    if (wrapper?.classList.contains('columns-wrapper')) wrapper.classList.add(`${variant}-wrapper`);
    const section = block.closest('.section');
    if (section?.classList.contains('columns-container')) section.classList.add(`${variant}-container`);
    await mod.default(block);
    return;
  }

  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });
}
