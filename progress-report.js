// Reports stay compact in the shelf; clicking opens their full information in a modal.
document.querySelectorAll('.progress-report').forEach(report => {
  const trigger = report.querySelector('.progress-trigger');
  const template = report.querySelector('template');
  if (!trigger || !template) return;

  trigger.addEventListener('click', () => {
    const dialog = document.createElement('dialog');
    dialog.className = 'progress-dialog';
    dialog.setAttribute('aria-label', trigger.getAttribute('aria-label') || 'Progress report');
    dialog.innerHTML = '<button type="button" class="progress-close" aria-label="Close progress report">×</button>' + template.innerHTML;
    const close = () => dialog.close();
    dialog.querySelector('.progress-close').addEventListener('click', close);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) close();
    });
    dialog.addEventListener('close', () => {
      dialog.remove();
      trigger.focus();
    }, { once: true });
    document.body.appendChild(dialog);
    dialog.showModal();
  });
});
