(() => {
  const banner = document.getElementById('pilotJoinBanner');
  if (!banner || !/^business-ai-pilot(?:-[a-z0-9-]+)?\.vercel\.app$/.test(location.hostname.toLowerCase())) return;
  banner.hidden = false;
  fetch('/api/pilot-capacity', { cache: 'no-store', headers: { Accept: 'application/json' } })
    .then(response => response.ok ? response.json() : null)
    .then(data => {
      if (data?.status !== 'verified' || !Number.isSafeInteger(data.goal) || !Number.isSafeInteger(data.confirmed)
          || data.goal < 1 || data.goal > 999 || data.confirmed < 0 || data.confirmed > data.goal) return;
      const details = document.getElementById('pilotPlacesVerified');
      const text = document.getElementById('pilotPlacesText');
      const track = document.getElementById('pilotPlacesTrack');
      const fill = document.getElementById('pilotPlacesFill');
      if (!details || !text || !track || !fill) return;
      text.textContent = `${data.confirmed} of ${data.goal} confirmed Pilot sign-ups towards our recruitment goal`;
      track.setAttribute('aria-valuemax', String(data.goal));
      track.setAttribute('aria-valuenow', String(data.confirmed));
      fill.style.width = `${Math.round(100 * data.confirmed / data.goal)}%`;
      details.hidden = false;
      const waiting = document.getElementById('pilotPlacesUnverified');
      if (waiting) waiting.hidden = true;
    }).catch(() => {});
})();
