(() => {
  const dateEl = document.getElementById('date');
  const titleEl = document.getElementById('title');
  const infoEl = document.getElementById('info');
  const playbackButtonEl = document.getElementById('playback-button');
  const playbackStatusEl = document.getElementById('playback-status');
  const tabEl = document.getElementById('tab');
  const errorEl = document.getElementById('error');

  const STRING_TO_MIDI = {
    e: 64,
    B: 59,
    G: 55,
    D: 50,
    A: 45,
    E: 40,
  };

  const MIN_NOTE_SECONDS = 0.12;

  let stopPlaybackTimeout = 0;
  let currentPlayback = [];
  let playbackAvailable = false;
  let isPlaying = false;

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
    stopPlayback();
    playbackAvailable = false;
    playbackStatusEl.textContent = 'Playback unavailable.';
    syncPlaybackButton();
  };

  const syncPlaybackButton = () => {
    playbackButtonEl.disabled = !playbackAvailable;
    playbackButtonEl.textContent = isPlaying ? 'Stop' : 'Play';
  };

  const stopPlayback = () => {
    window.clearTimeout(stopPlaybackTimeout);

    window.LickAudio.stopAll();

    isPlaying = false;
    syncPlaybackButton();
  };

  const buildPlayback = (tabLines, tempo = 100) => {
    const parsedNotes = [];

    tabLines.forEach((line) => {
      const stringName = line[0];
      const midiBase = STRING_TO_MIDI[stringName];
      const dividerIndex = line.indexOf('|');

      if (!midiBase || dividerIndex === -1) {
        return;
      }

      const content = line.slice(dividerIndex + 1);
      for (let column = 0; column < content.length; column += 1) {
        if (!/\d/.test(content[column])) {
          continue;
        }

        let cursor = column + 1;
        while (cursor < content.length && /\d/.test(content[cursor])) {
          cursor += 1;
        }

        parsedNotes.push({
          column,
          midi: midiBase + Number(content.slice(column, cursor)),
        });

        column = cursor - 1;
      }
    });

    if (parsedNotes.length === 0) {
      return [];
    }

    const secondsPerColumn = 60 / Math.max(tempo, 40) / 4;
    const notesByColumn = new Map();

    parsedNotes
      .sort((left, right) => left.column - right.column || right.midi - left.midi)
      .forEach((note) => {
        const existing = notesByColumn.get(note.column) || [];
        existing.push(note.midi);
        notesByColumn.set(note.column, existing);
      });

    const columns = [...notesByColumn.keys()].sort((left, right) => left - right);

    return columns.map((column, index) => {
      const nextColumn = columns[index + 1] ?? column + 2;
      const durationSeconds = Math.max((nextColumn - column) * secondsPerColumn * 0.92, MIN_NOTE_SECONDS);

      return {
        time: column * secondsPerColumn,
        duration: durationSeconds,
        midis: notesByColumn.get(column),
      };
    });
  };

  const playCurrentLick = async () => {
    if (!currentPlayback.length) {
      return;
    }

    stopPlayback();

    const context = await window.LickAudio.getAudioContext();
    const startTime = context.currentTime + 0.05;

    currentPlayback.forEach((event) => {
      const voiceLevel = 0.16 / event.midis.length;

      event.midis.forEach((midi) => {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        const noteStart = startTime + event.time;
        const attackEnd = noteStart + 0.01;
        const releaseStart = Math.max(noteStart + event.duration - window.LickAudio.RELEASE_SECONDS, attackEnd + 0.01);
        const stopAt = releaseStart + window.LickAudio.RELEASE_SECONDS;
        const entry = { oscillator, gainNode };

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(window.LickAudio.midiToFrequency(midi), noteStart);

        gainNode.gain.setValueAtTime(0.0001, noteStart);
        gainNode.gain.linearRampToValueAtTime(voiceLevel, attackEnd);
        gainNode.gain.exponentialRampToValueAtTime(Math.max(voiceLevel * 0.55, 0.0001), releaseStart);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start(noteStart);
        oscillator.stop(stopAt);
        window.LickAudio.registerNode(entry);
      });
    });

    isPlaying = true;
    playbackStatusEl.textContent = 'Playing a simple sine-wave preview.';
    syncPlaybackButton();

    const lastEvent = currentPlayback[currentPlayback.length - 1];
    const totalDuration = lastEvent.time + lastEvent.duration + window.LickAudio.RELEASE_SECONDS + 0.1;
    stopPlaybackTimeout = window.setTimeout(() => {
      isPlaying = false;
      playbackStatusEl.textContent = 'Simple sine preview of the tab melody.';
      syncPlaybackButton();
    }, totalDuration * 1000);
  };

  const renderLick = (lick, dateKey) => {
    stopPlayback();
    dateEl.textContent = `Local date: ${dateKey}`;
    titleEl.textContent = lick.title || 'Untitled lick';

    const details = [lick.style, lick.key, lick.tempo ? `${lick.tempo} BPM` : null].filter(Boolean);
    infoEl.textContent = details.join(' • ');

    const lines = Array.isArray(lick.tab) ? lick.tab : [];
    tabEl.textContent = lines.join('\n');

    currentPlayback = buildPlayback(lines, lick.tempo);
    playbackAvailable = currentPlayback.length > 0;
    playbackStatusEl.textContent = playbackAvailable
      ? 'Simple sine preview of the tab melody.'
      : 'Playback unavailable for this lick.';
    syncPlaybackButton();
  };

  const loadAndRender = async () => {
    const dateKey = getLocalDateKey();

    try {
      const response = await fetch('data/licks.json');
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
      showError('Could not load data/licks.json. Try running a static server: python3 -m http.server 8000');
      console.error(error);
    }
  };

  playbackButtonEl.addEventListener('click', async () => {
    if (isPlaying) {
      stopPlayback();
      playbackStatusEl.textContent = playbackAvailable
        ? 'Simple sine preview of the tab melody.'
        : 'Playback unavailable for this lick.';
      return;
    }

    try {
      await playCurrentLick();
    } catch (error) {
      playbackStatusEl.textContent = 'Playback could not start in this browser.';
      playbackAvailable = false;
      syncPlaybackButton();
      console.error(error);
    }
  });

  loadAndRender();
})();
