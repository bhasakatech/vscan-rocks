import { createOptimizedPicture } from '../../scripts/aem.js';

// store badges by link host; the AEM content source can deliver these links without their image
const STORE_BADGES = [
  { host: 'apps.apple.com', icon: 'app-store', alt: 'Download on the App Store' },
  { host: 'play.google.com', icon: 'google-play', alt: 'Get it on Google Play' },
];

function restoreStoreBadges(block) {
  block.querySelectorAll('a[href]').forEach((link) => {
    if (link.textContent.trim() || link.querySelector('img')) return;
    const badge = STORE_BADGES.find(({ host }) => link.hostname === host);
    if (!badge) return;
    const picture = document.createElement('picture');
    const img = document.createElement('img');
    img.src = `${window.hlx.codeBasePath}/icons/${badge.icon}.svg`;
    img.alt = badge.alt;
    img.loading = 'lazy';
    picture.append(img);
    link.append(picture);
  });
}

/**
 * Two-column promo: one media column (picture only) beside a content column.
 * Options: image-right-wide (media sits on the right and takes the wider share).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const firstRow = block.firstElementChild;
  if (!firstRow) return;
  block.classList.add(`columns-promo-${firstRow.children.length}-cols`);
  restoreStoreBadges(block);

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
