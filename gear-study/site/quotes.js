/* Quote mode: client calls, a rental rate card, and quote grading.
   Day rates are anchored to published rental rate sheets (Audioquip, RAAV, AV For You, Crossfire Pro AV,
   Audio Design Rentals) and scaled from each item's new price. Real NJ rental houses vary about ±30%. */
window.QUOTE_DATA = (() => {
  const GD = window.GIG_DATA;
  let SHOP = [], BY = {};

  // ---------- rate card ----------
  const TV = {55:175, 60:200, 65:250, 70:300, 75:350, 85:500};
  const r5 = v => v < 20 ? Math.max(3, Math.round(v)) : Math.round(v/5)*5;
  function rate(x){
    const n = x.n, c = GD.cat(x), p = x.p;
    const size = (n.match(/(\d\d)"/)||[])[1];
    if(c === "display" && size) return TV[size] || 250;
    if(c === "display") return 125;                                   // projectors
    if(/Projection Screen/.test(n)) return 200;
    if(/Podium/.test(n)) return 100;
    if(/Velour Drape Panel/.test(n)) return 15;
    if(/Drape|Upright|Base Plate|Crossbar|Schedule 40|Metal Pipe/.test(n)) return 5;
    if(/TV Floor Stand|Confidence Monitor Stand/.test(n)) return 40;
    if(/TV Mounting Bracket/.test(n)) return 10;
    if(c === "cable" || c === "dmx" || c === "sdi"){
      if(/Cable Ramp/.test(n)) return 10;
      return /100|150|200|328|125/.test(n) ? 8 : c === "sdi" ? 5 : 4;
    }
    if(p != null){
      if(c === "console") return r5(p * (p < 1000 ? .08 : p < 3000 ? .06 : p < 10000 ? .045 : .035));
      if(c === "wireless" && p > 2500) return r5(p * .025);           // multi-channel receivers
      if(c === "snake") return r5(p * .04);
      return r5(p * (p < 150 ? .12 : p < 600 ? .08 : p < 2500 ? .055 : .04));
    }
    const D = {speech:20, wireless:/Receiver/.test(n)?60:/Bodypack|Transmitter/.test(n)?35:15, fixture:30, lightctl:40,
      snake:/DL32/.test(n)?150:40, speaker:40, sub:60, stand:10, iem:35, intercom:/Package/.test(n)?120:25, console:60,
      instmic:15, vocal:10, di:15, camera:120, switcher:100, playback:60, power:25, linearray:150};
    if(D[c] != null) return D[c];
    if(/Laptop|MacBook|ThinkPad/.test(n)) return 75;
    if(/iPad/.test(n)) return 35;
    if(/Table/.test(n)) return 15;
    return 10;
  }
  const LABOR = [
    ["a1","A1 audio engineer",85],["av","A/V tech",65],["ld","Lighting operator",85],["vo","Video / camera operator",85],["hand","Stagehand",50],
  ];
  const DELIVERY = 300;              // local NJ box truck, delivery + pickup
  const MIN_HRS = 4;                 // per person, per day
  const dayFactor = d => 1 + .5*(d-1);   // day 1 full, each extra day half

  // ---------- what counts as what ----------
  const rxCh = x => /4Q|EM 4/.test(x.n) ? 4 : /4D|Dual/.test(x.n) ? 2 : 1;
  const IS = {
    mains:   [x => /speaker|linearray/.test(GD.cat(x)), "Main speakers"],
    wedge:   [x => GD.cat(x)==="speaker", "Speakers (mains + wedges)"],
    linearray:[x => GD.cat(x)==="linearray", "Line array boxes"],
    sub:     [x => GD.cat(x)==="sub", "Subwoofers"],
    console: [x => GD.cat(x)==="console", "Mixing console"],
    hh:      [x => GD.cat(x)==="wireless" && /ULXD2|QLXD2|SLXD2|Handheld/.test(x.n), "Wireless handhelds"],
    pack:    [x => GD.cat(x)==="wireless" && /Bodypack|ULXD1|SLXD1/.test(x.n), "Wireless bodypacks"],
    lav:     [x => GD.cat(x)==="speech" && /Lavalier|Earset|Headworn|Headset/.test(x.n), "Lav or headset mics for the packs"],
    lectern: [x => GD.cat(x)==="speech" && /Lectern|Gooseneck/.test(x.n), "Lectern mic"],
    podium:  [x => /Podium/.test(x.n), "Podium"],
    tv55:    [x => GD.cat(x)==="display" && +((x.n.match(/(\d\d)"/)||[])[1]||0) >= 55, 'TVs 55" or bigger'],
    tv65:    [x => GD.cat(x)==="display" && +((x.n.match(/(\d\d)"/)||[])[1]||0) >= 65, 'TVs 65" or bigger'],
    tv70:    [x => GD.cat(x)==="display" && +((x.n.match(/(\d\d)"/)||[])[1]||0) >= 70, 'TVs 70" or bigger'],
    tvstand: [x => /TV Floor Stand/.test(x.n), "TV floor stands"],
    projector:[x => GD.cat(x)==="display" && /Projector/.test(x.n), "Projector"],
    screen:  [x => /Projection Screen/.test(x.n), "Projection screen"],
    uplight: [x => GD.cat(x)==="fixture" && /Freedom Par|SlimPar|Wedge Tri|Burst/.test(x.n), "Uplights"],
    lightctl:[x => GD.cat(x)==="lightctl", "Lighting control"],
    dmx:     [x => GD.cat(x)==="dmx", "DMX cables"],
    camera:  [x => GD.cat(x)==="camera", "Cameras"],
    switcher:[x => GD.cat(x)==="switcher", "Video switcher"],
    sdi:     [x => GD.cat(x)==="sdi", "SDI cables"],
    intercom:[x => GD.cat(x)==="intercom", "Intercom"],
    stereodi:[x => GD.cat(x)==="di" && /Stereo|ProAV2|ProD2|USB-P|DIRECT2/.test(x.n), "Stereo DI for laptop or keys"],
    di:      [x => GD.cat(x)==="di", "DI boxes"],
    vocal:   [x => GD.cat(x)==="vocal", "Vocal mics"],
    instmic: [x => GD.cat(x)==="instmic", "Drum & amp mics"],
    micstand:[x => GD.cat(x)==="stand" && /Microphone Stand/.test(x.n), "Mic stands"],
    spkstand:[x => GD.cat(x)==="stand" && /Speaker Stand|SS8000/.test(x.n), "Speaker stands"],
    xlr:     [x => /25' XLR/.test(x.n), "XLR cables"],
    gen:     [x => GD.cat(x)==="power" && /Generator/.test(x.n), "Generator"],
  };

  // ---------- the calls ----------
  // need: [key, n, why]; labor: [role, people, hours per day]; ref: the shop's own quote [id, qty]
  const CALLS = [
    {id:1, who:"Dana, HR events", org:"a pharma company", town:"New Brunswick", room:"Hotel ballroom", ppl:400, days:1,
     call:"Hey, we're doing a town hall for about 400 employees. Our CEO talks from a podium, then there's Q&A with a couple of mics in the audience. We want TVs on both sides of the stage so the back of the room can see the slides. What would that run us?",
     need:[["mains",4,"400 people in a flat ballroom: four tops on stands, two front and two delays."],["spkstand",4,"Every top needs a stand."],["console",1,"Something has to mix the lectern, wireless and laptop."],["lectern",1,"The CEO talks from a podium."],["podium",1,"They asked for a podium."],["hh",2,"Two audience Q&A mics."],["rxch",2,"Each handheld needs a receiver channel."],["tv65",2,"Back of a 400-person room: 65\" minimum."],["tvstand",2,"The TVs need floor stands."],["stereodi",1,"Laptop audio for the slide deck."],["xlr",8,"Cable runs to the speakers and lectern."]],
     labor:[["a1",1,8],["av",1,8],["hand",2,4]],
     ref:[["p13-03",4],["p18-37",4],["p03-12",1],["p16-09",1],["p10-17",1],["p16-27",2],["p16-28",1],["p14-09",2],["p12-26",2],["p13-15",1],["p01-09",10]]},
    {id:2, who:"Maria, the bride", org:"a wedding", town:"Asbury Park", room:"Reception hall", ppl:150, days:1,
     call:"Hi! Our DJ has the music covered, but the hall is pretty dark. Can you do uplighting around the room, like 16 lights? Also one wireless mic for toasts that plugs into the DJ, and a TV for a photo slideshow at cocktail hour.",
     need:[["uplight",16,"She asked for 16 uplights."],["hh",1,"One toast mic."],["rxch",1,"The toast mic needs a receiver to plug into the DJ."],["tv55",1,"One TV for the slideshow."],["tvstand",1,"The TV needs a stand."],["xlr",1,"Receiver to the DJ mixer."]],
     labor:[["av",1,5],["hand",1,4]],
     ref:[["p04-26",16],["p16-15",1],["p16-16",1],["p18-05",1],["p12-26",1],["p01-09",1]]},
    {id:3, who:"Mr. Alvarez, vice principal", org:"a high school", town:"Toms River", room:"Football field, outdoors", ppl:800, days:1,
     call:"We need sound for graduation on the football field. About 800 people in the stands. Speeches from a podium, two wireless mics for the class president and the reader, and walk-in music from a laptop. There's no power out on the field.",
     need:[["linearray",4,"800 people outdoors needs real throw: line array boxes, not party tops."],["console",1,"Mix the speeches and walk-in music."],["lectern",1,"Speeches from a podium."],["podium",1,"They need a podium on the field."],["hh",2,"Class president and reader."],["rxch",2,"Receiver channels for both handhelds."],["gen",1,"No power on the field."],["stereodi",1,"Walk-in music from a laptop."],["xlr",10,"Long runs from the console to the PA."]],
     labor:[["a1",1,6],["hand",2,6]],
     ref:[["p09-13",4],["p09-11",2],["p09-17",2],["p19-29",1],["p16-09",1],["p10-17",1],["p16-27",2],["p16-28",1],["p08-28",1],["p13-15",1],["p01-09",12]]},
    {id:4, who:"Priya, comms director", org:"a university think tank", town:"Princeton", room:"Lecture hall", ppl:120, days:1,
     call:"We're hosting a panel: a moderator and four speakers on stage, and we're livestreaming it. We need everyone mic'd, a mic for audience questions, two cameras, and a screen up front for slides.",
     need:[["mains",2,"120 people: a pair of tops is plenty."],["spkstand",2,"Stands for the tops."],["console",1,"Mix five panel mics, Q&A and a stream feed."],["pack",5,"Moderator plus four panelists, hands free."],["lav",5,"Each pack needs a lav."],["hh",1,"Audience Q&A mic."],["rxch",6,"One receiver channel per transmitter."],["camera",2,"They asked for two cameras."],["switcher",1,"Cut between cameras for the stream."],["sdi",2,"Camera runs to the switcher."],["tv55",1,"Screen up front for slides."],["tvstand",1,"Stand for that screen."],["stereodi",1,"Laptop audio."]],
     labor:[["a1",1,8],["vo",1,8],["hand",1,4]],
     ref:[["p12-40",2],["p18-37",2],["p19-29",1],["p16-24",5],["p16-39",5],["p16-27",1],["p16-29",1],["p16-28",1],["p03-18",2],["p03-27",1],["p04-12",2],["p14-09",1],["p12-26",1],["p13-15",1],["p01-09",6]]},
    {id:5, who:"Sal, owner", org:"a brewery", town:"Jersey City", room:"Taproom", ppl:180, days:1,
     call:"I've got a four-piece band Saturday: drums, bass, guitar, keys, three of them sing. Our room holds 180. I need the whole thing, PA and monitors and mics. Ballpark?",
     need:[["wedge",5,"Two mains plus three monitor wedges."],["sub",2,"A band with drums needs low end."],["console",1,"Mix the band."],["vocal",3,"Three singers."],["instmic",4,"Kick, snare, overhead and guitar amp at least."],["di",2,"Bass and keys go direct."],["stereodi",1,"Keys are stereo."],["micstand",7,"Three vocal stands plus the instrument mics."],["spkstand",2,"The mains go on stands (or sub poles)."],["xlr",14,"Every mic and wedge needs a cable."]],
     labor:[["a1",1,6]],
     ref:[["p13-03",2],["p10-21",3],["p13-09",2],["p03-12",1],["p16-21",3],["p15-39",1],["p15-40",2],["p13-35",2],["p13-17",1],["p13-16",1],["p06-05",7],["p18-37",2],["p01-09",16]]},
    {id:6, who:"Jordan, marketing", org:"a sneaker brand", town:"Hoboken", room:"Loft event space", ppl:250, days:2,
     call:"Product launch, two days. We want four big TVs, like 70 inches or more, around the room looping the video. Two presenters in headset mics, one handheld for a guest, music, and some color on the walls. Maybe 12 lights?",
     need:[["tv70",4,"Four TVs, 70\" or bigger."],["tvstand",4,"Floor stands for all four."],["pack",2,"Two presenters, hands free."],["lav",2,"Headset mics for the packs."],["hh",1,"One guest handheld."],["rxch",3,"A channel for every transmitter."],["mains",2,"A pair of tops for 250."],["spkstand",2,"Stands for the tops."],["sub",1,"Music for a launch wants some low end."],["uplight",12,"12 wall lights."],["console",1,"Mix mics and music."],["stereodi",1,"Music from a laptop."]],
     labor:[["a1",1,8],["av",1,8],["hand",2,4]],
     ref:[["p14-11",2],["p14-12",2],["p12-26",4],["p16-24",2],["p16-19",2],["p16-27",1],["p16-29",1],["p12-40",2],["p18-37",2],["p13-05",1],["p02-13",12],["p19-29",1],["p13-15",1]]},
    {id:7, who:"Pastor Reggie", org:"a church conference", town:"Atlantic City", room:"Convention hall", ppl:600, days:3,
     call:"Three-day conference, 600 people. Worship band each morning, then speakers. We'll need handhelds for the band's singers, headsets for the speakers, a projector and big screen for lyrics, some lighting, and the team needs to talk to each other.",
     need:[["mains",4,"600 people: four mains at minimum."],["sub",2,"A worship band needs subs."],["console",1,"Band plus speakers: a real digital desk."],["hh",4,"Four singers."],["pack",2,"Two speakers in headsets."],["lav",2,"Headsets for the packs."],["rxch",6,"A channel for every transmitter."],["projector",1,"Lyrics on a big screen."],["screen",1,"Something to project on."],["uplight",12,"Stage and wall color."],["lightctl",1,"Someone runs the lights."],["dmx",8,"Cable the lights."],["intercom",1,"The team talks to each other."],["stereodi",1,"Laptop for lyrics and walk-in."]],
     labor:[["a1",1,10],["ld",1,10],["av",1,10],["hand",2,4]],
     ref:[["p09-10",4],["p18-37",4],["p09-17",2],["p02-24",1],["p16-27",4],["p16-24",2],["p16-19",2],["p16-29",1],["p16-28",1],["p19-08",1],["p17-33",1],["p04-34",12],["p02-17",1],["p01-21",12],["p08-20",1],["p13-15",1],["p01-09",12]]},
    {id:8, who:"Evelyn, gala chair", org:"a hospital foundation", town:"Morristown", room:"Estate ballroom", ppl:300, days:1,
     call:"Our gala is 300 guests. We want the room washed in color, about 30 uplights. Speeches from a podium, two wireless for the auctioneer and emcee, and two TVs showing the donor video.",
     need:[["uplight",30,"About 30 uplights."],["lectern",1,"Speeches from a podium."],["podium",1,"They need a podium."],["hh",2,"Auctioneer and emcee."],["rxch",2,"A channel for each handheld."],["mains",2,"A pair of tops for 300 seated."],["spkstand",2,"Stands for the tops."],["console",1,"Mix it all."],["tv65",2,"Two TVs for the donor video, 65\" or bigger."],["tvstand",2,"Stands for the TVs."],["stereodi",1,"Video audio from a laptop."]],
     labor:[["a1",1,8],["av",1,8],["hand",2,4]],
     ref:[["p04-26",20],["p02-13",10],["p16-09",1],["p10-17",1],["p16-27",2],["p16-28",1],["p13-03",2],["p18-37",2],["p19-33",1],["p14-09",2],["p12-26",2],["p13-15",1],["p01-09",6]]},
    {id:9, who:"Kevin, trade show manager", org:"a flooring supplier", town:"Edison", room:"Convention center booth", ppl:0, days:2,
     call:"Two-day trade show booth. Two TVs, 55-inch or bigger, a small speaker, and one wireless mic for demos. Nothing crazy.",
     need:[["tv55",2,"Two TVs, 55\" or bigger."],["tvstand",2,"Stands for both."],["mains",1,"One small speaker."],["spkstand",1,"A stand for it."],["hh",1,"One demo mic."],["rxch",1,"A receiver for the mic."],["console",1,"A small mixer to combine mic and laptop."],["stereodi",1,"Laptop audio."]],
     labor:[["av",1,4]],
     ref:[["p14-07",2],["p12-26",2],["p12-40",1],["p18-37",1],["p16-15",1],["p16-16",1],["p19-32",1],["p13-15",1]]},
    {id:10, who:"Chris, parks & rec", org:"the town", town:"Montclair", room:"Park lawn, outdoors", ppl:200, days:1,
     call:"Summer movie night in the park, about 200 people on blankets. We need a big screen, a projector, and sound that actually sounds like a movie. No power out there.",
     need:[["projector",1,"A projector."],["screen",1,"A big screen."],["mains",2,"A pair of tops for 200 people."],["spkstand",2,"Stands for the tops."],["sub",2,"Movies need low end."],["console",1,"Small mixer for the feed."],["stereodi",1,"Stereo audio from the laptop or player."],["gen",1,"No power in the park."],["xlr",4,"Mixer to speakers."]],
     labor:[["av",1,5],["hand",1,4]],
     ref:[["p19-08",1],["p17-33",1],["p13-03",2],["p18-37",2],["p13-09",2],["p13-15",1],["p19-32",1],["p12-25",1],["p01-09",4]]},
  ];

  // ---------- totals + grading ----------
  const LAB = Object.fromEntries(LABOR.map(([k,l,r]) => [k,{l,r}]));
  function totals(call, lines, labor, delivery, rateOf){
    const f = dayFactor(call.days);
    const eq = lines.reduce((a,[id,q]) => a + rateOf(id)*q*f, 0);
    const lab = labor.reduce((a,[k,n,h]) => a + LAB[k].r*n*Math.max(MIN_HRS,h)*call.days, 0);
    const del = delivery ? DELIVERY : 0;
    return {eq, lab, del, total: eq + lab + del};
  }
  const refTotals = call => totals(call, call.ref, call.labor, true, id => rate(BY[id]));
  function count(key, lines){
    if(key === "rxch") return lines.reduce((a,[id,q]) => { const x = BY[id]; return a + (GD.cat(x)==="wireless" && /Receiver|ULXD4|QLXD4|SLXD4|EM 4/.test(x.n) ? rxCh(x)*q : 0); }, 0);
    const f = IS[key][0];
    return lines.reduce((a,[id,q]) => a + (f(BY[id]) ? q : 0), 0);
  }
  const needLabel = k => k === "rxch" ? "Wireless receiver channels" : IS[k][1];
  function grade(call, lines, labor, delivery, myRates){
    const checks = [];
    for(const [k,n,why] of call.need){
      const have = count(k, lines);
      checks.push({ok: have >= n, label: needLabel(k), detail: have >= n ? `${have} quoted. ${why}` : `${have} of ${n} quoted. ${why}`});
    }
    for(const [k,n,h] of call.labor){
      const mine = labor.find(l => l[0] === k);
      const ok = mine && mine[1] >= n && Math.max(MIN_HRS, mine[2]) >= h*.75;
      checks.push({ok: !!ok, label: `Labor: ${LAB[k].l}`, detail: ok ? `${mine[1]} × ${mine[2]} hrs per day. The shop would book ${n} × ${h}.` : mine ? `You booked ${mine[1]} × ${mine[2]} hrs per day. The shop would book ${n} × ${h}.` : `Not on your quote. The shop would book ${n} × ${h} hrs per day.`});
    }
    checks.push({ok: !!delivery, label: "Delivery & pickup", detail: delivery ? `$${DELIVERY} truck, there and back.` : `Somebody has to drive it there. Add $${DELIVERY}.`});
    let rateScore = null;
    if(myRates){
      const rows = lines.map(([id]) => ({id, mine: myRates[id], card: rate(BY[id])}));
      const good = rows.filter(r => r.mine > 0 && Math.abs(r.mine - r.card) / r.card <= .35);
      rateScore = {good: good.length, n: rows.length, rows};
      checks.push({ok: rows.length > 0 && good.length / rows.length >= .7, label: "Day rates from memory", detail: `${good.length} of ${rows.length} line rates within 35% of the rate card.`});
    }
    const rateOf = id => myRates ? (myRates[id] || 0) : rate(BY[id]);
    const mine = totals(call, lines, labor, delivery, rateOf), ref = refTotals(call);
    const r = mine.total / ref.total;
    const verdict = r > 1.5 ? ["Lost the bid", "Way over what the shop would charge. The client calls someone else."]
      : r > 1.25 ? ["A little rich", "Higher than the shop's number. You might keep it if the client loves you."]
      : r >= .8 ? ["On the money", "Right around the shop's own quote."]
      : r >= .65 ? ["Tight margin", "Under the shop's number. You'd win it, but check you didn't forget anything."]
      : ["Money left on the table", "Far under the shop's number. Something is missing or underpriced."];
    checks.push({ok: r >= .8 && r <= 1.25, label: `Total: ${verdict[0]}`, detail: `${verdict[1]} Yours ${usd(mine.total)} vs shop ${usd(ref.total)}.`});
    const passed = checks.filter(c => c.ok).length;
    return {checks, passed, total: checks.length, mine, ref, ratio: r, verdict, rateScore};
  }
  const usd = v => "$" + Math.round(v).toLocaleString();

  return {
    CALLS, LABOR, DELIVERY, MIN_HRS, dayFactor, rate, grade, totals, refTotals, usd,
    setShop(g){ SHOP = g; BY = Object.fromEntries(g.map(x => [x.id, x])); },
  };
})();
