/* Etched Motion: deterministic Canvas 2D drawing primitives. No dependencies. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  function rng(seed = 1) {
    let a = seed >>> 0;
    return () => {
      a += 0x6D2B79F5;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function path(d) { return new Path2D(d); }
  function ellipse(x,y,rx,ry,angle=0) {
    const p = new Path2D(); p.ellipse(x,y,rx,ry,angle,0,TAU); return p;
  }
  function withClip(c,p,draw) { c.save(); c.clip(p); draw(); c.restore(); }
  function fill(c,p,color) { c.fillStyle=color; c.fill(p); }
  function outline(c,p,color='#392b32',width=1.1,seed=1) {
    const r=rng(seed); c.save(); c.strokeStyle=color; c.lineWidth=width;
    c.lineCap='round'; c.lineJoin='round'; c.stroke(p);
    c.globalAlpha*=0.32; c.translate((r()-.5)*1.35,(r()-.5)*1.35);
    c.lineWidth=width*.6; c.stroke(p); c.restore();
  }
  function line(c,points,color='#392b32',width=.75,seed=1,wobble=.45) {
    if (points.length<2) return;
    const r=rng(seed); c.save(); c.strokeStyle=color; c.lineWidth=width;
    c.lineCap='round'; c.lineJoin='round'; c.beginPath();
    c.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++) {
      const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/12));
      for(let j=1;j<=n;j++) {
        const t=j/n, taper=Math.sin(Math.PI*t);
        c.lineTo(a[0]+(b[0]-a[0])*t+(r()-.5)*wobble*taper,
                 a[1]+(b[1]-a[1])*t+(r()-.5)*wobble*taper);
      }
    }
    c.stroke();c.restore();
  }
  function hatch(c,p,bounds,options={}) {
    const {seed=1,angle=-.65,spacing=3.4,length=24,jitter=1.6,width=.55,
      color='rgba(67,39,43,.32)',density=()=>1,curve=0}=options;
    const r=rng(seed),[x,y,w,h]=bounds, dx=Math.cos(angle),dy=Math.sin(angle);
    withClip(c,p,()=>{
      c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';
      for(let yy=y-length;yy<y+h+length;yy+=spacing) {
        for(let xx=x-length;xx<x+w+length;xx+=length*.83) {
          const a=xx+(r()-.5)*length,b=yy+(r()-.5)*jitter;
          if(r()>density(a,b)) continue;
          const len=length*(.35+r()*.95);
          c.beginPath();c.moveTo(a,b);
          c.quadraticCurveTo(a+dx*len*.5-dy*curve,b+dy*len*.5+dx*curve,
            a+dx*len,b+dy*len);c.stroke();
        }
      }
    });
  }
  function stipple(c,p,bounds,options={}) {
    const {seed=1,count=2000,color='rgba(45,30,34,.18)',radius=.6,
      density=()=>1}=options;
    const r=rng(seed),[x,y,w,h]=bounds;
    withClip(c,p,()=>{
      c.fillStyle=color;
      for(let i=0;i<count;i++) {
        const a=x+r()*w,b=y+r()*h,s=radius*(.3+r());
        if(r()>density(a,b))continue;
        c.beginPath();c.ellipse(a,b,s,s*(.6+r()*.6),0,0,TAU);c.fill();
      }
    });
  }
  function paper(c,w,h,seed=1,dark=false) {
    const r=rng(seed); c.save();
    for(let i=0;i<w*h*.065;i++) {
      const x=r()*w,y=r()*h,s=.3+r()*.8;
      c.fillStyle=dark?`rgba(150,153,196,${.015+r()*.04})`:
        (r()<.5?`rgba(70,40,30,${.025+r()*.04})`:`rgba(255,251,215,${.12+r()*.18})`);
      c.fillRect(x,y,s,s*.65);
    }
    c.restore();
  }
  function layer(w,h,draw) {
    const cv=document.createElement('canvas');cv.width=w;cv.height=h;
    draw(cv.getContext('2d'));return cv;
  }
  function smooth(a,b,t) { t=Math.max(0,Math.min(1,(t-a)/(b-a)));return t*t*(3-2*t); }
  root.Etch={TAU,rng,path,ellipse,withClip,fill,outline,line,hatch,stipple,paper,layer,smooth};
})(globalThis);
