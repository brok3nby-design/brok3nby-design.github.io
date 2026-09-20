// Native details supports tap and Enter/Space; mouse users can also preview on hover.
document.querySelectorAll('.progress-report').forEach(report => {
  let timer;
  report.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(timer);
    report.open = true;
  });
  report.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'mouse') return;
    timer = setTimeout(() => {
      if (!report.contains(document.activeElement)) report.open = false;
    }, 180);
  });
  report.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      clearTimeout(timer);
      report.open = false;
      report.querySelector('summary').focus();
    }
  });
});
