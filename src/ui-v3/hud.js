(function(root){
  'use strict';
  const V=root.FSUIV3,A=root.FSArt;
  V.setHud(({button},current)=>root.FSUINavigation.render({button,art:A},current));
})(typeof globalThis!=='undefined'?globalThis:this);
