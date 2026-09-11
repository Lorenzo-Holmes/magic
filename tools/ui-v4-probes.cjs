'use strict';
// Final computed styles on explicitly opaque surfaces, not a token-only check.
async function contrast(page, selector) {
  return page.evaluate(selector=>{
    const rgba=s=>{const x=s.match(/[\d.]+/g)?.map(Number);return x&&x.length>=3?[x[0],x[1],x[2],x[3]??1]:null;};
    const over=(a,b)=>[a[0]*a[3]+b[0]*(1-a[3]),a[1]*a[3]+b[1]*(1-a[3]),a[2]*a[3]+b[2]*(1-a[3]),1];
    const lum=c=>{const t=c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*t[0]+.7152*t[1]+.0722*t[2];};
    return [...document.querySelectorAll(selector)].filter(el=>{
      if(!el.textContent.trim()||!el.getClientRects().length)return false;
      for(let p=el;p;p=p.parentElement){if(getComputedStyle(p).display==='none')return false;if(p.tagName==='DETAILS'&&!p.open&&!p.querySelector('summary')?.contains(el))return false;}
      return true;
    }).map(el=>{
      const style=getComputedStyle(el),layers=[];let opacity=1,opaque=false,image=false;
      for(let p=el;p;p=p.parentElement){const s=getComputedStyle(p);opacity*=Number(s.opacity);if(!opaque){image ||= s.backgroundImage!=='none';const color=rgba(s.backgroundColor);if(color){layers.push(color);if(color[3]===1)opaque=true;}}}
      let bg=[255,255,255,1];for(const c of layers.reverse())bg=over(c,bg);
      const fg=over(rgba(style.color),bg),x=lum(fg),y=lum(bg),ratio=(Math.max(x,y)+.05)/(Math.min(x,y)+.05);
      return {text:el.textContent.trim().slice(0,80),color:style.color,background:bg.slice(0,3),ratio,opacity,font:parseFloat(style.fontSize),flatOpaqueSurface:opaque&&!image};
    });
  },selector);
}
async function hitTargets(page,selector) {
  const results=[];
  for(const el of await page.locator(selector).all()){
    if(!await el.isVisible())continue;
    await el.scrollIntoViewIfNeeded();
    results.push(await el.evaluate(el=>{
      const r=el.getBoundingClientRect(),points=[[.5,.5],[.16,.16],[.84,.16],[.16,.84],[.84,.84]];
      return {text:el.getAttribute('aria-label')||el.textContent.trim().slice(0,50),w:r.width,h:r.height,inside:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,points:points.map(([x,y])=>{const hit=document.elementFromPoint(r.left+x*r.width,r.top+y*r.height);return !!hit&&(hit===el||el.contains(hit));})};
    }));
  }
  return results;
}
module.exports={contrast,hitTargets};
