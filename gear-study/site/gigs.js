/* Gig mode: venues, gear categories and answer keys.
   Grading is by category (any sub is a sub, any vocal mic is a vocal mic).
   Every rule below is a game assumption drafted from NJ_Rock_Venue_Game_Scenarios.xlsx; edit freely. */
window.GIG_DATA = (() => {
  // ---- categories: every shop item is sorted into one by its type and name ----
  const CATS = [
    ["console","Mixing consoles"],["snake","Snakes & stage boxes"],["vocal","Vocal mics"],["instmic","Instrument & drum mics"],
    ["speech","Lectern, lav & headset mics"],["wireless","Wireless mic systems"],["di","DI boxes"],
    ["speaker","Speakers (mains or wedges)"],["sub","Subwoofers"],["linearray","Line arrays & column PA"],
    ["iem","In-ear monitors"],["stand","Mic & speaker stands"],["fixture","Lighting fixtures"],["lightctl","Lighting control"],
    ["dmx","DMX cables"],["switcher","Video switchers"],["camera","Cameras"],["playback","Video playback"],["sdi","SDI cables"],
    ["display","Screens & projectors"],["intercom","Intercom"],["cable","Audio & power cables"],["power","Power & distro"],["other","Everything else"],
  ];
  function cat(x){
    const t=x.t.toLowerCase(), n=x.n.toLowerCase();
    if(/lighting console|usb-dmx interface|dmx lighting controller/.test(t+" "+n)) return "lightctl";
    if(/video switcher|live production switcher|streaming video mixer/.test(t+" "+n)) return "switcher";
    if(/mixer|mixing console/.test(t) && !/video/.test(t)) return "console";
    if(/snake|stage box|breakout|multicore|press box/.test(t+" "+n) && !/dmx|power|soca/.test(t+" "+n)) return "snake";
    if(/wireless handheld|wireless receiver|wireless transmitter|antenna/.test(t)) return "wireless";
    if(/in-ear|iem/.test(t)) return "iem";
    if(/podium|cart\b/.test(n)) return "other";
    if(/lectern mic|lavalier|earset|headset mic/.test(t) || /pcc/.test(n)) return "speech";
    if(/vocal mic/.test(t)) return "vocal";
    if(/instrument mic|drum mic|condenser mic|dynamic mic|boundary|drum mic kit/.test(t)) return "instmic";
    if(/\bdi box|direct box/.test(t)) return "di";
    if(/subwoofer/.test(t)) return "sub";
    if(/line array speaker|column/.test(t) || /evox/.test(n)) return "linearray";
    if(/powered speaker/.test(t)) return "speaker";
    if(/mic stand|speaker stand|speaker pole/.test(t)) return "stand";
    if(/\bpar\b|moving head|strobe|pixel bar|uplight|ellipsoidal|followspot|wash|lighting kit/.test(t)) return "fixture";
    if(/dmx cable|combo cable/.test(t)) return "dmx";
    if(/ptz camera|camera$/.test(t)) return "camera";
    if(/recorder|player/.test(t)) return "playback";
    if(/sdi/.test(t)) return "sdi";
    if(/^tv$|projector|display/.test(t)) return "display";
    if(/intercom/.test(t)) return "intercom";
    if(/cable|cord/.test(t)) return "cable";
    if(/power|generator|cam-lok|distro/.test(t)) return "power";
    return "other";
  }
  // ---- specs the grader needs for some categories ----
  const CONSOLES = { // channels, monitor mixes, digital, stage-box family
    "p02-24":{ch:48,mix:12,dig:true,fam:"ah"}, "p19-35":{ch:64,mix:16,dig:true,fam:"yam"},
    "p11-05":{ch:40,mix:16,dig:true,fam:"mt"}, "p11-06":{ch:40,mix:16,dig:true,fam:"mt",needsBox:true},
    "p07-22":{ch:40,mix:16,dig:true,fam:"mt",needsBox:true}, "p03-11":{ch:40,mix:16,dig:true,fam:"mt"},
    "p03-12":{ch:40,mix:16,dig:true,fam:"mt"}, "p03-13":{ch:40,mix:16,dig:true,fam:"mt"}, "p03-14":{ch:40,mix:16,dig:true,fam:"mt"},
    "p19-29":{ch:16,mix:8,dig:true,fam:"yam"}, "p19-34":{ch:16,mix:4,dig:false}, "p19-33":{ch:12,mix:2,dig:false},
    "p03-15":{ch:12,mix:2,dig:false}, "p19-32":{ch:10,mix:1,dig:false}, "p19-31":{ch:6,mix:1,dig:false}, "p10-19":{ch:4,mix:0,dig:false},
  };
  const BOX_FAM = {"p02-23":"ah","p11-04":"mt","p03-10":"mt"}; // digital boxes only talk to their own brand
  const boxCh = x => { const m=x.n.match(/(\d+)\s*[x×]\s*\d+/i) || x.n.match(/DL(\d+)|S(\d+) |DX(\d)(\d)/i);
    if(/DX168/i.test(x.n)) return 16; if(/DL32/i.test(x.n)) return 32; if(/S16/i.test(x.n)) return 16; if(/CAT Box 8/i.test(x.n)) return 8;
    if(/CAT Tails/i.test(x.n)) return 4; if(/Press Box/i.test(x.n)) return 0; return m ? +m[1] : 8; };
  const inputsOf = x => { const k=cat(x);
    if(k==="vocal"||k==="instmic"||k==="speech") return /kit/i.test(x.t)?7:1;
    if(k==="di") return /stereo|prod2|direct2|proav2|usb-p|jdi stereo/i.test(x.n)?2:1;
    if(k==="wireless" && /receiver/i.test(x.t)) return /4Q|EM 4/i.test(x.n)?4:/4D\b|Dual/i.test(x.n)?2:1;
    return 0; };
  const WL_FAM = n => (n.match(/ULXD|QLXD|SLXD|EW-DX|EW 100 G3|G4/i)||[""])[0].toUpperCase();

  // ---- the 15 venues ----
  // need: [category, how many, label]. "mics" = vocal + instrument mics combined; "vocalish" = anything a singer can use.
  const H = "The house has a main PA.", HL = "The house PA covers the low end.";
  const GIGS = [
    {id:1,venue:"Lizzie Rose Music Room",town:"Tuckerton",cap:"70 seated",house:"Stage and building power. Bring a compact PA.",
     request:"Roots-rock trio: acoustic guitar, upright bass, mandolin, three vocals. Low volume, small stage.",
     pa:"bring",inputs:6,mixes:2,digital:false,box:false,
     need:[["vocalish",3,"Vocal mics for 3 singers"],["di",2,"DIs for acoustic and bass"],["stand",3,"Mic stands"]],
     forbid:[["sub","Subs are overkill for a 70-seat acoustic trio."],["linearray","A line array in a 70-seat room is way too much."]],
     bigConsoleWarn:true},
    {id:2,venue:"Hamilton Stage",town:"Rahway",cap:"199 seated",house:"Main PA.",
     request:"Four-piece indie band (drums, bass, guitar, keys; 3 vocals) in a seated theater. Keep the lighting restrained.",
     pa:"house",inputs:16,mixes:4,digital:true,box:true,
     need:[["vocalish",3,"Vocal mics"],["mics",9,"Mics for vocals, drums and amps"],["di",3,"DI channels for bass and stereo keys"],["stand",10,"Mic stands"]],
     forbid:[["linearray",H],["sub",HL]]},
    {id:3,venue:"Crossroads",town:"Garwood",cap:"~200",house:"Stage and building power. Bring a compact PA.",
     request:"Three local rock bands with fast changeovers.",
     pa:"bring",inputs:16,mixes:4,digital:true,box:true,
     need:[["sub",2,"Subwoofers"],["vocalish",3,"Vocal mics"],["mics",8,"Mics for vocals, drums and amps"],["di",1,"Bass DI"],["stand",10,"Mic stands"]],
     forbid:[["linearray","A flown line array is too big for a 200-cap bar. Use compact tops and subs."]],
     note:"Digital console so each band's settings can be saved as a scene."},
    {id:4,venue:"Dingbatz",town:"Clifton",cap:"~200",house:"Stage and building power. Bring a compact PA.",
     request:"Metal band: two guitars, bass, full drums, two vocals.",
     pa:"bring",inputs:14,mixes:4,digital:true,box:true,
     need:[["sub",2,"Subwoofers"],["vocalish",2,"Vocal mics"],["mics",10,"Mics for vocals, full drums and two guitar amps"],["di",1,"Bass DI"]],
     forbid:[["linearray","A line array is too big for a 200-cap club."]]},
    {id:5,venue:"Wonder Bar (indoor)",town:"Asbury Park",cap:"300–350 indoor",house:"Main PA.",
     request:"Punk double bill with a simple stage wash.",
     pa:"house",inputs:14,mixes:4,digital:false,box:true,
     need:[["vocalish",3,"Vocal mics"],["mics",8,"Mics for vocals, drums and amps"],["fixture",6,"Wash lights"],["lightctl",1,"Lighting control"],["dmx",4,"DMX cables"]],
     forbid:[["linearray",H],["sub",HL]]},
    {id:6,venue:"Carteret PAC (Gallery config)",town:"Carteret",cap:"573",house:"Installed PA.",
     request:"Rock benefit show. A speaker opens with remarks from a lectern, then a five-piece band.",
     pa:"house",inputs:18,mixes:4,digital:true,box:true,
     need:[["speech",1,"Lectern or speech mic"],["vocalish",3,"Vocal mics"],["mics",8,"Mics for vocals, drums and amps"],["di",2,"DI channels"]],
     forbid:[["linearray","The PA is installed."],["sub","The PA is installed."]],
     note:"Digital console so the speech and the band can be separate scenes."},
    {id:7,venue:"Anchor Rock Club",town:"Atlantic City",cap:"~650",house:"Main PA.",
     request:"Alternative band wants stereo keys and five separate monitor mixes.",
     pa:"house",inputs:18,mixes:5,digital:true,box:true,
     need:[["stereoDI",1,"A stereo DI for the keys"],["vocalish",3,"Vocal mics"],["mics",8,"Mics for vocals, drums and amps"]],
     forbid:[["linearray",H],["sub",HL]]},
    {id:8,venue:"White Eagle Hall",town:"Jersey City",cap:"400 seated / 800 standing",house:"Main PA.",
     request:"Six-piece band with a three-piece horn section. Wants a basic lighting look.",
     pa:"house",inputs:24,mixes:6,digital:true,box:true,
     need:[["vocalish",4,"Vocal mics"],["mics",13,"Mics for vocals, drums, amps and 3 horns"],["fixture",6,"Lighting fixtures"],["lightctl",1,"Lighting control"]],
     forbid:[["linearray",H],["sub",HL]]},
    {id:9,venue:"Stone Pony (indoor club)",town:"Asbury Park",cap:"~850",house:"Main PA.",
     request:"Four-band rock showcase. Every band needs its own monitor settings.",
     pa:"house",inputs:22,mixes:5,digital:true,box:true,
     need:[["vocalish",4,"Vocal mics"],["mics",12,"Mics for vocals, drums and amps"],["stand",14,"Mic stands"]],
     forbid:[["linearray",H],["sub",HL]],note:"Four bands means saved scenes, so digital only."},
    {id:10,venue:"The Vogel",town:"Red Bank",cap:"400 seated / 984 standing",house:"Main PA.",
     request:"Rock show that was booked standing. The client just switched it to seated: 400 chairs and a revised stage plot.",
     pa:"house",inputs:16,mixes:4,digital:true,box:true,
     need:[["vocalish",3,"Vocal mics"],["mics",9,"Mics for vocals, drums and amps"],["fixture",6,"Lighting fixtures"],["lightctl",1,"Lighting control"]],
     forbid:[["linearray",H],["sub","Seated floor: no ground-stacked subs in the aisles."]],
     twist:"Seated means no floor gear in front of the stage. Keep everything on the deck."},
    {id:11,venue:"UCPAC Main Stage",town:"Rahway",cap:"~1,334 seated",house:"Main PA and stage lighting. The video wall is provided.",
     request:"Classic-rock show with a video backdrop played from FOH.",
     pa:"house",inputs:20,mixes:5,digital:true,box:true,
     need:[["switcher",1,"Video switcher"],["playback",1,"Playback deck for the backdrop"],["sdi",3,"SDI cables"],["vocalish",4,"Vocal mics"],["mics",10,"Mics for vocals, drums and amps"]],
     forbid:[["linearray",H],["sub",HL],["fixture","The house provides stage lighting."]]},
    {id:12,venue:"Count Basie Center",town:"Red Bank",cap:"1,568 seated",house:"Main PA.",
     request:"Full band plus a guest vocalist who walks on with a wireless handheld.",
     pa:"house",inputs:21,mixes:5,digital:true,box:true,wireless:1,
     need:[["vocalish",4,"Band vocal mics"],["mics",10,"Mics for vocals, drums and amps"]],
     forbid:[["linearray",H],["sub",HL]]},
    {id:13,venue:"State Theatre New Jersey",town:"New Brunswick",cap:"1,811 seated",house:"Main PA. The video display is provided.",
     request:"Rock show with opening remarks, a live camera feed to the screen, and crew on headsets.",
     pa:"house",inputs:18,mixes:4,digital:true,box:true,intercom:4,
     need:[["speech",1,"Lectern or speech mic"],["camera",1,"Camera"],["switcher",1,"Video switcher"],["sdi",2,"SDI cables"],["vocalish",3,"Vocal mics"],["mics",8,"Mics for vocals, drums and amps"]],
     forbid:[["linearray",H],["sub",HL]]},
    {id:14,venue:"Starland Ballroom",town:"Sayreville",cap:"2,000 standing (game setting)",house:"Main PA.",
     request:"Large standing rock bill with a timed lighting look.",
     pa:"house",inputs:26,mixes:6,digital:true,minCh:40,box:true,
     need:[["lightctl",1,"A lighting console that can run cues"],["fixture",12,"Lighting fixtures"],["dmx",6,"DMX cables"],["vocalish",4,"Vocal mics"],["mics",12,"Mics for vocals, drums and amps"]],
     forbid:[["linearray",H],["sub",HL]]},
    {id:15,venue:"Wellmont Theater",town:"Montclair",cap:"~2,500",house:"Main PA.",
     request:"Headliner wants six separate in-ear mixes plus two stage wedges.",
     pa:"house",inputs:22,mixes:8,digital:true,box:true,iem:6,
     need:[["speaker",2,"Wedges"],["vocalish",3,"Vocal mics"],["mics",10,"Mics for vocals, drums and amps"]],
     forbid:[["linearray",H],["sub",HL]]},
  ];

  // ---- grading ----
  function grade(gig, pick, byId){
    const items=Object.entries(pick).filter(([,n])=>n>0).map(([id,n])=>({x:byId[id],n}));
    const inCat=k=>items.filter(i=>cat(i.x)===k);
    const count=k=>inCat(k).reduce((s,i)=>s+i.n,0);
    const checks=[]; const add=(ok,label,detail)=>checks.push({ok,label,detail});
    const wl=inCat("wireless"), hh=wl.filter(i=>/handheld/i.test(i.x.t)), rx=wl.filter(i=>/receiver/i.test(i.x.t));
    const counts={
      vocalish: count("vocal") + inCat("instmic").filter(i=>/dynamic/i.test(i.x.t)).reduce((s,i)=>s+i.n,0) + hh.reduce((s,i)=>s+i.n,0),
      mics: [...inCat("vocal"),...inCat("instmic")].reduce((s,i)=>s+i.n*inputsOf(i.x),0) + hh.reduce((s,i)=>s+i.n,0),
      stereoDI: inCat("di").filter(i=>inputsOf(i.x)===2).reduce((s,i)=>s+i.n,0),
      di: inCat("di").reduce((s,i)=>s+i.n*inputsOf(i.x),0),
    };
    const have=k=>k in counts?counts[k]:count(k);
    // console
    const cons=inCat("console"), nCons=count("console");
    const C=cons.length?(CONSOLES[cons[0].x.id]||{ch:16,mix:2,dig:/digital/i.test(cons[0].x.t)}):null;
    const cname=cons.length?cons[0].x.n:"";
    const totalIn=items.reduce((s,i)=>s+i.n*inputsOf(i.x),0);
    if(!nCons) add(false,"Mixing console","No mixing console on the truck.");
    else if(nCons>1) add(false,"Mixing console",`${nCons} consoles on the truck. Send one.`);
    else {
      const need=Math.max(gig.inputs,gig.minCh||0), p=[];
      if(gig.digital && !C.dig) p.push("this gig needs a digital console so scenes can be saved");
      if(C.ch<need) p.push(`it has ${C.ch} channels and the show needs ${need}`);
      if(C.mix<gig.mixes) p.push(`it has ${C.mix} monitor mixes and the band needs ${gig.mixes}`);
      add(!p.length,"Mixing console",p.length?`${cname}: ${p.join("; ")}.`:`${cname}: ${C.ch} channels, ${C.mix} monitor mixes. Good fit.`);
      if(gig.bigConsoleWarn && C.ch>=40) add(false,"Right-sized console",`A ${C.ch}-channel console for a 70-seat trio is overkill. Any small mixer does this job.`);
    }
    add(totalIn>=gig.inputs,"Enough inputs",`${totalIn} inputs on the truck (mics, DIs, wireless channels). The show needs ${gig.inputs}.`);
    if(C && totalIn>C.ch) add(false,"Inputs fit the console",`${totalIn} inputs won't fit on a ${C.ch}-channel console.`);
    // monitors
    const wedges=Math.max(0,count("speaker")-(gig.pa==="bring"?2:0));
    const iem=inCat("iem"), p2=iem.filter(i=>/amp/i.test(i.x.t)).reduce((s,i)=>s+i.n,0);
    const tx=iem.filter(i=>/transmitter/i.test(i.x.t)).reduce((s,i)=>s+i.n,0), bp=iem.filter(i=>/receiver|bodypack/i.test(i.x.t)).reduce((s,i)=>s+i.n,0);
    const wIem=Math.min(tx,bp), dest=wedges+p2+wIem;
    add(dest>=gig.mixes,"Monitor mixes",`${dest} monitor destinations (${wedges} wedge${wedges===1?"":"s"}, ${p2} wired in-ear, ${wIem} wireless in-ear). The band needs ${gig.mixes}.`);
    if(gig.pa==="bring") add(count("speaker")>=2,"Main PA",count("speaker")>=2?`${count("speaker")} speakers: 2 as mains, the rest as wedges.`:"Bring at least 2 speakers for the mains, plus any wedges.");
    // snake / stage box
    if(gig.box || (C&&C.needsBox)){
      let cap=0, wrong=false;
      for(const i of inCat("snake")){ const f=BOX_FAM[i.x.id]; if(f && C && f!==C.fam) wrong=true; else cap+=boxCh(i.x)*i.n; }
      add(cap>=totalIn && cap>0 && !wrong,"Snake / stage box", wrong?"That digital stage box only talks to its own brand of console (A&H DX168 with the SQ-7; Midas DL32 or Behringer S16 with an M32 or X32). An analog snake works with anything.":
        cap?`${cap} stage channels for ${totalIn} inputs.${cap<totalIn?" Not enough.":""}`:"Nothing gets the stage inputs to FOH. Bring a snake or stage box.");
    }
    for(const [k,min,label] of gig.need){ const h=have(k); add(h>=min,label,`${h} on the truck, need ${min}.`); }
    if(gig.wireless){
      const fams=new Set(rx.map(i=>WL_FAM(i.x.n)));
      const ok=hh.some(i=>fams.has(WL_FAM(i.x.n)));
      add(ok,"Guest vocal wireless", ok?"Handheld and receiver are the same system.":hh.length?"The handheld needs a receiver from the same system (ULX-D with ULXD4, QLX-D with QLXD4, SLX-D with SLXD4).":"No wireless handheld for the guest.");
    }
    if(gig.iem) add(p2+wIem>=gig.iem,"In-ear mixes",`${p2+wIem} separate in-ear mixes (${p2} wired packs, ${wIem} wireless transmitter + bodypack pairs). Needs ${gig.iem}. A bodypack without its own transmitter isn't a mix.`);
    if(gig.intercom){
      const ic=inCat("intercom"), fam=n=>/C1/i.test(n)?"C1":/9S|SE Pro/i.test(n)?"SE":"";
      const bases=ic.filter(i=>/master|package/i.test(i.x.n)), packs=ic.filter(i=>/headset|remote/i.test(i.x.n)&&!/master/i.test(i.x.n));
      const ok=bases.some(b=>packs.filter(p=>fam(p.x.n)===fam(b.x.n)).reduce((s,p)=>s+p.n,0)+(/package/i.test(b.x.n)?5:0)>=gig.intercom);
      add(ok,"Crew intercom",ok?"Base station plus enough headsets from the same system.":`Needs a base station and ${gig.intercom} headsets from the same Hollyland system.`);
    }
    const names={sub:"subwoofer",linearray:"line array / column PA",fixture:"lighting fixture"};
    for(const [k,why] of gig.forbid){ const n=count(k); if(n) add(false,"Leave it at the shop",`${n} × ${names[k]||k}: ${why}`); }
    return {checks,passed:checks.filter(c=>c.ok).length,total:checks.length};
  }
  return {GIGS,grade,cat,CATS};
})();
