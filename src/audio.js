(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FSAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  // Original procedural score: quiet drones and sparse pentatonic plucks.
  // No recording, external audio, game RNG or gameplay state is used.
  const KEY = 'feisheng.audio.v1';
  const BANDS = Object.freeze({
    mortal: { name: '山野', base: 73.416, chord: [1, 1.5, 2], notes: [0, 3, 7, 10, 7, 5, 3, 0], beat: 4.8 },
    cloud: { name: '云上', base: 87.307, chord: [1, 1.5, 2.5], notes: [0, 5, 7, 12, 10, 7, 5, 3], beat: 4.2 },
    void: { name: '界外', base: 55, chord: [1, 2, 3], notes: [0, 7, 12, 15, 19, 12, 7, 3], beat: 5.6 },
    tribulation: { name: '天门', base: 65.406, chord: [1, 1.498, 2.004], notes: [0, 3, 7, 12, 7, 3, 0, -5], beat: 5.2 }
  });
  const CUES = Object.freeze({
    talent: [392, 523.25], breakthrough: [293.66, 440, 587.33], devour: [138.59, 73.416, 55],
    mutation: [196, 246.94, 329.63], fusion: [261.63, 392, 523.25, 783.99], demon: [92.5, 93.2, 138.59],
    thunder: [49, 65.4], ascension: [293.66, 440, 587.33, 880], trace: [220, 329.63, 440]
  });
  function bandFor(s, home = false) {
    if (home || !s) return 'mortal';
    if (s.immortal) return s.immortal.phase === 'prologue-complete' || s.immortal.phase === 'ending' ? 'tribulation' : 'void';
    return s.realm >= 9 ? 'tribulation' : s.realm >= 6 ? 'void' : s.realm >= 3 ? 'cloud' : 'mortal';
  }
  function cueFor(before, after, action) {
    if (action?.type === 'equipment-evolve') return 'fusion';
    if (!action) return null;
    if (after?.immortal?.wormSlain && !before?.immortal?.wormSlain || after?.immortal?.phase === 'ending' && before?.immortal?.phase !== 'ending') return 'ascension';
    if (action.type === 'immortal-evolution-fuse') return 'fusion';
    if (action.type === 'immortal-evolution-choose' || action.type === 'immortal-evolution-upgrade') return 'mutation';
    if (after?.flags?.ascended && !before?.flags?.ascended) return 'ascension';
    if (action.type === 'confirm-talents' || action.type === 'pick') return 'talent';
    if (action.type === 'breakthrough') return 'breakthrough';
    if (action.type === 'mutate') return 'mutation';
    if (action.type === 'pick-fusion') return 'fusion';
    if (action.type === 'challenge-boss') return 'demon';
    if (action.type === 'tribulation-step') return 'thunder';
    if (action.type === 'carry-trace') return 'trace';
    if ((after?.devours || 0) > (before?.devours || 0)) return 'devour';
    if ((after?.immortal?.devours || 0) > (before?.immortal?.devours || 0)) return 'devour';
    if (action.type === 'immortal-law') return 'fusion';
    return null;
  }
  function normalize(value) {
    const v = value && typeof value === 'object' ? value : {};
    return { music: typeof v.music === 'boolean' ? v.music : true,
      effects: typeof v.effects === 'boolean' ? v.effects : true,
      volume: Number.isFinite(v.volume) ? Math.max(0, Math.min(.8, v.volume)) : .28 };
  }
  function create() {
    let settings = normalize(), context = null, master, musicBus, fxBus, analyser;
    let unlocked = false, focused = true, band = 'mortal', ambientBand = null, pads = [], timer = null, note = 0, warning = '';
    const voices = new Set(), cueCounts = {}, doc = root.document;
    const AudioContext = root.AudioContext || root.webkitAudioContext;
    try { settings = normalize(JSON.parse(root.localStorage?.getItem(KEY) || 'null')); } catch { warning = '音量设置未能读取，使用默认低音量。'; }
    const active = () => unlocked && focused && !doc?.hidden && settings.volume > 0 && (settings.music || settings.effects);
    function stopVoice(voice) {
      try { voice.source.stop(); } catch { /* A source may already have ended. */ }
      voice.source.disconnect(); voice.gain.disconnect(); voice.filter?.disconnect(); voices.delete(voice);
    }
    function tone(frequency, delay = 0, duration = 1.4, amplitude = .1, type = 'sine', bus = fxBus) {
      if (!context || voices.size >= 24) return;
      const source = context.createOscillator(), gain = context.createGain(), now = context.currentTime + delay;
      source.type = type; source.frequency.value = frequency;
      gain.gain.setValueAtTime(.0001, now); gain.gain.linearRampToValueAtTime(amplitude, now + .035);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      source.connect(gain); gain.connect(bus);
      const voice = { source, gain }; voices.add(voice);
      source.onended = () => { source.disconnect(); gain.disconnect(); voices.delete(voice); };
      source.start(now); source.stop(now + duration + .04);
    }
    function clearPads() {
      for (const pad of pads) {
        const at = context.currentTime;
        pad.gain.gain.cancelScheduledValues(at); pad.gain.gain.setTargetAtTime(.0001, at, .25);
        pad.source.stop(at + 1.5);
      }
      pads = []; ambientBand = null;
    }
    function ambient() {
      if (!context || !settings.music || !active()) return;
      if (ambientBand === band) return;
      clearPads(); ambientBand = band; note = 0;
      for (const ratio of BANDS[band].chord) {
        const source = context.createOscillator(), gain = context.createGain();
        source.type = 'sine'; source.frequency.value = BANDS[band].base * ratio;
        gain.gain.setValueAtTime(.0001, context.currentTime); gain.gain.setTargetAtTime(.035 / ratio, context.currentTime, 1.7);
        source.connect(gain); gain.connect(musicBus); source.start();
        const pad = { source, gain }; pads.push(pad);
        source.onended = () => { source.disconnect(); gain.disconnect(); };
      }
    }
    function melody() {
      if (timer) root.clearTimeout(timer);
      timer = null;
      if (!active() || !settings.music || context?.state !== 'running') return;
      const b = BANDS[band], semitones = b.notes[note++ % b.notes.length];
      tone(b.base * 4 * Math.pow(2, semitones / 12), 0, 2.6, .075, 'sine', musicBus);
      timer = root.setTimeout(melody, b.beat * 1000);
    }
    async function sync() {
      if (!context || !master || !musicBus || !fxBus) return;
      const now = context.currentTime;
      master.gain.setTargetAtTime(settings.volume, now, .08);
      musicBus.gain.setTargetAtTime(settings.music ? 1 : 0, now, .15);
      fxBus.gain.setTargetAtTime(settings.effects ? 1 : 0, now, .04);
      if (!settings.music) { if (timer) root.clearTimeout(timer); timer = null; if (pads.length) clearPads(); }
      try {
        if (active()) {
          if (context.state !== 'running') await context.resume();
          if (active()) { ambient(); if (!timer) melody(); }
          else await context.suspend();
        } else {
          if (timer) root.clearTimeout(timer); timer = null;
          for (const voice of [...voices]) stopVoice(voice);
          if (context.state === 'running') await context.suspend();
        }
      } catch { warning = '浏览器暂未允许播放，重新点按页面即可重试。'; }
    }
    function unlock(event) {
      if (!event?.isTrusted || (event.type === 'keydown' && !['Enter', ' '].includes(event.key))) return;
      unlocked = true; focused = true;
      if (!AudioContext) return;
      if (!context) {
        try {
          context = new AudioContext(); master = context.createGain(); musicBus = context.createGain(); fxBus = context.createGain();
          const compressor = context.createDynamicsCompressor(); compressor.threshold.value = -14; compressor.ratio.value = 4;
          analyser = context.createAnalyser(); analyser.fftSize = 512;
          master.gain.value = settings.volume; musicBus.gain.value = settings.music ? 1 : 0; fxBus.gain.value = settings.effects ? 1 : 0;
          musicBus.connect(master); fxBus.connect(master); master.connect(compressor); compressor.connect(analyser); analyser.connect(context.destination);
        } catch { warning = '当前浏览器无法使用声音，文字游戏仍可继续。'; return; }
      }
      void sync();
    }
    function update(value) {
      settings = normalize({ ...settings, ...value });
      try { root.localStorage?.setItem(KEY, JSON.stringify(settings)); warning = ''; } catch { warning = '音量设置只在本次打开期间生效。'; }
      void sync(); return { ...settings };
    }
    function scene(s, home) {
      const next = bandFor(s, home);
      if (next === band) return;
      band = next;
      if (timer) root.clearTimeout(timer); timer = null;
      void sync();
    }
    function cue(id) {
      if (!CUES[id] || !context || context.state !== 'running' || !active() || !settings.effects || voices.size > 20) return false;
      cueCounts[id] = (cueCounts[id] || 0) + 1;
      const long = id === 'ascension';
      CUES[id].forEach((f, index) => tone(f, index * (long ? .24 : .10), long ? 2.8 : id === 'demon' ? 1.6 : .9, long ? .12 : .085, id === 'devour' ? 'triangle' : 'sine'));
      // A short upper transient makes rare/major events read clearly on phone
      // speakers without adding a recorded audio asset or another RNG stream.
      if (['breakthrough', 'fusion', 'mutation', 'ascension'].includes(id)) {
        const top = CUES[id][CUES[id].length - 1];
        tone(top * 2, id === 'ascension' ? .58 : .22, id === 'ascension' ? 1.9 : .55, id === 'ascension' ? .055 : .04, 'triangle');
      }
      if (id === 'thunder') {
        const buffer = context.createBuffer(1, Math.floor(context.sampleRate * .8), context.sampleRate), data = buffer.getChannelData(0);
        let x = 9631;
        for (let i = 0; i < data.length; i++) { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; data[i] = (x / 2147483648 - 1) * Math.pow(1 - i / data.length, 3); }
        const source = context.createBufferSource(), gain = context.createGain(), filter = context.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 460; source.buffer = buffer; gain.gain.value = .13;
        source.connect(filter); filter.connect(gain); gain.connect(fxBus);
        const voice = { source, gain, filter }; voices.add(voice);
        source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); voices.delete(voice); }; source.start();
      }
      return true;
    }
    function diagnostics() {
      let rms = 0;
      if (analyser && context.state === 'running') { const data = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(data); rms = Math.sqrt(data.reduce((sum, x) => sum + x * x, 0) / data.length); }
      return { supported: !!AudioContext, unlocked, state: context?.state || 'locked', band, ambientBand, settings: { ...settings }, pads: pads.length, voices: voices.size, rms, cueCounts: { ...cueCounts }, warning };
    }
    const blur = () => { focused = false; void sync(); };
    const focus = () => { focused = true; void sync(); };
    doc?.addEventListener('pointerdown', unlock, { passive: true }); doc?.addEventListener('keydown', unlock);
    doc?.addEventListener('visibilitychange', () => { void sync(); });
    root.addEventListener?.('blur', blur); root.addEventListener?.('focus', focus);
    root.addEventListener?.('pagehide', blur); root.addEventListener?.('pageshow', focus);
    return Object.freeze({ update, scene, cue, diagnostics, settings: () => ({ ...settings }) });
  }
  return Object.freeze({ create, normalize, bandFor, cueFor, BANDS, CUES });
});
