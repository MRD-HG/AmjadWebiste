(function () {
  'use strict';

  const sidebar = document.getElementById('admin-sidebar');
  const menuButton = document.querySelector('.menu-toggle');
  if (sidebar && menuButton) {
    menuButton.addEventListener('click', () => {
      const open = sidebar.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded', String(open));
    });
  }

  document.addEventListener('click', (event) => {
    const confirmation = event.target.closest('[data-confirm]');
    if (confirmation && !window.confirm(confirmation.dataset.confirm || 'هل أنت متأكد؟')) {
      event.preventDefault();
    }

    const languageTab = event.target.closest('[data-language-tab]');
    if (languageTab) {
      const language = languageTab.dataset.languageTab;
      document.querySelectorAll('[data-language-tab]').forEach((tab) => {
        const selected = tab.dataset.languageTab === language;
        tab.classList.toggle('is-selected', selected);
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      document.querySelectorAll('[data-language-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.languagePanel !== language;
      });
    }
  });

  const dropzone = document.querySelector('[data-upload-dropzone]');
  const fileInput = document.querySelector('[data-upload-input]');
  const preview = document.querySelector('[data-upload-preview]');
  if (dropzone && fileInput) {
    const update = () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      dropzone.querySelector('[data-upload-name]').textContent = file.name;
      if (preview && file.type.startsWith('image/')) {
        preview.src = URL.createObjectURL(file);
        preview.hidden = false;
      }
    };
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        fileInput.click();
      }
    });
    ['dragenter', 'dragover'].forEach((type) => dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.add('is-dragging');
    }));
    ['dragleave', 'drop'].forEach((type) => dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.remove('is-dragging');
    }));
    dropzone.addEventListener('drop', (event) => {
      if (!event.dataTransfer.files.length) return;
      const transfer = new DataTransfer();
      transfer.items.add(event.dataTransfer.files[0]);
      fileInput.files = transfer.files;
      update();
    });
    fileInput.addEventListener('change', update);
  }
})();
