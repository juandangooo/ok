/* Hellhound Audio / Primark: editable, deterministic Canvas artwork.
   Layout coordinates are 1080 x 1350; exports render at 2x.
   Map and Primark wordmark are raster separations of the user-supplied map. */
const P={paper:'#eee6cf',ink:'#3e3034',red:'#ad5045',blue:'#559b9e',muted:'#7b7970',line:'#b8b3a1'};
const images={};
const num=n=>String(n).padStart(2,'0');
function text(c,s,x,y,size=20,color=P.ink,font='Avenir Next',weight='500',align='left'){
 c.fillStyle=color;c.font=`${weight} ${size}px "${font}", sans-serif`;c.textAlign=align;c.fillText(s,x,y);c.textAlign='left';
}
function rule(c,x,y,w,col=P.ink){Etch.line(c,[[x,y],[x+w,y+.4]],col,.8,11,.6)}
function paper(c){c.fillStyle=P.paper;c.fillRect(0,0,1080,1350);const r=Etch.rng(90);c.fillStyle='rgba(73,59,41,.075)';for(let i=0;i<27000;i++){const x=r()*1080,y=r()*1350;c.fillRect(x,y,r()*.7+.15,r()*.5+.15)} }
function logo(c,x,y,w){c.save();c.translate(x,y);c.scale(w/2500,w/2500);for(const p of HellhoundLogoPaths){c.save();c.translate(p.x,p.y);c.fillStyle=p.fill;c.fill(new Path2D(p.d));c.restore()}c.restore()}
function brands(c,y=1247){logo(c,57,y,265);c.drawImage(images.wordmark,763,y+24,262,57)}
function stamp(c,id,x,y,r=13){c.save();c.fillStyle='rgba(50,32,23,.14)';c.beginPath();c.arc(x+1.8,y+2,r,0,Math.PI*2);c.fill();const p=Etch.ellipse(x,y,r,r);Etch.fill(c,p,P.red);Etch.outline(c,p,P.ink,.65,id);text(c,num(id),x,y+(r>=20?7:4.7),r>=20?19:12,P.paper,'Avenir Next','700','center');c.restore()}
function pin(c,id,x,y,dx=0,dy=-23){const bx=x+dx,by=y+dy;Etch.line(c,[[x,y],[bx,by]],P.ink,1,id,.35);c.fillStyle=P.ink;c.beginPath();c.arc(x,y,2,0,Math.PI*2);c.fill();stamp(c,id,bx,by)}
function roadcase(c,x,y,s=1,lid=0){
 c.save();c.translate(x,y);c.scale(s,s);
 const front=new Path2D('M 0 33 L 165 52 L 165 214 L 0 193 Z'),side=new Path2D('M 165 52 L 239 13 L 239 169 L 165 214 Z'),top=new Path2D('M 0 33 L 71 0 L 239 13 L 165 52 Z');
 if(lid){const lp=new Path2D(`M71 0 L${71-lid*25} ${-150*lid} L${239-lid*25} ${13-150*lid} L239 13 Z`);Etch.fill(c,lp,'#be8b70');Etch.hatch(c,lp,[40,-160,210,180],{seed:71,angle:1.2,spacing:3,color:'rgba(65,34,35,.4)'});Etch.outline(c,lp,P.ink,1.2);}
 Etch.fill(c,front,'#bc6b55');Etch.fill(c,side,'#88362e');Etch.fill(c,top,lid?'#463b3c':'#dba592');
 Etch.hatch(c,front,[0,33,165,181],{angle:1.2,spacing:3,length:17,color:'rgba(78,33,28,.32)',seed:21,density:(a,b)=>a>140||b>174?.9:.18});
 Etch.hatch(c,side,[165,13,75,202],{angle:-.55,spacing:2.5,length:25,color:'rgba(37,27,25,.6)',seed:22});
 Etch.hatch(c,top,[0,0,240,52],{angle:-.35,spacing:3.5,length:22,color:'rgba(43,36,28,.30)',seed:23});
 for(const p of [front,side,top])Etch.outline(c,p,P.ink,1.4,33);
 for(const pts of [[[0,33],[0,193],[165,214],[239,169]],[[0,57],[165,76],[239,37]],[[165,52],[165,214]],[[239,13],[239,169]]]){Etch.line(c,pts,'#dfd5be',7,8);Etch.line(c,pts,P.ink,.8,8)}
 for(const [xx,yy] of [[13,65],[145,82],[13,182],[145,200]]){c.fillStyle='#d6d4c8';c.fillRect(xx-5,yy-8,10,16);c.strokeStyle=P.ink;c.lineWidth=.7;c.strokeRect(xx-5,yy-8,10,16);c.fillStyle=P.ink;c.fillRect(xx-1,yy-1,2,2)}
 c.save();c.transform(1,.11,0,1,0,0);logo(c,16,83,132);text(c,'OPENING DAYS',22,165,13,P.paper,'DIN Condensed','700');c.restore();
 const handle=new Path2D('M187 94 L217 79 L217 100 L187 115 Z');Etch.fill(c,handle,'#b7aba0');Etch.outline(c,handle,P.ink,1);Etch.line(c,[[192,102],[192,98],[211,88],[211,93]],P.ink,3);
 for(const [xx,yy] of [[20,200],[153,220],[221,181]]){Etch.fill(c,Etch.ellipse(xx,yy+5,8,14),P.ink);Etch.outline(c,Etch.ellipse(xx+2,yy+5,4,10),'#869593',1)}
 // A coiled audio cable, separate from the geography.
 c.strokeStyle=P.ink;c.lineWidth=2;for(let j=0;j<4;j++){c.beginPath();c.ellipse(264+j*2,206-j*3,32,10,-.2,0,Math.PI*2);c.stroke()}
 const cable=new Path2D('M291 204 C334 190 344 223 285 235 C241 244 190 238 192 261');c.stroke(cable);c.fillStyle=P.ink;c.fillRect(189,260,6,15);
 c.restore();
}
const offsets={9:[-20,26],22:[-24,-24],24:[23,-29],26:[-27,13],4:[-10,-23],7:[12,-23],18:[-8,-23],21:[5,-27],11:[0,-24],14:[22,-22],20:[-15,-23],16:[0,-24],23:[12,-22],13:[-16,-26],25:[-3,-23]};
function map(c){
 const x=35,y=326,s=.535;
 c.save();c.translate(x,y);c.scale(s,s);c.drawImage(images.base,0,0);c.drawImage(images.active,0,0);
 // Stable sparse ink wear follows the blue separation, leaving all geometry fixed.
 c.drawImage(images.wear,0,0);c.restore();
 for(const d of PrimarkOpenings.filter(d=>d.panel==='national')){const [dx,dy]=offsets[d.id]||[0,-23];pin(c,d.id,x+d.map_point[0]*s,y+d.map_point[1]*s,dx,dy)}
 for(const [mx,my,tx,ty,label,count] of [[1715,445,993,505,'NY / NJ',9],[1635,583,986,639,'MD / VA',4]]){
 const px=x+mx*s,py=y+my*s;Etch.outline(c,Etch.ellipse(px,py,20,20),P.ink,.9,4);Etch.line(c,[[px+15,py],[tx,py],[tx,ty-12]],P.ink,.8,4);text(c,label,tx,ty,12,P.ink,'Avenir Next','700','center');text(c,`${count} OPENINGS`,tx,ty+16,10,P.ink,'Avenir Next','600','center');
 }
 roadcase(c,110,620,.83);
 text(c,'Packed with pride.',141,902,25,P.ink,'Baskerville','400');
 text(c,'A journey built on trust.',141,928,16,P.muted,'Avenir Next','500');
}
function metro(c){const x=55,y=1008,w=603,h=180;c.save();c.translate(x,y);rule(c,0,0,w);text(c,'NEW YORK / NEW JERSEY',0,27,15,P.ink,'Avenir Next','700');
 // Diagrammatic Hudson, harbor, and Long Island coastline.
 const land=new Path2D('M135 53 L176 41 L179 71 L210 80 L270 72 L356 81 L516 49 L557 72 L425 107 L351 119 L263 116 L205 130 L163 117 L159 80 Z');Etch.fill(c,land,'#c7e3e1');Etch.outline(c,land,'#799d9e',.7,5);
 Etch.line(c,[[130,45],[146,77],[146,112],[163,147]],'#009fc8',1.8,2);
 const pts=[[6,69,139],[19,98,84],[27,160,61],[3,192,133],[15,255,76],[2,310,111],[5,383,138],[1,427,80],[10,536,61]];for(const [id,xx,yy] of pts)stamp(c,id,xx,yy,13);
 text(c,'NJ',15,65,11,P.muted);text(c,'MANHATTAN',131,42,9,P.muted);text(c,'LONG ISLAND',417,160,10,P.muted);c.restore();}
function capital(c){const x=700,y=1008,w=325;c.save();c.translate(x,y);rule(c,0,0,w);text(c,'MID-ATLANTIC',0,27,15,P.ink,'Avenir Next','700');
 const land=new Path2D('M14 50 L293 47 L276 159 L33 172 Z');Etch.fill(c,land,'#d9e6da');Etch.line(c,[[128,45],[144,69],[147,97],[172,125],[156,161]],'#009fc8',2,11);
 const pts=[[8,239,60,'HANOVER'],[28,227,112,'HYATTSVILLE'],[12,69,70,'TYSONS'],[17,74,139,'WOODBRIDGE'],[36,149,103,'PENTAGON CITY']];for(const [id,xx,yy,label] of pts){stamp(c,id,xx,yy,13);if(id<=counts[activeFrame])text(c,label,xx,yy+27,8.5,P.ink,'Avenir Next','600','center')}
 c.restore();}
function hero(c){paper(c);text(c,'HELLHOUND AUDIO  /  THE PRIMARK JOURNEY',55,51,16,P.ink,'Avenir Next','700');text(c,'01 / 05',1025,51,13,P.muted,'Avenir Next','600','right');rule(c,55,70,970);
 text(c,'THE SOUND OF',51,164,91,P.ink,'DIN Condensed','700');text(c,'OPENING DAY.',51,260,112,P.red,'DIN Condensed','700');
 text(c,'28 OPENINGS',57,304,22,P.ink,'DIN Condensed','700');text(c,'10 STATES',285,304,22,P.ink,'DIN Condensed','700');text(c,'2022–2026',477,304,22,P.ink,'DIN Condensed','700');text(c,'Every pin, a proud moment.',1024,303,18,P.ink,'Baskerville','400','right');
 map(c);metro(c);capital(c);text(c,'NUMBERED BY DATE   •   SCHEMATIC CLOSE-UPS   •   SWIPE FOR LOCATIONS & DATES',55,1210,11,P.muted,'Avenir Next','600');rule(c,55,1230,970);brands(c);}
function dateLabel(v){if(v.includes('/'))return 'APR 9–10, 2025';const [year,month,day]=v.split('-');return `${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][+month-1]} ${+day}, ${year}`}
function wrap(c,str,max,size){c.font=`700 ${size}px "Avenir Next"`;const words=str.split(' '),lines=[];let line='';for(const word of words){if(c.measureText(line+' '+word).width>max&&line){lines.push(line);line=word}else line+=(line?' ':'')+word}if(line)lines.push(line);return lines}
function ledger(c,page){paper(c);text(c,'HELLHOUND AUDIO  /  THE PRIMARK JOURNEY',55,51,16,P.ink,'Avenir Next','700');text(c,`${num(page+1)} / 05`,1025,51,13,P.muted,'Avenir Next','600','right');rule(c,55,70,970);
 text(c,page===4?'EVERY MILESTONE.':'EVERY OPENING.',54,167,page===4?85:91,P.ink,'DIN Condensed','700');text(c,page===4?'BUILT ON TRUST.':'PART OF OUR STORY.',54,248,82,P.red,'DIN Condensed','700');
 const ranges=['NOVEMBER 2022 TO JULY 2023','SEPTEMBER 2023 TO SEPTEMBER 2024','DECEMBER 2024 TO OCTOBER 2025','NOVEMBER 2025 TO MAY 2026'];
 text(c,`OPENINGS ${num((page-1)*7+1)}–${num(page*7)}  /  ${ranges[page-1]}`,57,293,17,P.muted);
 const subset=PrimarkOpenings.slice((page-1)*7,page*7);for(let i=0;i<7;i++){const d=subset[i],x=55,y=340+i*114;rule(c,x,y,970,P.line);stamp(c,d.id,x+26,y+45,24);text(c,d.name,x+80,y+44,32,P.ink,'Avenir Next','700');text(c,`${d.city}, ${d.state}`,x+80,y+79,23,P.muted);text(c,dateLabel(d.date),1025,y+79,19,P.red,'Avenir Next','700','right');}
 rule(c,55,1150,970);text(c,page===4?'Thank you, Primark, for your trust.':'28 openings. 10 states. One proud crew.',55,1200,29,P.ink,'Baskerville','400');text(c,page===4?'Proud to be part of every opening day.':'Every number matches a marker on the map.',55,1228,17,P.muted);brands(c,1250);}
