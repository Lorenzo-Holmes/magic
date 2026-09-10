(function (root) {
  'use strict';
  // This is a synchronous, replace-on-render registry, not a Unity/Lua loader.
  // The gameplay reducer and both save keys remain owned by app.js.
  const windows = new Map();
  const localState = { bagFilter: 'all', forgeRecipe: 'qi', forgeKind: 'pill' };
  const filters = new Set(['all', 'equipment', 'pills', 'materials', 'supplies']);
  let active = null, hudRenderer = null, renders = 0, releases = 0;

  function register(id, impl) {
    if (typeof id !== 'string' || !id || !impl || typeof impl.render !== 'function') {
      throw new Error('Invalid V3 window registration');
    }
    if (windows.has(id)) throw new Error(`Duplicate V3 window: ${id}`);
    windows.set(id, Object.freeze({ ...impl, id }));
  }

  function synchronous(value, phase) {
    if (value && typeof value.then === 'function') {
      throw new Error(`V3 ${phase} must be synchronous; async assets need a separate loader`);
    }
    return value;
  }

  function deactivate() {
    const previous = active;
    active = null;
    if (!previous) return;
    releases++;
    // Clear the record first, so a failing cleanup cannot run twice on retry.
    const errors = [];
    for (const release of [previous.cleanup, () => previous.impl.dispose?.(previous.context)]) {
      try { if (release) synchronous(release(), 'dispose'); }
      catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, `V3 ${previous.id} cleanup failed`);
  }

  function render(id, context) {
    const impl = windows.get(id);
    if (!impl) throw new Error(`Unknown V3 window: ${id}`);
    // app.js replaces the DOM even when the window id has not changed.
    deactivate();
    synchronous(impl.prepareAssets?.(context), 'prepareAssets');
    const html = synchronous(impl.render(context), 'render');
    if (typeof html !== 'string') throw new Error(`V3 ${id} must render HTML text`);
    active = { id, impl, context, rootNode: null, cleanup: null };
    renders++;
    return html;
  }

  function commit(rootNode, context = {}) {
    if (!active) return;
    if (!rootNode) throw new Error('V3 commit requires a mounted root');
    const record = active;
    record.context = { ...record.context, ...context };
    if (record.rootNode && record.rootNode !== rootNode) {
      throw new Error('V3 root changed without render/deactivate');
    }
    try {
      if (!record.rootNode) {
        const cleanup = synchronous(record.impl.bind?.(rootNode, record.context), 'bind');
        if (cleanup != null && typeof cleanup !== 'function') {
          throw new Error('V3 bind must return a cleanup function or nothing');
        }
        record.cleanup = cleanup || null;
        record.rootNode = rootNode;
      }
      synchronous(record.impl.update?.(rootNode, record.context), 'update');
    } catch (error) {
      try { deactivate(); }
      catch (cleanupError) { throw new AggregateError([error, cleanupError], 'V3 commit and cleanup failed'); }
      throw error;
    }
  }

  function getState(key) { return localState[key]; }
  function setState(key, value) {
    const valid = key === 'bagFilter' ? filters.has(value)
      : key === 'forgeKind' ? ['pill', 'weapon'].includes(value)
      : key === 'forgeRecipe' ? typeof value === 'string' && /^[a-z0-9-]{1,64}$/.test(value)
      : false;
    if (!valid) throw new Error(`Invalid V3 view preference: ${key}`);
    localState[key] = value;
  }
  function setHud(renderer) {
    if (typeof renderer !== 'function') throw new Error('Invalid V3 HUD renderer');
    hudRenderer = renderer;
  }
  function renderHud(context, current) {
    if (!hudRenderer) throw new Error('V3 HUD is not registered');
    return hudRenderer(context, current);
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }
  function rarityName(value) {
    const number = Number(value);
    const index = Number.isFinite(number) ? Math.max(0, Math.min(4, Math.trunc(number))) : 0;
    return ['凡', '灵', '玄', '地', '天'][index];
  }
  const diagnostics = () => Object.freeze({
    registeredWindows: [...windows.keys()], activeWindow: active?.id || null,
    mounted: !!active?.rootNode, renders, releases
  });
  root.FSUIV3 = Object.freeze({ register, render, commit, deactivate, diagnostics,
    getState, setState, setHud, renderHud, esc, rarityName });
})(typeof globalThis !== 'undefined' ? globalThis : this);
