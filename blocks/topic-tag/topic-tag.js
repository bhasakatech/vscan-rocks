/**
 * Topic tag: one or more pill labels marking the topic of a page.
 * Rows: [text] — each paragraph (or comma-separated value) becomes a tag;
 * a linked tag keeps its link.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'topic-tag-list';

  const addTag = (content) => {
    const li = document.createElement('li');
    li.className = 'topic-tag-item';
    li.append(content);
    list.append(li);
  };

  block.querySelectorAll(':scope > div > div').forEach((cell) => {
    const paragraphs = cell.querySelectorAll('p');
    const sources = paragraphs.length ? [...paragraphs] : [cell];
    sources.forEach((source) => {
      const link = source.querySelector('a[href]');
      if (link) {
        link.classList.remove('button');
        link.parentElement?.classList.remove('button-container');
        addTag(link);
        return;
      }
      source.textContent.split(',').map((t) => t.trim()).filter(Boolean)
        .forEach((t) => addTag(document.createTextNode(t)));
    });
  });

  block.replaceChildren(list);
}
