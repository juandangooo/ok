/* ---------- arcade: attract screen, EASY / HARD, fixed stages ---------- */
const AX = document.createElement("div"); AX.id = "arcade"; AX.setAttribute("role","application"); AX.setAttribute("aria-label","Load-In arcade");
const FIELD = {Audio:"yellow", Lighting:"red", Video:"coal", Other:"green"};
const DEPT_WORD = {Audio:"Audio", Lighting:"Lighting", Video:"Video", Other:"Staging"};
let A = null, axSound = store.get("axsound", true), actx = null;
const axReduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* isometric line drawings, drawn from boxes */
const C30 = Math.cos(Math.PI/6);
const P = (x,y,z) => [(x-y)*C30, (x+y)*.5 - z];
function isoSVG(kind, flip){
  const els = [], pts = [];
  const poly = (tag, arr) => { const q = arr.map(a => P(...a)); pts.push(...q); els.push(`<${tag} points="${q.map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ")}"/>`); };
  const box = (x,y,z,a,b,c) => { poly("polygon",[[x,y,z+c],[x+a,y,z+c],[x+a,y+b,z+c],[x,y+b,z+c]]);
    poly("polygon",[[x,y+b,z],[x+a,y+b,z],[x+a,y+b,z+c],[x,y+b,z+c]]); poly("polygon",[[x+a,y,z],[x+a,y+b,z],[x+a,y+b,z+c],[x+a,y,z+c]]); };
  const ring = (cx,y,cz,r) => { const a=[]; for(let i=0;i<=28;i++){const t=i/28*Math.PI*2; a.push([cx+r*Math.cos(t),y,cz+r*Math.sin(t)])} poly("polyline",a); };
  if(kind==="stairs") for(let i=0;i<4;i++) box(i*12,0,i*12,48-i*12,30,12);
  if(kind==="speaker"){ box(0,0,0,44,30,56); ring(22,30,20,13); ring(22,30,44,5); }
  if(kind==="sub"){ box(0,0,0,62,42,44); ring(31,42,22,16); }
  if(kind==="case"){ box(0,0,0,62,36,34); poly("polyline",[[0,36,24],[62,36,24],[62,0,24]]); poly("polyline",[[22,36,12],[40,36,12]]); }
  if(kind==="wedge"){ poly("polygon",[[0,0,30],[54,0,12],[54,34,12],[0,34,30]]); poly("polygon",[[0,34,0],[54,34,0],[54,34,12],[0,34,30]]); poly("polygon",[[54,0,0],[54,34,0],[54,34,12],[54,0,12]]); }
  if(kind==="riser"){ box(0,0,0,70,50,18); }
  const xs = pts.map(p=>p[0]), ys = pts.map(p=>p[1]), x0=Math.min(...xs)-2, y0=Math.min(...ys)-2, w=Math.max(...xs)-x0+2, h=Math.max(...ys)-y0+2;
  return `<svg viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" aria-hidden="true"><g${flip?` transform="translate(${(2*x0+w).toFixed(1)},0) scale(-1,1)"`:""}>${els.join("")}</g></svg>`;
}
const TRUCK = `<svg viewBox="0 0 44 22" aria-hidden="true"><rect x="1" y="3" width="26" height="14"/><path d="M27 7h9l6 6v4H27z"/><circle cx="9" cy="18" r="3"/><circle cx="34" cy="18" r="3"/></svg>`;

/* sound: short and quiet, only after the first tap */
function blip(f, d=.08, type="triangle", at=0){
  if(!axSound) return;
  try{ actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    const o=actx.createOscillator(), g=actx.createGain(), t=actx.currentTime+at;
    o.type=type; o.frequency.value=f; g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.08,t+.01); g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t+d+.02);
  }catch(e){}
}
const sfx = {ok:()=>{blip(880,.07);blip(1320,.09,"triangle",.07)}, no:()=>blip(150,.22,"square"), start:()=>[523,659,784,1047].forEach((f,i)=>blip(f,.1,"triangle",i*.08)),
  tick:()=>blip(1760,.03,"sine")};

/* shell */
function axShell(top, mid, cap){
  AX.innerHTML = `<div class="ax-top">${top}</div><div class="ax-mid">${mid}</div><div class="ax-cap">${cap}</div>`;
}
const hiScore = () => Math.max(store.get("hi",0), ...BOARD.map(p=>p.hi||0));
function capRow(){
  return `<span><button id="axgearb">Gear</button></span><span>Stage Shop, NJ</span><span><button id="axsnd">Sound ${axSound?"on":"off"}</button> · <button id="axprac">Practice</button></span>`;
}
/* the gear encyclopedia, always one tap away; pauses the clock */
function openGear(item){
  if(A) A.paused = A.paused || Date.now();
  let g=document.getElementById("axgear");
  if(!g){ g=document.createElement("div"); g.id="axgear"; g.setAttribute("role","dialog"); g.setAttribute("aria-label","Gear"); document.body.appendChild(g); }
  g.hidden=false;
  g.innerHTML=`<div class="axg-head"><h2>Gear</h2><button class="next" id="axgclose">${A?"Back to the game":"Close"}</button></div><div id="axgbody"></div>`;
  browse(document.getElementById("axgbody"), "");
  const close=()=>{ g.hidden=true; if(A&&A.paused){ A.shift=(A.shift||0)+(Date.now()-A.paused); A.paused=0; } if(A&&A.resume){ A.resume=false; next(); } };
  document.getElementById("axgclose").onclick=close;
  if(item) detail(item);
}
function bindCap(){
  const gb=document.getElementById("axgearb"); if(gb) gb.onclick=()=>openGear();
  const s=document.getElementById("axsnd"); if(s) s.onclick=()=>{axSound=!axSound;store.set("axsound",axSound);s.textContent="Sound "+(axSound?"on":"off")};
  const p=document.getElementById("axprac"); if(p) p.onclick=()=>{clearInterval(A&&A.tm);A=null;AX.hidden=true;document.body.style.overflow="";showBack();home()};
}
function showBack(){
  let b=document.getElementById("axback");
  if(!b){b=document.createElement("button");b.id="axback";b.className="ax-back";b.textContent="Arcade";document.body.appendChild(b);b.onclick=()=>{b.hidden=true;attract()}}
  b.hidden=false;
}

/* attract screen */
function hsRows(){
  let rows = BOARD.filter(p=>p.hi>0&&(p.ini||p.nick)).sort((a,b)=>b.hi-a.hi).map(p=>({ini:(p.ini||p.nick||"").slice(0,3).toUpperCase(),s:p.hi,me:p.id===ME}));
  if(!rows.length) rows = store.get("hs",[]).map(r=>({ini:r.ini,s:r.s,me:false}));
  return rows.slice(0,5);
}
function attract(){
  clearInterval(A&&A.tm); A=null;
  AX.hidden=false; AX.dataset.f="yellow"; AX.dataset.pick=""; document.body.style.overflow="hidden"; window.scrollTo(0,0);
  const kinds=["stairs","speaker","case","sub","wedge","stairs","riser","speaker","sub","stairs","case","wedge"];
  const hs=hsRows();
  axShell(`<span>Load-In</span><span>Hi</span><span class="n">${hiScore().toLocaleString()}</span>`,
    `<div class="ax-grid">${kinds.map((k,i)=>isoSVG(k,(i*7)%3===1)).join("")}</div>
     <div class="ax-start"><div class="ax-press">Press start</div>
       <div class="ax-modes"><button data-m="easy">EASY<small>Crew chief always helps</small></button><button data-m="hard">HARD<small>Hints cost 200</small></button></div></div>
     ${hs.length?`<div class="ax-hs"><h3>BEST CREWS</h3>${hs.map((r,i)=>`<div class="${r.me?"me":""}"><span>${i+1}</span><span>${esc(r.ini)}</span><span>${r.s.toLocaleString()}</span></div>`).join("")}</div>`:""}`,
    capRow());
  bindCap();
  AX.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>pickDept(b.dataset.m));
}
/* after EASY / HARD: which department do you want to work? */
const DEPTS=[["Audio","Audio","Mics, wireless, speakers, consoles, DIs."],["Lighting","Lighting","Fixtures, uplights, consoles, DMX."],
  ["Video","Video","TVs, projectors, cameras, switchers."],["Other","Staging & rigging","Truss, pipe and drape, risers, power."],
  ["All","Load-in","Everything in the shop, all departments."]];
function pickDept(mode){
  sfx.tick();
  axShell(`<span>${mode==="hard"?"Hard":"Easy"}</span><span></span><span class="n">${hiScore().toLocaleString()}</span>`,
    `<div class="ax-card"><div class="k">CHOOSE YOUR DEPARTMENT</div></div>
     <div class="ax-depts">${DEPTS.map(([k,l,d],i)=>`<button data-d="${k}"><b>${i+1} · ${l}</b><span>${d}</span></button>`).join("")}</div>
     <button class="ax-more" id="axdback" style="justify-self:center">Back</button>`, capRow());
  bindCap();
  AX.querySelectorAll("[data-d]").forEach(b=>{
    b.onmouseenter=b.onfocus=()=>{AX.dataset.f=FIELD[b.dataset.d]||"yellow"};
    b.onclick=()=>startRun(mode,b.dataset.d);
  });
  document.getElementById("axdback").onclick=attract;
  A=null; AX.dataset.pick=mode;
}

/* the run: fixed order */
const STAGES = [
  {id:"load", k:"STAGE 1", h:"Load-in", s:"The truck's here. Pull what the crew calls for."},
  {id:"price", k:"CHALLENGING STAGE", h:"Price check", s:"No lives lost. What does it cost new? Bonus points only."},
  {id:"gig", k:"STAGE 2", h:"Pull the show", s:"A client, a venue, a request. One decision at a time."},
];
function startRun(mode, dept="All"){
  sfx.start(); AX.dataset.pick="";
  A={mode, dept, score:0, lives:3, si:0, right:0, total:0, streak:0, crowd:0, hintsUsed:0};
  stageCard();
}
function stageCard(){
  const S=STAGES[A.si];
  AX.dataset.f = A.dept!=="All" ? FIELD[A.dept] : S.id==="price" ? "red" : S.id==="gig" ? "coal" : "yellow";
  axShell(`<span>${S.k.startsWith("STAGE")?"Stage "+(A.si===0?1:2):"Bonus"}</span><span></span><span class="n">${A.score.toLocaleString()}</span>`,
    `<div class="ax-card"><div class="k">${S.k}</div><div class="h">${S.h}</div><div class="s">${S.s}</div></div>`, capRow());
  bindCap();
  setTimeout(()=>{ if(!A) return; buildWaves(); wave(); }, axReduce?600:1700);
}
function pickLoad(n){
  // only sharp photos in the formation: a blurry tile teaches nothing
  const inDept = g => A.dept==="All" || g.c===A.dept;
  const sharp = GEAR.filter(g=>g.img&&!g.sub&&(g.iw||0)>=300);
  const mine = sharp.filter(inDept).length>=15 ? sharp.filter(inDept) : GEAR.filter(g=>g.img&&!g.sub&&inDept(g));
  const pool = shuffle(mine.filter(g=>g.q>0&&g.n.length<70));
  return pool.slice(0,n).map((g,wi)=>{
    // hard: look-alikes from the same department; easy: anything sharp that looks different
    // no twins: every option needs its own photo and must not be the same product in another length or colour
    const base = n => n.toLowerCase().replace(/\(.*?\)/g,"").replace(/[\d.]+\s*(ft|'|"|in|inch)?\.?/g,"").replace(/\b(black|white|beige|silver|red|blue|green)\b/g,"").replace(/\s+/g," ").trim();
    const seen = new Set([g.img]), seenN = new Set([base(g.n)]);
    const fresh = x => x.id!==g.id && !seen.has(x.img) && !seenN.has(base(x.n));
    const take = x => { seen.add(x.img); seenN.add(base(x.n)); return x; };
    const same = shuffle(mine.filter(x=>GD.cat(x)===GD.cat(g)));
    const other = shuffle((A.mode==="hard"?mine:sharp).filter(x=>GD.cat(x)!==GD.cat(g)));
    const need = A.mode==="hard"?5:3, wrong = [];
    for(const x of A.mode==="hard"?same:[]) { if(wrong.length>=need) break; if(fresh(x)) wrong.push(take(x)); }
    for(const x of other) { if(wrong.length>=need) break; if(fresh(x)) wrong.push(take(x)); }
    // alternate: odd waves show one photo and ask for the name; even waves name it and ask for the photo
    const fmt = wi%2 ? "name" : "photo";
    return {kind:"load", fmt, dept:g.c, k:fmt==="name"?"WHAT IS THIS?":"PULL", q:fmt==="name"?"":g.n, opts:shuffle([{x:g,ok:true},...wrong.map(x=>({x,ok:false}))]), hint:`It's ${/^[aeiou]/i.test(g.t)?"an":"a"} ${g.t.toLowerCase()}. ${g.w?g.w.replace(/Skip this one.*$/,"").split(". ")[0].replace(/\.+\s*$/,"")+".":""}`, answer:g};
  });
}
function pickPrice(n){
  return shuffle(GEAR.filter(g=>g.p!=null&&g.img&&!g.sub&&(A.dept==="All"||g.c===A.dept))).slice(0,n).map(g=>({kind:"price", dept:g.c, k:"WHAT DOES IT COST NEW?", q:g.n, img:g.img,
    opts:shuffle(priceOpts(g.p).map(v=>({price:v, ok:v===g.p}))), hint:`${g.t}.`, answer:g}));
}
function pickGig(){
  // pick a venue with enough decisions in the chosen department
  const deptOf = q => { const o=(q.pool({})||[]).find(x=>x.ok); const x=o&&(o.x||byId[Object.keys(o.bundle||{})[0]]); return x?x.c:"Other"; };
  let best=null;
  for(const gig of shuffle([...GD.GIGS])){
    const qs=GD.questions(gig).filter(q=>A.dept==="All"||deptOf(q)===A.dept);
    if(!best||qs.length>best.qs.length) best={gig,qs};
    if(qs.length>=4) break;
  }
  if(best.qs.length<2) best.qs=GD.questions(best.gig);   // few decisions in this department: run the whole show
  A.gig = best.gig; A.gstate = {};
  return best.qs.map(q=>({kind:"gig", q, k:q.title.toUpperCase(), hint:""}));
}
function buildWaves(){
  const S=STAGES[A.si];
  A.waves = S.id==="load" ? pickLoad(10) : S.id==="price" ? pickPrice(5) : pickGig();
  A.wi = 0;
}
function crowdDraw(){
  const c=document.getElementById("axcrowd"); if(!c) return;
  const r=c.getBoundingClientRect(), dpr=Math.min(2,devicePixelRatio||1); c.width=r.width*dpr; c.height=r.height*dpr;
  const x=c.getContext("2d"); x.scale(dpr,dpr); x.clearRect(0,0,r.width,r.height);
  const col=getComputedStyle(AX).getPropertyValue("--line").trim()||"#1E1C18";
  const gap=7, cols=Math.floor(r.width/gap), rows=Math.floor(r.height/gap), N=cols*rows;
  if(!A.order||A.order.length!==N){ A.order=shuffle([...Array(N).keys()]).sort((a,b)=>Math.floor(b/cols)-Math.floor(a/cols)+ (Math.random()-.5)*1.4); }
  const on=Math.round(Math.min(1,A.crowd)*N); x.fillStyle=col;
  for(let i=0;i<on;i++){ const k=A.order[i], cx=(k%cols)*gap+gap/2, cy=Math.floor(k/cols)*gap+gap/2; x.beginPath(); x.arc(cx,cy,1.9,0,Math.PI*2); x.fill(); }
}
function livesHTML(){ return `<span class="ax-lives" aria-label="${A.lives} trucks left">${[0,1,2].map(i=>TRUCK.replace("<svg",`<svg class="${i<A.lives?"":"gone"}"`)).join("")}</span>`; }

function wave(){
  const W=A.waves[A.wi], S=STAGES[A.si];
  let opts, prompt=W.q, hint=W.hint;
  if(W.kind==="gig"){
    const pool=W.q.pool(A.gstate); opts=sample(pool, A.mode==="hard"?"medium":"easy");
    if(!opts.some(o=>o.ok)) return next();
    W.opts=opts; prompt=W.q.q; hint=`Right call: think about what this venue already has and what the client asked for.`;
    const x0=opts.find(o=>o.ok); const xx=x0.x||byId[Object.keys(x0.bundle)[0]]; W.dept=xx?xx.c:"Other";
  } else opts=W.opts;
  AX.dataset.f = FIELD[W.dept]||"yellow";
  const T = 30;   // Kahoot clock: the faster the answer, the more points
  const nameQ = W.kind==="load" && W.fmt==="name";
  const named = W.kind==="gig" || nameQ, price = W.kind==="price";
  const tiles = opts.map((o,i)=>{
    let inner;
    if(price) inner=`<span style="font:500 clamp(18px,5vw,26px) Archivo,Helvetica,Arial,sans-serif;font-variant-numeric:tabular-nums">${money(o.price)}</span>`;
    else if(nameQ) inner=`<span style="font:500 15px/1.25 Archivo,Helvetica,Arial,sans-serif;padding:8px 14px;text-align:left;width:100%">${esc(o.x.n)}</span>`;
    else if(named){ const im=optImg(o); inner=`<span style="display:grid;grid-template-columns:40px 1fr;gap:10px;align-items:center;width:100%;padding:5px 10px;text-align:left">${im?`<img alt="" src="${im}" style="width:40px;height:40px">`:"<span></span>"}<span style="font:500 13px/1.25 Archivo,Helvetica,Arial,sans-serif">${esc(optName(o))}</span></span>`; }
    else inner=`<img alt="" src="${o.x.img}" style="max-width:min(90%,${o.x.iw||480}px);max-height:min(90%,${o.x.iw||480}px)">`;
    return `<button class="ax-tile${!price&&!named?" photo":""}" data-i="${i}" aria-label="${price?money(o.price):named?esc(optName(o)):"Option "+(i+1)}" style="transform:translate(${(Math.random()*120-60).toFixed(0)}vw,-110vh) rotate(${(Math.random()*90-45).toFixed(0)}deg);transition-delay:${i*55}ms">${inner}</button>`;
  }).join("");
  const formCls = named ? "ax-form rows" : price ? "ax-form prices" : `ax-form${opts.length>4?" k8":""}`;
  axShell(`<span>${S.id==="price"?"Bonus":S.id==="gig"?esc(A.gig.venue):"Stage 1"}</span><span></span><span class="n">${A.score.toLocaleString()}</span>`,
    `<div class="ax-hud">${livesHTML()}<span>${DEPT_WORD[W.dept]||""} · ${A.wi+1} of ${A.waves.length}</span></div>
     <div class="ax-prompt"><span class="k">${esc(W.k)}</span><span class="q">${esc(prompt)}</span>${W.kind==="gig"&&A.wi===0?`<span class="k" style="letter-spacing:.04em;line-height:1.4">${esc(A.gig.town)} · ${esc(A.gig.cap)} · “${esc(A.gig.request)}”</span>`:""}</div>
     ${price||nameQ?`<div class="ax-hero${price?" sm":""}"><img alt="" src="${W.answer.img}"></div>`:""}
     <div class="ax-clock"><div class="ax-timer"><span id="axt"></span></div><span class="ax-secs" id="axs">${T}</span></div>
     <div class="${formCls}">${tiles}</div>
     <div class="ax-name" id="axname"></div>
     <div class="ax-tools"><span class="ax-hint" id="axhint">${A.mode==="easy"&&!price?"Crew chief: "+esc(hint):""}</span>${A.mode==="hard"&&!price?`<button id="axh">Hint −200</button>`:""}</div>
     <canvas class="ax-crowd" id="axcrowd" aria-hidden="true"></canvas>
     <div class="ax-truck" id="axtruck">${TRUCK}</div>`, capRow());
  bindCap(); crowdDraw();
  requestAnimationFrame(()=>requestAnimationFrame(()=>AX.querySelectorAll(".ax-tile").forEach(t=>t.classList.add("in"))));
  const h=document.getElementById("axh");
  if(h) h.onclick=()=>{ h.disabled=true; h.style.opacity=.4; A.score=Math.max(0,A.score-200); A.hintsUsed++;
    document.getElementById("axhint").textContent="Crew chief: "+hint;
    let k=0; AX.querySelectorAll(".ax-tile").forEach((t,i)=>{ if(!opts[i].ok && k<Math.floor((opts.length-1)/2)){ t.classList.add("dim"); t.disabled=true; k++; } }); };
  const t0=Date.now(), bar=document.getElementById("axt"), secs=document.getElementById("axs"); let done=false; A.shift=0; A.paused=0;
  const elapsed=()=>(Date.now()-t0-A.shift)/1000;
  clearInterval(A.tm); A.tm=setInterval(()=>{ if(A.paused) return; const left=Math.max(0,T-elapsed()); bar.style.width=(left/T*100)+"%"; secs.textContent=Math.ceil(left); if(left<=0) pick(-1); },100);
  const pick = i => {
    if(done||A.paused) return; done=true; clearInterval(A.tm);
    const left=Math.max(0,T-elapsed()), o=i>=0?opts[i]:null, ok=!!(o&&o.ok);
    const tiles=[...AX.querySelectorAll(".ax-tile")]; tiles.forEach(t=>t.disabled=true);
    const ri=opts.findIndex(x=>x.ok);
    if(W.kind==="gig"&&W.q.key==="console"&&o&&o.x) A.gstate.console=o.x.id;
    A.total++;
    if(ok){
      A.right++; A.streak++;
      // Kahoot scoring: 1000 for an instant answer, sliding to 500 at the buzzer, plus a streak bonus
      let pts=Math.round(1000*(1-(1-left/T)/2)) + Math.min(A.streak-1,5)*100; if(A.mode==="hard") pts=Math.round(pts*1.5);
      A.score+=pts; A.last=pts; if(!price) A.crowd=Math.min(1,A.crowd+.1); sfx.ok();
      const tr=document.getElementById("axtruck").getBoundingClientRect(), tb=tiles[i].getBoundingClientRect();
      tiles[i].style.setProperty("--dx",(tr.left+tr.width/2-(tb.left+tb.width/2))+"px"); tiles[i].style.setProperty("--dy",(tr.top-(tb.top+tb.height/2))+"px");
      tiles[i].style.transitionDelay="0ms"; tiles[i].classList.add("hit");
      tiles.forEach((t,j)=>{ if(j!==i) t.classList.add("dim"); });
    } else {
      A.streak=0; sfx.no();
      if(!price){ A.lives--; A.crowd=Math.max(0,A.crowd-.18); }
      if(i>=0) tiles[i].classList.add("miss");
      tiles[ri].classList.add("right"); tiles.forEach((t,j)=>{ if(j!==i&&j!==ri) t.classList.add("dim"); });
    }
    const who = W.kind==="gig" ? optName(opts[ri]) : W.answer.n, why = W.kind==="gig" ? opts[ri].why : [W.answer.t, W.answer.p!=null?money(W.answer.p):""].filter(Boolean).join(" · ");
    const ansItem = W.kind==="gig" ? (opts[ri].x || byId[Object.keys(opts[ri].bundle||{})[0]]) : W.answer;
    document.getElementById("axname").innerHTML = `${ok?`<span class="ax-pts">+${A.last.toLocaleString()}</span> ${A.streak>1?`Streak ${A.streak} · `:""}`:(i<0?"Time. ":"Not that one. ")}<b>${esc(who)}</b> · ${esc(why)}${ansItem?` <button class="ax-more" id="axmore">Look it up</button>`:""}`;
    const mb=document.getElementById("axmore"); if(mb) mb.onclick=()=>{ clearTimeout(A.nt); openGear(ansItem); A.resume=true; };
    AX.querySelector(".ax-top .n").textContent=A.score.toLocaleString();
    AX.querySelector(".ax-lives").outerHTML=livesHTML(); crowdDraw();
    if(W.kind!=="gig"){ st.box[W.answer.id]=ok?box(W.answer.id)+1:0; }
    A.nt=setTimeout(next, ok?(W.kind==="gig"?1700:1100):2400);
  };
  AX.querySelectorAll(".ax-tile").forEach(b=>b.onclick=()=>pick(+b.dataset.i));
  A.pick=pick;
}
function next(){
  if(!A) return;
  if(A.lives<=0) return over(false);
  A.wi++;
  if(A.wi<A.waves.length) return wave();
  const bonus=A.lives*1000; A.score+=bonus; A.si++; sfx.start();
  if(A.si<STAGES.length) return stageClear(bonus);
  over(true);
}
/* the check-in between stages */
function stageClear(bonus){
  const done=STAGES[A.si-1], up=STAGES[A.si];
  AX.dataset.f="yellow";
  axShell(`<span>Stage clear</span><span></span><span class="n">${A.score.toLocaleString()}</span>`,
    `<div class="ax-card"><div class="k">${done.k} CLEAR</div><div class="h">${done.h}</div></div>
     <div class="ax-stats"><span><b>${A.right}/${A.total}</b>right calls</span><span><b>${A.lives}</b>truck${A.lives===1?"":"s"} left</span><span><b>+${bonus.toLocaleString()}</b>truck bonus</span></div>
     <div class="ax-card"><div class="k">UP NEXT · ${up.k}</div><div class="s"><b>${up.h}.</b> ${up.s}</div></div>
     <div class="ax-card"><div class="h" style="font-size:clamp(28px,8vw,44px)">Continue?</div></div>
     <div class="ax-modes" style="justify-self:center"><button id="axcont">CONTINUE</button><button id="axend">END SHIFT</button></div>`, capRow());
  bindCap();
  document.getElementById("axcont").onclick=stageCard;
  document.getElementById("axend").onclick=()=>over(false,true);
  document.getElementById("axcont").focus({preventScroll:true});
}
function over(clear, ended){
  clearInterval(A.tm);
  const xp=A.right*10; st.xp+=xp;
  const hi=store.get("hi",0); if(A.score>hi) store.set("hi",A.score);
  save();
  AX.dataset.f="yellow";
  let ini=(store.get("ini","")||"AAA").padEnd(3,"A").slice(0,3).split("");
  const L="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  axShell(`<span>${clear?"Shift complete":ended?"Shift ended":"Game over"}</span><span></span><span class="n">${A.score.toLocaleString()}</span>`,
    `<div class="ax-card"><div class="k">${clear?"THE SHOW WENT UP":ended?"SHIFT ENDED":"OUT OF TRUCKS"}</div><div class="h">${A.score.toLocaleString()}</div></div>
     <div class="ax-stats"><span><b>${A.right}/${A.total}</b>right calls</span><span><b>${Math.round(A.crowd*100)}%</b>crowd</span><span><b>+${xp}</b>XP</span></div>
     <div class="ax-card"><div class="k">ENTER YOUR INITIALS</div></div>
     <div class="ax-ini">${ini.map((c,i)=>`<div><button data-u="${i}" aria-label="Next letter">▲</button><b id="ini${i}">${c}</b><button data-dn="${i}" aria-label="Previous letter">▼</button></div>`).join("")}</div>
     <button class="ax-go" id="axsave">SAVE</button>
     ${clear?`<div class="ax-card"><div class="s">Next build: Stage 3, Make the quote.</div></div>`:""}`, capRow());
  bindCap();
  const set=(i,d)=>{ini[i]=L[(L.indexOf(ini[i])+d+26)%26]; document.getElementById("ini"+i).textContent=ini[i]; sfx.tick();};
  AX.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>set(+b.dataset.u,1));
  AX.querySelectorAll("[data-dn]").forEach(b=>b.onclick=()=>set(+b.dataset.dn,-1));
  let pos=0; A.keyIni=ch=>{ if(/^[a-z]$/i.test(ch)){ ini[pos]=ch.toUpperCase(); document.getElementById("ini"+pos).textContent=ini[pos]; pos=Math.min(2,pos+1);} };
  document.getElementById("axsave").onclick=()=>{
    const s=ini.join(""); store.set("ini",s);
    const hs=store.get("hs",[]); hs.push({ini:s,s:A.score}); hs.sort((a,b)=>b.s-a.s); store.set("hs",hs.slice(0,10));
    sync(); attract();
  };
}
document.addEventListener("keydown",e=>{
  if(AX.hidden||!AX.isConnected) return;
  if(!A){
    if(AX.dataset.pick&&/^[1-5]$/.test(e.key)){ const b=AX.querySelectorAll("[data-d]")[+e.key-1]; if(b) b.click(); }
    else if(e.key==="Enter"){ const b=AX.querySelector("[data-m=easy]"); if(b) b.click(); }
    return;
  }
  if(A.keyIni&&!AX.querySelector(".ax-tile")){ if(e.key==="Enter") document.getElementById("axsave").click(); else A.keyIni(e.key); return; }
  if(/^[1-8]$/.test(e.key)&&A.pick){ const t=AX.querySelector(`.ax-tile[data-i="${+e.key-1}"]`); if(t&&!t.disabled) A.pick(+e.key-1); }
});
document.body.appendChild(AX); AX.hidden=true;
