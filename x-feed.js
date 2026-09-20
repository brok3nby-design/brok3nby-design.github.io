(() => {
  'use strict';
  const feed = document.getElementById('x-feed');
  if (!feed) return;
  const profile = 'https://x.com/brok3nbydesign';
  const fallback = reason => {
    feed.innerHTML = '<p class="x-feed-fallback">'+reason+' <a href="'+profile+'" target="_blank" rel="noopener">Open @brok3nbydesign on X →</a></p>';
  };
  const render = () => {
    if (!window.twttr?.widgets?.createTimeline) return false;
    feed.innerHTML = '';
    window.twttr.widgets.createTimeline(
      {sourceType:'profile', screenName:'brok3nbydesign'}, feed,
      {theme:'dark', tweetLimit:3, chrome:'noheader nofooter noborders transparent', dnt:true}
    ).then(widget => {
      if (!widget) fallback('X could not load the timeline in this browser.');
    }).catch(() => fallback('X could not load the timeline in this browser.'));
    return true;
  };
  if (render()) return;
  const script = document.createElement('script');
  script.src = 'https://platform.twitter.com/widgets.js';
  script.async = true;
  script.charset = 'utf-8';
  script.onload = () => { if (!render()) fallback('X could not load the timeline in this browser.'); };
  script.onerror = () => fallback('X is blocked by this browser or network.');
  document.head.append(script);
  window.setTimeout(() => {
    if (!feed.querySelector('iframe')) fallback('X is taking too long to load here.');
  }, 7000);
})();
