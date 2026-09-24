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


  // ---- QUIZ (Easy & Medium): one decision at a time; every choice is the same kind of gear ----
  // Each question: {title, q, pool(state) -> [{x | bundle, ok, why}]}. The page samples 4 (Easy) or 8 (Medium) choices.
  const need=(g,k)=>{const r=g.need.find(n=>n[0]===k);return r?r[1]:0;};
  let SHOP=[]; const setShop=a=>{SHOP=a.filter(x=>x.q>0);};
  const inCat=(...ks)=>SHOP.filter(x=>ks.includes(cat(x)));
  const ids=(...a)=>SHOP.filter(x=>a.includes(x.id));
  const consolePass=(g,id)=>{const c=CONSOLES[id],n=Math.max(g.inputs,g.minCh||0),p=[];
    if(g.digital&&!c.dig)p.push("it's analog, and this gig needs saved scenes");
    if(c.ch<n)p.push(`only ${c.ch} channels for ${n} inputs`);
    if(c.mix<g.mixes)p.push(`only ${c.mix} monitor mix${c.mix===1?"":"es"} for ${g.mixes} needed`);
    if(g.bigConsoleWarn&&c.ch>=40)p.push("way too much console for a 70-seat trio");
    return p;};
  const T=x=>x.t.toLowerCase();
  const bundle=(items,name,ok,why)=>({bundle:items,name,ok,why});
  const speakerWhy=(x,role,g)=>{const c=cat(x),t=T(x);
    if(c==="sub") return role==="sub"?[true,"An 18-inch (or dual-12) sub carries the low end under the tops."]:[false,"A sub only plays low end. Vocals and guitars would disappear."];
    if(c==="linearray") return [false,role==="wedge"?"Line array and column boxes are built to fly or stack for an audience, not to lie on a stage.":"A line array/column system is too much PA for this room."];
    if(x.id==="p19-30") return [false,"A studio monitor. It's for mixing in a studio and can't get loud enough for a show."];
    if(role==="sub") return [false,"A full-range top can't make the deep low end a sub does."];
    if(x.id==="p10-20") return g.bigConsoleWarn&&role==="wedge"?[true,"A small personal monitor is fine for a quiet acoustic trio."]:[false,"A 5-inch personal monitor. Too small for this job."];
    return [true,role==="wedge"?"A powered speaker laid on its side makes a good wedge.":"A compact powered top on a stand is the right size for this room."];};
  const speakerPool=()=>[...inCat("speaker","sub","linearray"),...ids("p19-30")];
  function questions(g){
    const V=need(g,"vocalish")||3, M=need(g,"mics"), I=g.inputs;
    const D=need(g,"stereoDI")?2:need(g,"di"), band=Math.max(0,M-V,I-V-D-(need(g,"speech")?1:0)-(g.wireless?1:0));
    const Q=[];
    Q.push({title:"Mixing console",q:`${I}+ inputs and ${g.mixes} monitor mixes${g.digital?", with saved scenes":""}. Which console?`,
      pool:()=>SHOP.filter(x=>CONSOLES[x.id]).map(x=>{const p=consolePass(g,x.id),c=CONSOLES[x.id];
        return {x,ok:!p.length,why:p.length?`Not this one: ${p.join("; ")}.`:`${c.ch} channels and ${c.mix} monitor mixes${c.dig?", digital with scenes":""}. It covers the show.`}}),key:"console"});
    if(g.pa==="bring") Q.push({title:"Main PA",q:"The venue has no PA. Which speakers go up as the mains?",pool:()=>speakerPool().map(x=>{const [ok,why]=speakerWhy(x,"main",g);return {x,ok,why}})});
    if(need(g,"sub")) Q.push({title:"Subwoofers",q:`${need(g,"sub")} subs for real low end. Which speaker?`,pool:()=>speakerPool().map(x=>{const [ok,why]=speakerWhy(x,"sub",g);return {x,ok,why}})});
    if(g.iem) Q.push({title:"In-ear monitors",q:`The headliner wants ${g.iem} separate in-ear mixes. What do you pull?`,pool:()=>[
      ...ids("p03-09","p03-08").map(x=>({x,ok:true,why:"A wired belt pack. Each one gets its own mix from the console."})),
      ...ids("p15-07","p15-13").map(x=>({x,ok:false,why:"A bodypack receiver alone. With no transmitter, there's no mix to hear."})),
      ...ids("p15-12","p15-19","p15-15").map(x=>({x,ok:false,why:"A transmitter alone. Nobody wears it; each performer needs a bodypack too."})),
      bundle({"p15-12":g.iem,"p15-07":g.iem},`${g.iem} × SR IEM G4 transmitter + ${g.iem} × EK IEM G4 bodypack`,true,"Transmitter and bodypack pairs: one wireless mix per performer."),
      ...ids("p13-39").map(x=>({x,ok:false,why:"One headphone amp. It can't give six people six mixes."}))]});
    const wedges=g.iem?2:g.mixes;
    Q.push({title:"Stage wedges",q:`${wedges} wedge${wedges>1?"s":""} on stage. Which speaker?`,pool:()=>speakerPool().map(x=>{const [ok,why]=speakerWhy(x,"wedge",g);return {x,ok,why}})});
    const micPool=(ex)=>[...inCat("vocal","instmic","speech")].filter(x=>!ex(x));
    const micWhy=x=>{const t=T(x);
      if(/lav/.test(t)) return "A lavalier: for speech and theater, clipped to clothing.";
      if(/earset|headset/.test(t)) return "A headworn mic for presenters and fitness instructors.";
      if(/lectern/.test(t)) return "A gooseneck lectern mic for speeches.";
      if(/boundary/.test(t)) return x.id==="p05-19"?"A boundary mic for lecterns and tables.":"A boundary mic that goes inside a kick drum.";
      if(/hanging/.test(t)) return "A hanging choir mic.";
      if(/kick/.test(t)) return "A kick drum mic: big, low-end focused.";
      if(/drum mic kit/.test(t)) return "A whole drum mic kit.";
      if(/drum|clip-on/.test(t)) return "A clip-on drum mic for toms and snare.";
      if(/condenser/.test(t)) return x.id==="p16-05"?"A large studio condenser. It's fragile and feeds back on a loud stage.":"A pencil condenser for overheads and acoustic instruments.";
      if(/vocal/.test(t)) return "A handheld vocal mic.";
      return "An instrument mic for amps, snare and horns.";};
    Q.push({title:"Vocal mics",q:`${V} singers. Which mic?`,pool:()=>micPool(x=>/instrument|dynamic/i.test(x.t)&&x.id!=="p14-36"||/earset|headset/i.test(x.t)).map(x=>{
      const ok=cat(x)==="vocal"||x.id==="p14-36"; return {x,ok,why:ok?"A handheld vocal mic: rugged, and it rejects feedback from the wedges.":micWhy(x)+" Not for rock vocals."}})});
    if(band) Q.push({title:"Drum & amp mics",q:g.bigConsoleWarn?"One more mic for the mandolin. Which mic?":`${band} more mics for drums, amps${need(g,"mics")>=13?" and horns":""}. Which mic?`,pool:()=>micPool(x=>cat(x)==="vocal"||x.id==="p16-05"||x.id==="p14-36").map(x=>{
      const t=T(x), ok=/instrument|drum|kick|clip-on|dynamic|condenser|boundary/.test(t)&&!/hanging/.test(t)&&x.id!=="p05-19";
      return {x,ok,why:ok?micWhy(x)+" Right for the band.":micWhy(x)+" Wrong mic for drums and amps."}})});
    if(need(g,"stereoDI")) Q.push({title:"Keys DI",q:"The keyboard player runs stereo. Which box?",pool:()=>[...inCat("di"),...ids("p03-09","p13-39","p19-19","p12-37")].map(x=>{
      const st=cat(x)==="di"&&inputsOf(x)===2; return {x,ok:st,why:cat(x)!=="di"?diWhy(x):st?"Two channels: one for left, one for right.":"A mono DI. You'd lose one side of the keys."}})});
    else if(need(g,"di")) Q.push({title:"DI boxes",q:`${need(g,"di")} DI channel${need(g,"di")>1?"s":""} for bass, acoustic or keys. Which box?`,pool:()=>[...inCat("di"),...ids("p03-09","p13-39","p19-19","p12-37")].map(x=>(
      {x,ok:cat(x)==="di",why:cat(x)==="di"?"A DI turns an instrument signal into a balanced mic-level line for the snake.":diWhy(x)}))});
    if(g.box) Q.push({title:"Snake / stage box",q:`${I} inputs have to get from the stage to FOH. Which one?`,pool:st=>inCat("snake").map(x=>{
      const ch=boxCh(x), f=BOX_FAM[x.id], con=st.console&&CONSOLES[st.console];
      if(/press box/i.test(x.n)) return {x,ok:false,why:"A press box splits one feed out to reporters' recorders."};
      if(f && (!con||con.fam!==f)) return {x,ok:false,why:`A digital stage box that only talks to ${f==="ah"?"Allen & Heath (SQ-7)":"Midas/Behringer (M32, X32)"} consoles, and that's not your console.`};
      if(ch<I) return {x,ok:false,why:`Only ${ch} channels for ${I} inputs.`};
      return {x,ok:true,why:f?`${ch} channels and it matches your console.`:`${ch} channels. An analog snake works with any console.`}})});
    const cablePool=()=>[...inCat("cable","dmx","sdi"),...ids("p11-38","p11-39")].filter(x=>!/ramp|security|safety|drum/i.test(x.t)&&!/Starlink|Apple/i.test(x.n));
    const cableWhy=x=>{const t=T(x),n=x.n.toLowerCase();
      if(/dmx|combo/.test(t)) return "A DMX lighting data cable. It looks like XLR but is built for 110-ohm data.";
      if(/sdi|bnc/.test(t)||/barrel/.test(n)||/adapter/.test(t)) return /barrel/.test(n)?"A barrel joins two video cables; it isn't a cable.":"An SDI/BNC video cable.";
      if(/hdmi|video|display/.test(t+n)) return "A video cable.";
      if(/network|ethercon|cat/.test(t+n)) return "A network cable (Cat5/Cat6).";
      if(/power|cord|extension/.test(t)) return "A power cable.";
      if(/speaker/.test(t)) return "A speaker cable for passive speakers.";
      if(/multicore|breakout/.test(t)) return "Soca: a multi-circuit lighting power cable.";
      if(/usb/.test(t)) return "A USB cable.";
      if(/loom/.test(t)) return "A power + signal loom made for the JBL SRX boxes.";
      if(/1\/8|3\.5|rca|trs/.test(n)) return "An adapter cable for laptops, phones and playback.";
      if(/instrument|patch|1\/4/.test(t+n)) return "An unbalanced instrument cable for guitars and pedals.";
      if(/microphone cable|xlr/.test(t+n)) return "An XLR mic cable.";
      return "Not a mic cable.";};
    Q.push({title:"Cables",q:`About ${I+g.mixes} runs for mics, DIs and wedges. Which cable?`,pool:()=>cablePool().map(x=>{const ok=/microphone cable/i.test(x.t);return {x,ok,why:ok?"XLR mic cable: carries every mic, DI and wedge line.":cableWhy(x)}})});
    if(need(g,"stand")) Q.push({title:"Mic stands",q:`${need(g,"stand")} mics need stands. Which stand?`,pool:()=>[...inCat("stand"),...ids("p04-21","p11-29","p09-02")].map(x=>{
      const t=T(x), desk=x.id==="p05-30", ok=/mic stand/.test(t)&&!desk;
      return {x,ok,why:ok?"A floor mic stand for vocals, drums and amps.":desk?"A desktop stand is for tables and lecterns.":/pole/.test(t)?"A speaker pole goes between a sub and a top.":/speaker/.test(t)?"A speaker stand.":"A lighting stand."}})});
    if(need(g,"speech")) Q.push({title:"Lectern mic",q:"Someone gives opening remarks at a lectern. Which mic?",pool:()=>micPool(x=>cat(x)==="vocal"||/condenser|hanging/i.test(x.t)).map(x=>{
      const t=T(x), ok=cat(x)==="speech"; return {x,ok,why:ok?(/lectern|boundary/.test(t)?"Built for a lectern: it sits on the desk and follows the talker.":micWhy(x)+" Works if the speaker will wear it."):micWhy(x)+" Wrong mic for a speech."}})});
    if(g.wireless) Q.push({title:"Guest vocal wireless",q:"The guest walks on with a wireless handheld. What do you pull?",pool:()=>[
      bundle({"p16-27":1,"p16-31":1},"ULXD2/SM58 handheld + ULXD4 receiver",true,"Same system (ULX-D). They talk."),
      bundle({"p16-11":1,"p16-12":1},"QLXD2/SM58 handheld + QLXD4 receiver",true,"Same system (QLX-D). They talk."),
      bundle({"p16-15":1,"p16-16":1},"SLXD2/SM58 handheld + SLXD4 receiver",true,"Same system (SLX-D). They talk."),
      bundle({"p16-27":1,"p16-12":1},"ULXD2/SM58 handheld + QLXD4 receiver",false,"A ULX-D handheld won't talk to a QLX-D receiver."),
      bundle({"p16-15":1},"SLXD2/SM58 handheld only",false,"A handheld without a receiver goes nowhere."),
      bundle({"p16-31":1},"ULXD4 receiver only",false,"A receiver with nothing to receive."),
      bundle({"p15-17":1,"p15-16":1},"EW-DX SK bodypack + EW-DX EM 4 receiver",false,"That's a bodypack for a lav, not a handheld."),
      bundle({"p16-14":1,"p16-16":1},"SLXD1 bodypack + SLXD4 receiver",false,"A bodypack. The guest needs a handheld."),
      bundle({"p13-29":1},"RF Venue DISTRO4 antenna distro",false,"Antenna distribution. It feeds receivers; it isn't a mic.")]});
    const lightPool=()=>[...inCat("fixture"),...ids("p03-21","p14-33","p11-13","p02-37","p10-07","p11-08")];
    if(need(g,"fixture")) Q.push({title:"Lights",q:`${need(g,"fixture")} lights for a stage wash. Which fixture?`,pool:()=>lightPool().map(x=>{const t=T(x);
      const ok=/\bpar\b|lighting kit|wash|uplight/.test(t);
      const why=ok?"A color-mixing wash light on DMX. Right for a stage wash.":/strobe|blinder|pixel/.test(t)?"An effect light (strobe or pixel bar). It isn't a wash.":/followspot/.test(t)?"A followspot needs an operator and lights one person.":
        /ellipsoidal/.test(t)?"An ellipsoidal throws a hard-edged spot for specials, not a wash.":/profile/.test(t)?"A moving profile for beams and gobos, not an even wash.":/string/.test(t)?"Decorative string lights.":/balloon/.test(t)?"A balloon work light.":
        /nanlite/i.test(x.n)?"A video/photo light.":/tube/.test(t)?"An LED pixel tube for effects and decor.":"A small task light for a desk or music stand.";return {x,ok,why}})});
    if(need(g,"lightctl")){ const cue=need(g,"fixture")>=12;
      Q.push({title:"Lighting control",q:cue?"The show has a timed lighting look. What runs it?":"What runs the lights?",pool:()=>[...inCat("lightctl"),...ids("p04-22","p04-38","p11-24","p11-26","p04-23","p06-24","p11-27")].filter(x=>!x.sub).map(x=>{
        const c=cat(x)==="lightctl", nx=x.id==="p11-25", ok=c&&(!cue||nx);
        const why=nx?"The NX1 runs ONYX: cue lists, timed fades and looks.":c?(cue?"A basic controller with no real cue list or timing for a big show.":/usb/i.test(x.t)?"Runs lights from a laptop with ShowXpress.":"A DMX controller. Plenty for a wash."):
          /splitter/i.test(x.t)?"A DMX splitter. It splits data; it doesn't create it.":/node/i.test(x.t)?"A DMX node converts network to DMX. It still needs a console or computer.":/dimmer/i.test(x.t)?"A dimmer pack powers conventional lights; it doesn't program them.":/control surface/i.test(x.t)?"Extra buttons for ONYX. Not a console on its own.":"Wireless DMX. It replaces a cable, not a console.";
        return {x,ok,why}})}); }
    if(need(g,"dmx")) Q.push({title:"Lighting cables",q:`${need(g,"dmx")} runs of lighting control. Which cable?`,pool:()=>cablePool().map(x=>{const ok=/dmx|combo/i.test(x.t);return {x,ok,why:ok?"DMX cable, daisy-chained light to light.":/microphone cable/i.test(x.t)?"XLR mic cable. It often works for a while, then DMX glitches. Use real DMX cable.":cableWhy(x)}})});
    const videoPool=()=>[...inCat("switcher","camera","playback"),...ids("p03-26","p03-29","p05-27","p05-28","p10-22","p10-05","p03-19","p06-23","p11-22","p10-25")];
    const videoWhy=x=>{const t=T(x);return /switcher|mixer/.test(t)?"A video switcher.":/camera$/.test(t)?"A PTZ camera.":/recorder/.test(t)?"A video recorder/player.":/converter|scaler/.test(t)?"A converter. It changes formats but doesn't switch.":
      /capture/.test(t)?"A capture device that brings video into a computer.":/monitor/.test(t)?"A field monitor. It only displays.":/controller/.test(t)?"A PTZ controller. It moves cameras; it isn't one.":/tripod/.test(t)?"A tripod.":/processor/.test(t)?"An LED wall processor.":"Video gear.";};
    if(need(g,"switcher")) Q.push({title:"Video switcher",q:"What switches the video sources to the screen?",pool:()=>videoPool().map(x=>{const ok=/switcher|stream switcher/i.test(x.t);return {x,ok,why:ok?"A production switcher cuts between sources.":videoWhy(x)}})});
    if(need(g,"playback")) Q.push({title:"Playback",q:"The backdrop video plays from FOH. What plays it?",pool:()=>videoPool().map(x=>{const ok=cat(x)==="playback";return {x,ok,why:ok?"The HyperDeck plays clips out over SDI.":videoWhy(x)}})});
    if(need(g,"camera")) Q.push({title:"Camera",q:"The client wants a live camera feed. What do you pull?",pool:()=>videoPool().map(x=>{const ok=cat(x)==="camera";return {x,ok,why:ok?"A PTZ camera, driven remotely from FOH.":videoWhy(x)}})});
    if(need(g,"sdi")) Q.push({title:"Video cables",q:`${need(g,"sdi")} long video runs. Which cable?`,pool:()=>cablePool().map(x=>{const ok=cat(x)==="sdi";return {x,ok,why:ok?"SDI over BNC runs long distances with a locking connector.":cableWhy(x)}})});
    if(g.intercom) Q.push({title:"Crew intercom",q:`${g.intercom} crew need headsets. What do you pull?`,pool:()=>[
      bundle({"p08-22":1,"p08-21":g.intercom},`C1 Pro base station + ${g.intercom} C1 Pro headsets`,true,"One system: base station plus its headsets."),
      bundle({"p08-25":1,"p08-26":g.intercom},`SE Pro 9S base station + ${g.intercom} SE Pro headsets`,true,"One system: base station plus its headsets."),
      bundle({"p08-21":g.intercom},`${g.intercom} C1 Pro headsets, no base`,false,"Headsets without a base station can't talk to each other."),
      bundle({"p08-25":1,"p08-21":g.intercom},`SE Pro 9S base + ${g.intercom} C1 Pro headsets`,false,"Mixed systems. An SE Pro base won't pair with C1 Pro headsets."),
      bundle({"p08-19":1},"C1 battery charging case",false,"A charger, not an intercom."),
      bundle({"p08-16":g.intercom},`${g.intercom} C1 Pro batteries`,false,"Batteries, not headsets.")]});
    return Q;
  }
  const diWhy=x=>/in-ear/i.test(x.t)?"A P2 is an in-ear monitor pack, not a DI.":/headphone/i.test(x.t)?"A headphone amp, not a DI.":/ground/i.test(x.t)?"A ground lifter kills hum on a line that's already balanced. It doesn't convert an instrument.":"A press box splits one feed to reporters.";
  // ---- MEDIUM: only the categories this gig touches, plus a checklist ----
  function mediumCats(g){
    const s=new Set(["console","vocal","instmic","cable","speaker","iem","linearray","display"]);
    if(g.box) s.add("snake"); if(g.pa==="bring"||need(g,"sub")) s.add("sub");
    const map={vocalish:"vocal",mics:"instmic",stereoDI:"di"};
    g.need.forEach(([k])=>s.add(map[k]||k)); if(g.wireless) s.add("wireless"); if(g.intercom) s.add("intercom");
    g.forbid.forEach(([k])=>s.add(k)); if(s.has("fixture")) s.add("lightctl");
    return CATS.map(c=>c[0]).filter(k=>s.has(k));
  }
  function checklist(g){
    const L=[`Console with ${Math.max(g.inputs,g.minCh||0)}+ channels and ${g.mixes} monitor mixes${g.digital?" (digital)":""}`,`${g.inputs} inputs total`,`${g.mixes} monitor mixes`];
    if(g.pa==="bring") L.push("2 speakers for the mains"); if(g.box) L.push("A snake or stage box for every input");
    g.need.forEach(([,n,l])=>L.push(`${l}: ${n}`)); if(g.wireless) L.push("Wireless handheld + matching receiver");
    if(g.iem) L.push(`${g.iem} separate in-ear mixes`); if(g.intercom) L.push(`Intercom base + ${g.intercom} headsets`);
    return L;
  }

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
  return {GIGS,grade,cat,CATS,questions,setShop,mediumCats,checklist};
})();
