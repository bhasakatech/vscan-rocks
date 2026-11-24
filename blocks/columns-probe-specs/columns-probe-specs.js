const HEADING = /^H[1-6]$/;

/**
 * Probe specification columns. Each column holds a probe label (content before the
 * first heading) followed by headed sections (e.g. "Anatomy", "Assessment"); every
 * heading starts a sub-column.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const firstRow = block.firstElementChild;
  if (!firstRow) return;
  block.classList.add(`columns-probe-specs-${firstRow.children.length}-cols`);

  [...block.children].forEach((row) => {
    row.classList.add('columns-probe-specs-row');
    [...row.children].forEach((col) => {
      col.classList.add('columns-probe-specs-col');
      const nodes = [...col.children];
      if (!nodes.some((n) => HEADING.test(n.tagName))) return;

      const label = document.createElement('div');
      label.className = 'columns-probe-specs-label';
      const subs = document.createElement('div');
      subs.className = 'columns-probe-specs-subcols';

      let current = null;
      nodes.forEach((node) => {
        if (HEADING.test(node.tagName)) {
          current = document.createElement('div');
          current.className = 'columns-probe-specs-subcol';
          subs.append(current);
        }
        (current || label).append(node);
      });

      col.replaceChildren(...(label.children.length ? [label] : []), subs);
    });
  });
}
