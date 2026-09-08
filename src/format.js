(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FSFormat = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function full(value) {
    if (!Number.isFinite(value)) throw new Error('数值必须为有限数。');
    return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  }
  function short(value) {
    if (!Number.isFinite(value)) throw new Error('数值必须为有限数。');
    const n = Math.abs(value);
    if (n < 10000) return full(value);
    if (n >= 1e16) return value.toExponential(2);
    const scale = n >= 1e12 ? 1e12 : n >= 1e8 ? 1e8 : 1e4;
    return `${Number((value / scale).toFixed(1))} ${scale === 1e12 ? '万亿' : scale === 1e8 ? '亿' : '万'}`;
  }
  return Object.freeze({ full, short });
});
