/*
 * Accordion FAQ Block
 * Expandable question rows. Each row: [question] [answer].
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  [...block.children].forEach((row) => {
    const [label, body] = row.children;
    if (!label) return;

    const summary = document.createElement('summary');
    summary.className = 'accordion-faq-item-label';
    summary.append(...label.childNodes);

    const details = document.createElement('details');
    moveInstrumentation(row, details);
    details.className = 'accordion-faq-item';
    details.append(summary);

    if (body) {
      body.className = 'accordion-faq-item-body';
      details.append(body);
    }
    row.replaceWith(details);
  });
}
