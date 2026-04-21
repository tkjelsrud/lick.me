(() => {
  const dateEl = document.getElementById('date');
  const titleEl = document.getElementById('title');
  const infoEl = document.getElementById('info');
  const tabEl = document.getElementById('tab');
  const errorEl = document.getElementById('error');

  const getLocalDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const hashString = (value) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  };

  const pickDailyLick = (licks, dateKey) => {
    const index = hashString(dateKey) % licks.length;
    return licks[index];
  };

  const showError = (message) => {
    errorEl.textContent = message;
    errorEl.hidden = false;
    tabEl.textContent = '';
  };

  const renderLick = (lick, dateKey) => {
    dateEl.textContent = `Local date: ${dateKey}`;
    titleEl.textContent = lick.title || 'Untitled lick';

    const details = [lick.style, lick.key, lick.tempo ? `${lick.tempo} BPM` : null].filter(Boolean);
    infoEl.textContent = details.join(' • ');

    const lines = Array.isArray(lick.tab) ? lick.tab : [];
    tabEl.textContent = lines.join('\n');
  };

  const loadAndRender = async () => {
    const dateKey = getLocalDateKey();

    try {
      const response = await fetch('data/licks.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to load licks: ${response.status}`);
      }

      const licks = await response.json();
      if (!Array.isArray(licks) || licks.length === 0) {
        throw new Error('No licks found in data/licks.json');
      }

      renderLick(pickDailyLick(licks, dateKey), dateKey);
    } catch (error) {
      titleEl.textContent = 'Unable to load today’s lick';
      infoEl.textContent = '';
      showError('Could not load /data/licks.json. Try running a static server: python3 -m http.server 8000');
      console.error(error);
    }
  };

  loadAndRender();
})();
