/* Gig mode: venues, gear roles and answer keys.
   Every rule below is a game assumption drafted from NJ_Rock_Venue_Game_Scenarios.xlsx; edit freely. */
window.GIG_DATA = (() => {
  // ---- what each shop item counts as ----
  const CONSOLES = { // audio consoles: channels, monitor mixes, digital, stage-box family
    "p02-24":{n:"Allen & Heath SQ-7",ch:48,mix:12,dig:true,fam:"ah"},
    "p19-35":{n:"Yamaha QL5",ch:64,mix:16,dig:true,fam:"yam"},
    "p11-05":{n:"Midas M32",ch:40,mix:16,dig:true,fam:"mt"},
    "p11-06":{n:"Midas M32C",ch:40,mix:16,dig:true,fam:"mt",needsBox:true},
    "p07-22":{n:"M32 Core rack",ch:40,mix:16,dig:true,fam:"mt",needsBox:true},
    "p03-11":{n:"Behringer X32C",ch:40,mix:16,dig:true,fam:"mt"},
    "p03-12":{n:"Behringer X32 Rack",ch:40,mix:16,dig:true,fam:"mt"},
    "p03-13":{n:"Behringer X32 Rack",ch:40,mix:16,dig:true,fam:"mt"},
    "p03-14":{n:"Behringer X32 Rack",ch:40,mix:16,dig:true,fam:"mt"},
    "p19-29":{n:"Yamaha DM3-D",ch:16,mix:8,dig:true,fam:"yam"},
    "p19-34":{n:"Yamaha MG16XU",ch:16,mix:4,dig:false},
    "p19-33":{n:"Yamaha MG12XU",ch:12,mix:2,dig:false},
    "p03-15":{n:"Behringer Xenyx 1204USB",ch:12,mix:2,dig:false},
    "p19-32":{n:"Yamaha MG10XU",ch:10,mix:1,dig:false},
    "p19-31":{n:"Yamaha MG06X",ch:6,mix:1,dig:false},
    "p10-19":{n:"Mackie 402",ch:4,mix:0,dig:false},
  };
  const BOXES = { // snakes / stage boxes: channels, family (null = analog, works with anything)
    "p01-15":[32,null],"p14-37":[32,null],"p01-03":[16,null],"p01-04":[16,null],
    "p01-36":[8,null],"p01-37":[8,null],"p06-32":[8,null],"p17-05":[8,null],
    "p02-23":[16,"ah"],"p11-04":[32,"mt"],"p03-10":[16,"mt"],
  };
  const R = { // roles -> {id: inputs per unit}
    vocal:{"p16-21":1,"p16-01":1,"p15-04":1,"p15-05":1,"p16-23":1,"p14-36":1},
    kick:{"p15-39":1,"p16-02":1},
    close:{"p15-02":1,"p15-06":1,"p16-20":1,"p15-40":1,"p15-24":1,"p15-03":1},
    overhead:{"p16-04":1,"p16-22":1,"p13-35":1,"p16-05":1},
    beatkit:{"p09-37":7},
    horn:{"p15-38":1,"p15-24":1,"p16-20":1,"p15-40":1},
    di:{"p13-17":1,"p13-18":1,"p10-08":1,"p05-14":1,"p10-16":1,"p13-16":2,"p13-14":2,"p13-15":2,"p19-18":2,"p12-03":2},
    stereoDI:{"p13-16":1,"p13-14":1,"p13-15":1,"p19-18":1,"p12-03":1},
    lectern:{"p16-09":1,"p05-19":1,"p15-34":1,"p16-36":1},
    rx:{"p16-31":1,"p16-28":2,"p16-29":4,"p16-12":1,"p16-16":1,"p15-16":4,"p15-09":1,"p15-10":1},
    speaker:{"p12-40":1,"p13-03":1,"p13-02":1,"p09-09":1,"p09-10":1,"p10-21":1,"p10-20":1,"p18-30":1,"p06-28":1,"p06-29":1},
    linearray:{"p09-13":1,"p09-16":1,"p09-20":1,"p09-21":1,"p13-23":1},
    sub:{"p09-17":1,"p09-18":1,"p13-05":1,"p13-08":1,"p13-09":1},
    p2:{"p03-09":1,"p03-08":1},
    iemTx:{"p15-12":1,"p15-19":1,"p15-15":1},
    iemRx:{"p15-07":1,"p15-13":1},
    fixture:{"p04-34":1,"p04-26":1,"p12-29":1,"p15-30":1,"p15-32":1,"p05-04":1,"p05-03":1},
    lightctl:{"p11-25":1,"p04-24":1,"p06-25":1,"p06-26":1,"p02-18":1,"p04-37":1,"p05-06":1},
    nx1:{"p11-25":1},
    dmx:{"p01-18":1,"p01-19":1,"p01-20":1,"p01-21":1,"p01-22":1,"p01-23":1,"p01-24":1,"p01-25":1,"p01-32":1,"p01-33":1,"p01-34":1,"p05-35":1,"p05-36":1,"p05-37":1,"p05-38":1,"p05-39":1,"p12-14":1,"p12-15":1,"p12-16":1,"p12-17":1},
    switcher:{"p03-25":1,"p03-26":1,"p03-27":1,"p13-37":1,"p13-36":1},
    playback:{"p03-28":1},
    camera:{"p03-18":1},
    sdi:{"p04-07":1,"p04-08":1,"p04-09":1,"p04-10":1,"p04-11":1,"p04-12":1,"p04-13":1,"p04-14":1,"p04-15":1},
    stand:{"p06-04":1,"p06-05":1,"p09-26":1,"p09-27":1},
  };
  const WIRELESS = { // handheld -> receivers that pair with it
    ulx:{hh:["p16-27","p16-25","p16-26"],rx:["p16-31","p16-28","p16-29"]},
    qlx:{hh:["p16-11"],rx:["p16-12"]},
    slx:{hh:["p16-15"],rx:["p16-16"]},
  };
  const INTERCOM = [
    {n:"Hollyland C1 Pro",master:"p08-22",packs:["p08-21"]},
    {n:"Hollyland Solidcom SE Pro 9S",master:"p08-25",packs:["p08-26"]},
  ];

  // ---- the 15 venues ----
  const GIGS = [
    {id:1,venue:"Lizzie Rose Music Room",town:"Tuckerton",cap:"70 seated",house:"Stage and building power. Bring a compact PA.",
     request:"Roots-rock trio: acoustic guitar, upright bass, mandolin, three vocals. Low volume, small stage.",
     pa:"bring",inputs:6,mixes:2,digital:false,box:false,
     need:[["vocal",3,"3 vocal mics"],["di",2,"2 DI channels (acoustic + bass)"],["stand",3,"3 mic stands"]],
     forbid:[["sub","Subs are overkill for a 70-seat acoustic trio."],["linearray","A line array in a 70-seat room is way too much."]],
     bigConsoleWarn:true},
    {id:2,venue:"Hamilton Stage",town:"Rahway",cap:"199 seated",house:"Main PA.",
     request:"Four-piece indie band (drums, bass, guitar, keys; 3 vocals) in a seated theater. Keep the lighting restrained.",
     pa:"house",inputs:16,mixes:4,digital:true,box:true,
     need:[["vocal",3,"3 vocal mics"],["kick",1,"a kick drum mic"],["close",3,"3 snare/tom/amp mics"],["overhead",2,"2 overheads"],["di",3,"3 DI channels (bass + stereo keys)"],["stand",10,"10 mic stands"]],
     forbid:[["linearray","The house has a main PA."],["sub","The house PA covers the low end."]]},
    {id:3,venue:"Crossroads",town:"Garwood",cap:"~200",house:"Stage and building power. Bring a compact PA.",
     request:"Three local rock bands with fast changeovers.",
     pa:"bring",inputs:16,mixes:4,digital:true,box:true,
     need:[["sub",2,"2 subs"],["vocal",3,"3 vocal mics"],["kick",1,"a kick mic"],["close",4,"4 snare/tom/amp mics"],["di",1,"a bass DI"],["stand",10,"10 mic stands"]],
     forbid:[["linearray","A flown line array is too big for a 200-cap bar. Use compact tops and subs."]],
     note:"Digital console so each band's settings can be saved as a scene."},
    {id:4,venue:"Dingbatz",town:"Clifton",cap:"~200",house:"Stage and building power. Bring a compact PA.",
     request:"Metal band: two guitars, bass, full drums, two vocals.",
     pa:"bring",inputs:14,mixes:4,digital:true,box:true,
     need:[["sub",2,"2 subs"],["kick",1,"a kick mic"],["close",5,"5 snare/tom/guitar-amp mics"],["overhead",2,"2 overheads"],["vocal",2,"2 vocal mics"],["di",1,"a bass DI"]],
     forbid:[["linearray","A line array is too big for a 200-cap club."]]},
    {id:5,venue:"Wonder Bar (indoor)",town:"Asbury Park",cap:"300–350 indoor",house:"Main PA.",
     request:"Punk double bill with a simple stage wash.",
     pa:"house",inputs:14,mixes:4,digital:false,box:true,
     need:[["vocal",3,"3 vocal mics"],["kick",1,"a kick mic"],["close",4,"4 snare/tom/amp mics"],["fixture",6,"6 wash fixtures"],["lightctl",1,"a lighting controller"],["dmx",4,"4 DMX cables"]],
     forbid:[["linearray","The house has a main PA."],["sub","The house PA covers the low end."]]},
    {id:6,venue:"Carteret PAC (Gallery config)",town:"Carteret",cap:"573",house:"Installed PA.",
     request:"Rock benefit show. A speaker opens with remarks from a lectern, then a five-piece band.",
     pa:"house",inputs:18,mixes:4,digital:true,box:true,
     need:[["lectern",1,"a lectern mic"],["vocal",3,"3 vocal mics"],["kick",1,"a kick mic"],["close",4,"4 snare/tom/amp mics"],["di",2,"2 DI channels"]],
     forbid:[["linearray","The PA is installed."],["sub","The PA is installed."]],
     note:"Digital console so the speech and the band can be separate scenes."},
    {id:7,venue:"Anchor Rock Club",town:"Atlantic City",cap:"~650",house:"Main PA.",
     request:"Alternative band wants stereo keys and five separate monitor mixes.",
     pa:"house",inputs:18,mixes:5,digital:true,box:true,
     need:[["stereoDI",1,"a stereo DI for the keys"],["vocal",3,"3 vocal mics"],["kick",1,"a kick mic"],["close",4,"4 snare/tom/amp mics"]],
     forbid:[["linearray","The house has a main PA."],["sub","The house PA covers the low end."]]},
    {id:8,venue:"White Eagle Hall",town:"Jersey City",cap:"400 seated / 800 standing",house:"Main PA.",
     request:"Six-piece band with a three-piece horn section. Wants a basic lighting look.",
     pa:"house",inputs:24,mixes:6,digital:true,box:true,
     need:[["horn",3,"3 horn mics"],["vocal",4,"4 vocal mics"],["kick",1,"a kick mic"],["close",4,"4 snare/tom/amp mics"],["fixture",6,"6 lighting fixtures"],["lightctl",1,"a lighting controller"]],
     forbid:[["linearray","The house has a main PA."],["sub","The house PA covers the low end."]]},
    {id:9,venue:"Stone Pony (indoor club)",town:"Asbury Park",cap:"~850",house:"Main PA.",
     request:"Four-band rock showcase. Every band needs its own monitor settings.",
     pa:"house",inputs:22,mixes:5,digital:true,box:true,
     need:[["vocal",4,"4 vocal mics"],["kick",1,"a kick mic"],["close",5,"5 snare/tom/amp mics"],["overhead",2,"2 overheads"],["stand",14,"14 mic stands"]],
     forbid:[["linearray","The house has a main PA."],["sub","The house PA covers the low end."]],
     note:"Four bands means saved scenes, so digital only."},
    {id:10,venue:"The Vogel",town:"Red Bank",cap:"400 seated / 984 standing",house:"Main PA.",
     request:"Rock show that was booked standing. The client just switched it to seated: 400 chairs and a revised stage plot.",
     pa:"house",inputs:16,mixes:4,digital:true,box:true,
     need:[["vocal",3,"3 vocal mics"],["kick",1,"a kick mic"],["close",4,"4 snare/tom/amp mics"],["fixture",6,"6 lighting fixtures"],["lightctl",1,"a lighting controller"]],
     forbid:[["linearray","The house has a main PA."],["sub","Seated floor: no ground-stacked subs in the aisles."]],
     twist:"Seated means no floor gear in front of the stage. Keep everything on the deck."},
    {id:11,venue:"UCPAC Main Stage",town:"Rahway",cap:"~1,334 seated",house:"Main PA and stage lighting. The video wall is provided.",
     request:"Classic-rock show with a video backdrop played from FOH.",
     pa:"house",inputs:20,mixes:5,digital:true,box:true,
     need:[["switcher",1,"a video switcher"],["playback",1,"a playback deck"],["sdi",3,"3 SDI cables"],["vocal",4,"4 vocal mics"],["kick",1,"a kick mic"],["close",4,"4 snare/tom/amp mics"]],
     forbid:[["linearray","The house has a main PA."],["sub","The house PA covers the low end."],["fixture","The house provides stage lighting."]]},
    {id:12,venue:"Count Basie Center",town:"Red Bank",cap:"1,568 seated",house:"Main PA.",
     request:"Full band plus a guest vocalist who walks on with a wireless handheld.",
     pa:"house",inputs:21,mixes:5,digital:true,box:true,wireless:1,
     need:[["vocal",4,"4 band vocal mics"],["kick",1,"a kick mic"],["close",4,"4 snare/tom/amp mics"]],
     forbid:[["linearray","The house has a main PA."],["sub","The house PA covers the low end."]]},
    {id:13,venue:"State Theatre New Jersey",town:"New Brunswick",cap:"1,811 seated",house:"Main PA. The video display is provided.",
     request:"Rock show with opening remarks, a live camera feed to the screen, and crew on headsets.",
     pa:"house",inputs:18,mixes:4,digital:true,box:true,intercom:4,
     need:[["lectern",1,"a lectern mic"],["camera",1,"a PTZ camera"],["switcher",1,"a video switcher"],["sdi",2,"2 SDI cables"],["vocal",3,"3 vocal mics"]],
     forbid:[["linearray","The house has a main PA."],["sub","The house PA covers the low end."]]},
    {id:14,venue:"Starland Ballroom",town:"Sayreville",cap:"2,000 standing (game setting)",house:"Main PA.",
     request:"Large standing rock bill with a timed lighting look.",
     pa:"house",inputs:26,mixes:6,digital:true,minCh:40,box:true,
     need:[["nx1",1,"the NX1 Onyx console for timed cues"],["fixture",12,"12 lighting fixtures"],["dmx",6,"6 DMX cables"],["vocal",4,"4 vocal mics"],["kick",1,"a kick mic"],["close",5,"5 snare/tom/amp mics"],["overhead",2,"2 overheads"]],
     forbid:[["linearray","The house has a main PA."],["sub","The house PA covers the low end."]]},
    {id:15,venue:"Wellmont Theater",town:"Montclair",cap:"~2,500",house:"Main PA.",
     request:"Headliner wants six separate in-ear mixes plus two stage wedges.",
     pa:"house",inputs:22,mixes:8,digital:true,box:true,iem:6,
     need:[["speaker",2,"2 wedges"],["vocal",3,"3 vocal mics"],["kick",1,"a kick mic"],["close",5,"5 snare/tom/amp mics"]],
     forbid:[["linearray","The house has a main PA."],["sub","The house PA covers the low end."]]},
  ];

  // ---- grading ----
  function grade(gig, pick){ // pick: {id: qty}
    const q = id => pick[id]||0;
    const sumRole = r => Object.entries(R[r]).reduce((s,[id,w])=>s+q(id)*w,0);
    const countRole = r => Object.keys(R[r]).reduce((s,id)=>s+q(id),0);
    const checks=[]; const add=(ok,label,detail)=>checks.push({ok,label,detail});

    // console
    const cons=Object.keys(CONSOLES).filter(id=>q(id)>0);
    const consQty=cons.reduce((s,id)=>s+q(id),0);
    const C=cons.length?CONSOLES[cons[0]]:null;
    // B98H horn mics are the only horn-role mics not already counted as close mics
    const totalIn=sumRole("vocal")+sumRole("kick")+sumRole("close")+sumRole("overhead")+sumRole("beatkit")+sumRole("di")+sumRole("lectern")+sumRole("rx")+q("p15-38");
    if(!consQty) add(false,"Mixing console","You didn't pull a mixing console.");
    else if(consQty>1) add(false,"Mixing console",`You pulled ${consQty} consoles. Send one.`);
    else {
      const need=Math.max(gig.inputs,gig.minCh||0);
      const probs=[];
      if(gig.digital && !C.dig) probs.push("this gig needs a digital console (saved scenes)");
      if(C.ch<need) probs.push(`${C.n} has ${C.ch} channels; this gig needs ${need}`);
      if(C.mix<gig.mixes) probs.push(`${C.n} has ${C.mix} monitor mixes; this gig needs ${gig.mixes}`);
      add(!probs.length,"Mixing console",probs.length?probs.join("; ")+".":`${C.n}: ${C.ch} channels, ${C.mix} monitor mixes. Good fit.`);
      if(gig.bigConsoleWarn && C.ch>=40) add(false,"Right-sized console",`A ${C.n} for a 70-seat trio is overkill. A small mixer does this job.`);
    }
    // inputs
    add(totalIn>=gig.inputs,"Input count",`You pulled ${totalIn} inputs (mics, DIs, wireless channels). The show needs ${gig.inputs}.`);
    if(C && totalIn>C.ch) add(false,"Inputs fit the console",`${totalIn} inputs won't fit on a ${C.ch}-channel ${C.n}.`);
    // monitors
    const wedges = sumRole("speaker") - (gig.pa==="bring"?2:0);
    const iemW = Math.min(countRole("iemTx"),countRole("iemRx"));
    const dest = Math.max(0,wedges)+countRole("p2")+iemW;
    add(dest>=gig.mixes,"Monitor mixes",`You can feed ${dest} monitor destination${dest===1?"":"s"} (${Math.max(0,wedges)} wedges, ${countRole("p2")} P2 packs, ${iemW} wireless IEM). The band needs ${gig.mixes}.`);
    // PA for bring-your-own gigs
    if(gig.pa==="bring") add(sumRole("speaker")>=2,"Main PA",sumRole("speaker")>=2?"Two tops for the mains. Good.":"You need 2 speakers for the main PA, on top of any wedges.");
    // stage box
    if(gig.box || (C&&C.needsBox)){
      let cap=0, wrong=[];
      for(const [id,[ch,fam]] of Object.entries(BOXES)) if(q(id)){ if(fam && C && fam!==C.fam) wrong.push(id); else cap+=ch*q(id); }
      const ok=cap>=totalIn && !wrong.length && cap>0;
      add(ok,"Snake / stage box", wrong.length?"That stage box doesn't talk to your console. Match the brand (A&H DX168 with SQ-7; Midas DL32 or Behringer S16 with M32/X32).":
        cap?`${cap} stage channels for ${totalIn} inputs.${cap<totalIn?" Not enough.":""}`:"Nothing gets the stage inputs to FOH. Pull a snake or stage box.");
    }
    // role requirements
    for(const [r,min,label] of gig.need){
      let have=countRole(r);
      if(r==="kick") have+=q("p09-37"); if(r==="close") have+=q("p09-37")*4; if(r==="overhead") have+=q("p09-37")*2;
      add(have>=min,label.charAt(0).toUpperCase()+label.slice(1),`${have} of ${min} pulled.`);
    }
    // wireless guest vocal
    if(gig.wireless){
      let ok=false,msg="No matched wireless handheld and receiver.";
      for(const [fam,w] of Object.entries(WIRELESS)){
        const hh=w.hh.reduce((s,id)=>s+q(id),0), rx=w.rx.reduce((s,id)=>s+q(id)*(R.rx[id]||1),0);
        if(hh&&rx){ok=true;msg="Handheld and receiver are the same system. Good.";break}
        if(hh&&!rx) msg="You pulled a wireless handheld but no receiver from the same system (ULX-D with ULXD4, QLX-D with QLXD4, SLX-D with SLXD4).";
      }
      add(ok,"Guest vocal wireless",msg);
    }
    // in-ears
    if(gig.iem){
      const p2=countRole("p2"), n=p2+iemW;
      add(n>=gig.iem,"In-ear mixes",`${n} independent in-ear mixes (${p2} wired P2, ${iemW} wireless transmitter + bodypack pairs). Needs ${gig.iem}. Bodypacks alone don't make a mix; each needs its own transmitter.`);
    }
    // intercom
    if(gig.intercom){
      let ok=false,msg="No intercom system.";
      for(const s of INTERCOM){ const m=q(s.master), p=s.packs.reduce((a,id)=>a+q(id),0);
        if(m&&p>=gig.intercom){ok=true;msg=`${s.n}: base station + ${p} headsets.`;break}
        if(m||p) msg=`${s.n} needs its base station plus ${gig.intercom} headsets from the same system.`; }
      add(ok,"Crew intercom",msg);
    }
    // forbidden
    for(const [r,why] of gig.forbid){ const n=countRole(r); if(n) add(false,"Don't bring it",`${n} × ${r==="linearray"?"line array / column PA":r==="sub"?"subwoofer":"lighting fixture"}: ${why}`); }
    const passed=checks.filter(c=>c.ok).length;
    return {checks,passed,total:checks.length,inputs:totalIn,dest};
  }
  return {GIGS,grade,CONSOLES};
})();
