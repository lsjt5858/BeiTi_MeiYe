/** Native links remain usable when scripting or dialog support is unavailable. */
export function initializeVisualGalleries(root = document) {
  root.querySelectorAll('[data-gallery]').forEach(gallery => {
    if (gallery.dataset.ready === 'true') return;
    gallery.dataset.ready = 'true';
    const items = [...gallery.querySelectorAll('[data-gallery-item]')];
    const filters = gallery.querySelector('[data-gallery-filters]');
    const count = gallery.querySelector('[data-gallery-count]');
    const dialog = gallery.querySelector('[data-gallery-dialog]');
    const image = gallery.querySelector('[data-gallery-image]');
    const heading = gallery.querySelector('[data-gallery-title]');
    const original = gallery.querySelector('[data-gallery-original]');
    const status = gallery.querySelector('[data-gallery-status]');
    let currentItem;
    let opener;
    let previousOverflow = '';
    if (filters) {
      filters.hidden = false;
      filters.querySelectorAll('[data-gallery-filter]').forEach(button => {
        button.addEventListener('click', () => {
          filters.querySelectorAll('[data-gallery-filter]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
          for (const item of items) item.hidden = button.dataset.galleryFilter !== 'all' && item.dataset.gallerySeries !== button.dataset.galleryFilter;
          count.textContent = `${items.filter(item => !item.hidden).length} ${count.dataset.countLabel}`;
        });
      });
    }
    if (!dialog || typeof dialog.showModal !== 'function') return;
    const setStatus = () => {
      status.textContent = image.complete ? (image.naturalWidth > 0 ? '' : status.dataset.errorLabel) : status.dataset.loadingLabel;
    };
    image.addEventListener('load', setStatus);
    image.addEventListener('error', setStatus);
    function show(item) {
      currentItem = item;
      const link = item.querySelector('[data-gallery-open]');
      const thumbnail = link.querySelector('img');
      heading.textContent = item.querySelector('figcaption span').textContent;
      original.href = link.href;
      image.alt = thumbnail.alt;
      image.src = link.href;
      setStatus();
      if (!dialog.open) {
        previousOverflow = root.body.style.overflow;
        root.body.style.overflow = 'hidden';
        dialog.showModal();
      }
    }
    items.forEach(item => {
      const link = item.querySelector('[data-gallery-open]');
      link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        opener = link;
        show(item);
      });
    });
    const move = direction => {
      const visible = items.filter(item => !item.hidden);
      if (!visible.length) return;
      show(visible[(visible.indexOf(currentItem) + direction + visible.length) % visible.length]);
    };
    gallery.querySelector('[data-gallery-prev]').addEventListener('click', () => move(-1));
    gallery.querySelector('[data-gallery-next]').addEventListener('click', () => move(1));
    gallery.querySelector('[data-gallery-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      root.body.style.overflow = previousOverflow;
      opener?.focus({ preventScroll: true });
    });
  });
}
