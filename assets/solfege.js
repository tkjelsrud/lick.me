(() => {
  const statusEl = document.getElementById('solfege-status');
  const guidesEl = document.getElementById('solfege-guides');
  const transposeDownEl = document.getElementById('transpose-down');
  const transposeUpEl = document.getElementById('transpose-up');
  const transposeValueEl = document.getElementById('transpose-value');

  const ROOT_MIDI = 60;
  const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  let transpose = 0;
  const syllableButtons = [];

  const guides = [
    {
      title: 'Major scale',
      description: 'Classic movable-do major: Do Re Mi Fa Sol La Ti Do.',
      items: [
        { syllable: 'Do', semitones: 0 },
        { syllable: 'Re', semitones: 2 },
        { syllable: 'Mi', semitones: 4 },
        { syllable: 'Fa', semitones: 5 },
        { syllable: 'Sol', semitones: 7 },
        { syllable: 'La', semitones: 9 },
        { syllable: 'Ti', semitones: 11 },
        { syllable: 'Do', semitones: 12 },
      ],
    },
    {
      title: 'Natural minor',
      description: 'Relative minor starting from La: La Ti Do Re Mi Fa Sol La.',
      items: [
        { syllable: 'La', semitones: 9 },
        { syllable: 'Ti', semitones: 11 },
        { syllable: 'Do', semitones: 12 },
        { syllable: 'Re', semitones: 14 },
        { syllable: 'Mi', semitones: 16 },
        { syllable: 'Fa', semitones: 17 },
        { syllable: 'Sol', semitones: 19 },
        { syllable: 'La', semitones: 21 },
      ],
    },
    {
      title: 'Core arpeggios',
      description: 'Useful chord outlines for writing melodies and hearing harmony centers.',
      groups: [
        {
          heading: 'Major triad',
          items: [
            { syllable: 'Do', semitones: 0 },
            { syllable: 'Mi', semitones: 4 },
            { syllable: 'Sol', semitones: 7 },
            { syllable: 'Do', semitones: 12 },
          ],
        },
        {
          heading: 'Minor triad',
          items: [
            { syllable: 'La', semitones: 9 },
            { syllable: 'Do', semitones: 12 },
            { syllable: 'Mi', semitones: 16 },
            { syllable: 'La', semitones: 21 },
          ],
        },
        {
          heading: 'Dominant seventh',
          items: [
            { syllable: 'Sol', semitones: 7 },
            { syllable: 'Ti', semitones: 11 },
            { syllable: 'Re', semitones: 14 },
            { syllable: 'Fa', semitones: 17 },
          ],
        },
      ],
    },
  ];

  const getPitchLabel = (midi) => {
    const note = NOTE_NAMES[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${note}${octave}`;
  };

  const createSyllableButton = ({ syllable, semitones }) => {
    const button = document.createElement('button');
    const label = document.createElement('span');
    const pitchLabel = document.createElement('span');

    button.className = 'syllable-button';
    button.type = 'button';
    label.textContent = syllable;
    pitchLabel.className = 'pitch-label';
    button.append(label, pitchLabel);

    const updatePitch = () => {
      const midi = ROOT_MIDI + semitones + transpose;
      const pitch = getPitchLabel(midi);
      pitchLabel.textContent = pitch;
      button.setAttribute('aria-label', `${syllable}, ${pitch}`);
    };

    updatePitch();

    button.addEventListener('click', async () => {
      const midi = ROOT_MIDI + semitones + transpose;
      const pitch = getPitchLabel(midi);

      try {
        window.LickAudio.stopAll();
        await window.LickAudio.playChord([midi], { duration: 0.55, volume: 0.14 });
        statusEl.textContent = `Played ${syllable} (${pitch}).`;
      } catch (error) {
        statusEl.textContent = 'Playback could not start in this browser.';
        console.error(error);
      }
    });

    syllableButtons.push(updatePitch);
    return button;
  };

  const createItemRow = (items) => {
    const row = document.createElement('div');
    row.className = 'syllable-row';
    items.forEach((item) => row.append(createSyllableButton(item)));
    return row;
  };

  guides.forEach((guide) => {
    const card = document.createElement('section');
    card.className = 'guide-card';

    const title = document.createElement('h2');
    title.textContent = guide.title;
    card.append(title);

    const description = document.createElement('p');
    description.className = 'meta';
    description.textContent = guide.description;
    card.append(description);

    if (guide.items) {
      card.append(createItemRow(guide.items));
    }

    if (guide.groups) {
      guide.groups.forEach((group) => {
        const heading = document.createElement('h3');
        heading.textContent = group.heading;
        heading.style.marginTop = '1rem';
        card.append(heading);
        card.append(createItemRow(group.items));
      });
    }

    guidesEl.append(card);
  });

  const updateTransposeUi = () => {
    if (transposeValueEl) {
      transposeValueEl.textContent = transpose > 0 ? `+${transpose}` : `${transpose}`;
    }

    syllableButtons.forEach((updatePitch) => updatePitch());
  };

  if (transposeDownEl && transposeUpEl) {
    transposeDownEl.addEventListener('click', (event) => {
      event.preventDefault();
      transpose -= 1;
      updateTransposeUi();
      statusEl.textContent = `Transpose set to ${transpose > 0 ? `+${transpose}` : transpose}.`;
    });

    transposeUpEl.addEventListener('click', (event) => {
      event.preventDefault();
      transpose += 1;
      updateTransposeUi();
      statusEl.textContent = `Transpose set to ${transpose > 0 ? `+${transpose}` : transpose}.`;
    });
  }

  updateTransposeUi();
})();
