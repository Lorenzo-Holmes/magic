(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FSQuantity = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Twelve significant digits and an exact decimal-string exponent.
  // No enormous value is coerced into a native floating-point number.
  function validate(q) {
    if (!q || typeof q !== 'object' || !Number.isFinite(q.m) || q.m < 1 || q.m >= 10 || typeof q.e !== 'string'
      || q.e.length > 2048 || !/^(?:0|-?[1-9]\d*)$/.test(q.e)) throw new Error('数量级数据损坏。');
    return true;
  }
  function normalize(value, exponent = 0n) {
    if (!Number.isFinite(value) || value <= 0) throw new Error('数量级必须为有限正数。');
    const [m, e] = value.toExponential(11).split('e');
    const q = { m: Number(m), e: (exponent + BigInt(e)).toString() }; validate(q); return q;
  }
  function from(value) { return normalize(value); }
  function multiply(q, factor) {
    validate(q);
    if (!Number.isFinite(factor) || factor <= 0 || factor > 1000000 || factor < .000001) throw new Error('数量级倍率无效。');
    return normalize(q.m * factor, BigInt(q.e));
  }
  function compare(a, b) {
    validate(a); validate(b);
    const ae = BigInt(a.e), be = BigInt(b.e);
    return ae < be ? -1 : ae > be ? 1 : Math.sign(a.m - b.m);
  }
  function ratio(a, b) {
    validate(a); validate(b);
    const difference = BigInt(a.e) - BigInt(b.e);
    if (difference > 6n) return 1000000;
    if (difference < -6n) return 0;
    return a.m / b.m * Math.pow(10, Number(difference));
  }
  function format(q, detail = false) {
    validate(q); const e = BigInt(q.e);
    if (e >= 0n && e <= 14n) return Math.round(q.m * Math.pow(10, Number(e))).toLocaleString('zh-CN');
    return `${detail ? q.m : Number(q.m.toFixed(3))} × 10^${q.e}`;
  }
  return Object.freeze({ from, multiply, compare, ratio, format, validate });
});
