'use strict';
// Explicit production allowlist shared by the build and preview server.
const v3Retired=new Set(['character.dao','prop.platform','prop.forge','prop.gate','prop.beast','prop.astrolabe','prop.pine','prop.pond']);
const v3Assets=require('../assets/ui-v3/manifest.json').assets.filter(asset=>!v3Retired.has(asset.id)).map(asset=>asset.path);
const v4Assets=require('../assets/ui-v4/manifest.json').assets.map(asset=>asset.path);
module.exports = Object.freeze([
  ...require('./shared-ui-files.cjs'),
  'index.html', 'src/style.css', 'src/data.js', 'src/equipment.js', 'src/sect.js', 'src/life.js', 'src/spirit-beast.js', 'src/crafting.js', 'src/karma.js', 'src/build.js', 'src/combat.js', 'src/secret-realm.js', 'src/engine.js', 'src/scenes.js', 'src/format.js', 'src/audio.js', 'src/presentation.js', 'src/meta.js', 'src/quantity.js', 'src/evolution.js', 'src/immortal.js', 'src/app.js', 'assets/seal.svg',
  'assets/bg/realm-mortal.svg', 'assets/bg/realm-foundation.svg', 'assets/bg/realm-goldcore.svg',
  'src/workbench.js', 'src/dao.js', 'src/world.js', 'src/world-ui.js',
  'src/journey.js', 'src/journey-ui.js', 'src/ink-theme.css', 'src/scene-ui.css', 'src/ui-v3.css',
  'src/ui-v3/core.js', 'src/ui-v3/hud.js', 'src/ui-v3/cave.js', 'src/ui-v3/world-map.js', 'src/ui-v3/baggage.js', 'src/ui-v3/character.js', 'src/ui-v3/forge.js',
  'src/ui-v3/art.js','src/ui-v3-legacy.css','assets/ui-v3/manifest.js',
  'src/ui-v3/practice.css','assets/art/retreat-v2.1.webp','assets/ui-v4/manifest.js',
  ...v3Assets,...v4Assets,
  'assets/bg/realm-nascent.svg', 'assets/bg/realm-void.svg', 'assets/bg/realm-tribulation.svg', 'assets/bg/realm-ascension.svg'
]);
