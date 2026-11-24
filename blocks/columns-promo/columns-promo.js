import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Two-column promo: one media column (picture only) beside a content column.
 * Options: image-right-wide (media sits on the right and takes the wider share).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const firstRow = block.firstElementChild;
  if (!firstRow) return;
  block.classList.add(`columns-promo-${firstRow.children.length}-cols`);

  [...block.children].forEach((row) => {
    row.classList.add('columns-promo-row');
    [...row.children].forEach((col) => {
      const pics = col.querySelectorAll('picture');
      const onlyMedia = pics.length === 1 && col.textContent.trim() === '';
      col.classList.add(onlyMedia ? 'columns-promo-img-col' : 'columns-promo-content-col');
    });
  });

  block.querySelectorAll('.columns-promo-img-col picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '900' }]));
  });
}
