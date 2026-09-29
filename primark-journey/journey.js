/* Twelve authored held drawings. Deterministic scene coordinates, no random redraw.
   Approximate geography derives from the supplied Primark map. No travel route is implied. */
offsets[20]=[24,12];Object.assign(offsets,{29:[55,-15],30:[45,15],31:[5,-22],32:[45,-6],33:[-8,-23],34:[-24,-26],35:[25,10]});
const counts=[0,0,0,3,7,11,17,25,28,32,35,36];
const titles=[['THE SOUND OF','OPENING DAY.'],['PACKED WITH','POSSIBILITY.'],['ONE CREW.','A BIG JOURNEY.'],['THE FIRST','OPENING DAYS.'],['THE JOURNEY','GROWS.'],['MORE DOORS.','MORE MOMENTS.'],['NEW PLACES.','SAME PRIDE.'],['EVERY OPENING','MATTERS.'],['THE WORK','KEEPS MOVING.'],['MORE TRUST.','MORE MILESTONES.'],['35 OPENINGS.','ONE PROUD CREW.'],['A JOURNEY','BUILT ON TRUST.']];
const spans=['READY TO ROLL','THE CASE OPENS','THE MAP UNFOLDS','NOV–DEC 2022','APR–JUL 2023','SEP–NOV 2023','JUL 2024–APR 2025','JUL–DEC 2025','APR–MAY 2026','JUN–AUG 2026','SEPTEMBER 2026','NEXT: NOVEMBER 19, 2026'];
const mapCache=new Map();let activeFrame=0;
const originalStamp=stamp;
stamp=function(c,id,x,y,r=13){if(id>counts[activeFrame])return;if(id===36){const e=Etch.ellipse(x,y,r,r);Etch.fill(c,e,P.paper);c.save();c.setLineDash([3,2]);Etch.outline(c,e,P.red,1.5,36);c.restore();text(c,'36',x,y+4.7,12,P.red,'Avenir Next','700','center');}else originalStamp(c,id,x,y,r);if(activeFrame>2&&activeFrame<11&&id>(counts[activeFrame-1]||0)){for(let k=0;k<3;k++){const a=-2.4+k*.85;Etch.line(c,[[x+Math.cos(a)*(r+5),y+Math.sin(a)*(r+5)],[x+Math.cos(a)*(r+11),y+Math.sin(a)*(r+11)]],P.red,.8,50+id)}}};
function mapArt(count){if(mapCache.has(count))return mapCache.get(count);const canvas=document.createElement('canvas');canvas.width=1881;canvas.height=1344;const c=canvas.getContext('2d');const active=new Set(PrimarkOpenings.filter(d=>d.id<=count).map(d=>d.state));
 for(let i=0;i<MapShapes.length;i++){const s=MapShapes[i],p=new Path2D(s.d),on=active.has(s.state);Etch.fill(c,p,on?'#82aaa0':'#d5d0ba');Etch.hatch(c,p,s.bounds,{seed:201+i,angle:on?-.7:.25,spacing:on?4.4:7,length:on?23:32,width:.55,color:on?'rgba(51,67,56,.38)':'rgba(93,83,68,.19)',density:(x,y)=>.4+((x-s.bounds[0])/Math.max(1,s.bounds[2]))*.5});Etch.outline(c,p,on?'#514b45':'#999482',on?1.4:.8,200+i);}
 const labelPos=MapLabels;for(const st of active){const [x,y]=labelPos[st];text(c,st,x,y,35,'#354b48','DIN Condensed','700','center')}
 // Fold creases stay attached to the map's surface.
 const whole=new Path2D();for(const s of MapShapes)whole.addPath(new Path2D(s.d));Etch.withClip(c,whole,()=>{for(const x of [450,920,1370]){Etch.line(c,[[x,0],[x-10,1344]],'rgba(248,240,213,.7)',3,12);Etch.line(c,[[x+4,0],[x-6,1344]],'rgba(80,59,48,.15)',2,12)}});
 mapCache.set(count,canvas);return canvas;}
function field(c,frame){const count=counts[frame];c.drawImage(mapArt(count),55,244,968,692);
 for(const d of PrimarkOpenings.filter(d=>d.panel==='national'&&d.id<=count)){const [dx,dy]=offsets[d.id]||[0,-23];pin(c,d.id,55+d.map_point[0]*.515,244+d.map_point[1]*.515,dx,dy)}
 const groups=[['metro',1715,445,'NY / NJ'],['capital',1635,583,'MD / VA']];for(const [group,x,y,label]of groups){const n=PrimarkOpenings.filter(d=>d.panel===group&&d.id<=count).length;if(!n)continue;const px=55+x*.515,py=244+y*.515;Etch.outline(c,Etch.ellipse(px,py,18,18),P.red,1.2,52);text(c,String(n),px,py+5,16,P.ink,'Avenir Next','700','center');text(c,label,px+25,py-12,10,P.ink);}
 c.save();c.translate(0,-76);metro(c);capital(c);c.restore();
 text(c,String(Math.min(count,35)).padStart(2,'0'),395,477,100,P.red,'DIN Condensed','700');text(c,'OPENINGS',401,509,23,P.ink,'DIN Condensed','700');if(count===36)text(c,'+ 1 UPCOMING',401,535,17,P.red,'DIN Condensed','700');
 roadcase(c,123,568,.75,1);
 text(c,'Every pin, a proud moment.',115,819,23,P.ink,'Baskerville');
}
function speaker(c,x,y,angle=0,scale=1){c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);const p=new Path2D('M0 0 L94 -8 L114 14 L106 179 L9 185 L-8 164 Z');Etch.fill(c,p,'#5f665b');Etch.hatch(c,p,[-10,-10,125,205],{seed:320,angle:1.5,spacing:2.7,length:12,color:'rgba(28,29,27,.5)'});Etch.outline(c,p,P.ink,1.4);for(const [yy,rx,ry] of [[44,29,25],[125,39,38]]){const e=Etch.ellipse(49,yy,rx,ry);Etch.fill(c,e,'#454940');Etch.hatch(c,e,[8,yy-40,85,80],{seed:321+yy,angle:.4,spacing:2,color:'rgba(199,194,159,.24)'});Etch.outline(c,e,'#b8b4a0',1)}c.restore();}
function mic(c,x,y,angle=0){c.save();c.translate(x,y);c.rotate(angle);const head=Etch.ellipse(0,0,27,34),body=new Path2D('M-13 28 L13 28 L8 148 L-8 148 Z');Etch.fill(c,body,'#887a65');Etch.hatch(c,body,[-16,24,32,125],{seed:64,angle:1.5,spacing:2,color:'rgba(41,32,36,.6)'});Etch.outline(c,body,P.ink,1.2);Etch.fill(c,head,'#c9c3a8');for(const angle of [-.6,.6])Etch.hatch(c,head,[-29,-36,58,72],{seed:68,angle,spacing:3,length:15,color:'rgba(41,32,36,.56)'});Etch.outline(c,head,P.ink,1.2);c.restore();}
function opener(c,f){
 // Three actual poses: latched case, open lid with gear, unfolding map above it.
 if(f===2){c.save();c.translate(550,540);c.rotate(-.08);c.scale(.48,.35);c.drawImage(mapArt(0),-940,-672,1881,1344);c.restore();}
 const s=f===0?1.9:f===1?1.65:1.4,x=f===0?240:f===1?280:330,y=f===0?460:f===1?595:670;
 const shadow=Etch.ellipse(x+230,y+230*s,260,38);Etch.hatch(c,shadow,[x-70,y+200*s,610,100],{seed:900,angle:.06,spacing:3,length:30,color:'rgba(67,46,38,.28)'});
 if(f===1){speaker(c,770,431,.12,1.1);mic(c,206,414,-.3);Etch.line(c,[[780,435],[805,414]],P.red,2);Etch.line(c,[[796,471],[834,461]],P.red,2);}
 if(f===2){speaker(c,165,710,-.09,.9);mic(c,823,645,.4);}
 roadcase(c,x,y,s,f===0?0:1);
 if(f===0){const tag=new Path2D('M140 874 L379 848 L390 940 L149 967 Z');Etch.fill(c,tag,'#d3c091');Etch.outline(c,tag,P.ink,1);c.save();c.translate(161,904);c.rotate(-.105);text(c,'THE PRIMARK JOURNEY',0,0,17,P.ink,'DIN Condensed','700');text(c,'HELLHOUND AUDIO',0,28,21,P.ink,'DIN Condensed','700');c.restore();Etch.line(c,[[156,882],[185,859],[283,837]],P.ink,.9);}
}
function frameCanvas(frame,scale=1){activeFrame=Math.max(0,Math.min(11,Math.floor(frame)));const f=activeFrame,cv=document.createElement('canvas');cv.width=1080*scale;cv.height=1350*scale;const c=cv.getContext('2d');c.scale(scale,scale);paper(c);
 text(c,'HELLHOUND AUDIO  /  THE PRIMARK JOURNEY',54,52,16,P.ink,'Avenir Next','700');text(c,`${num(f+1)} / 12`,1026,52,14,P.muted,'Avenir Next','600','right');rule(c,54,73,972);
 text(c,titles[f][0],52,155,76,P.ink,'DIN Condensed','700');text(c,titles[f][1],52,235,86,P.red,'DIN Condensed','700');text(c,spans[f],1025,279,16,P.muted,'Avenir Next','600','right');
 if(f<3)opener(c,f);else field(c,f);
 rule(c,54,1135,972);if(f<3){text(c,['Every opening starts with a crew.','The tools. The care. The people behind the day.','A story that reaches across thirteen states.'][f],54,1183,29,P.ink,'Baskerville');text(c,'An illustrated celebration of the work and the trust behind it.',54,1220,18,P.muted);}
 else if(f===11){text(c,'35 openings. 13 states. Thank you, Primark.',54,1181,31,P.ink,'Baskerville');text(c,'NEXT: 36  Pentagon City Mall, Arlington, VA  /  NOV 19, 2026',54,1218,19,P.muted);}
 else{const prev=counts[f-1];const rows=PrimarkOpenings.filter(d=>d.id>prev&&d.id<=counts[f]);rows.forEach((d,i)=>{const two=rows.length>4;const col=two?Math.floor(i/4):0,row=two?i%4:i;const label=two?`${num(d.id)}  ${d.name} / ${d.state}`:`${num(d.id)}   ${d.name} / ${d.city}, ${d.state}`;text(c,label,54+col*510,1160+row*23,two?16:18,P.ink,'Avenir Next','500')});}
 rule(c,54,1248,972);logo(c,54,1260,215);c.drawImage(images.wordmark,810,1290,215,47);
 return cv;}
window.renderFrame=(t,scale=1)=>frameCanvas(Math.min(11,Math.max(0,Math.floor(t))),scale);
window.renderKeyframe=frameCanvas;
window.JourneySequence={frames:12,counts,titles,duration:14,holdSeconds:counts.map((_,i)=>i===11?3:1),geography:'Approximate map and schematic close-ups; no travel route implied.'};
let current=0,playing=false,timer;
function showFrame(i){current=Math.max(0,Math.min(11,i));const old=document.querySelector('#stage canvas'),cv=frameCanvas(current,1);if(old)old.replaceWith(cv);else document.querySelector('#stage').appendChild(cv);document.querySelector('#seek').value=current;document.querySelector('#position').textContent=`Frame ${num(current+1)} / 12`;}
function play(){playing=!playing;document.querySelector('#play').textContent=playing?'Pause':'Play';if(playing)tick();else clearTimeout(timer)}
function tick(){timer=setTimeout(()=>{showFrame((current+1)%12);if(playing)tick()},current===11?3000:1000)}
const wordmark=new Image;wordmark.onload=()=>{images.wordmark=wordmark;showFrame(0);window.ready=true};wordmark.src='primark-wordmark.png';
