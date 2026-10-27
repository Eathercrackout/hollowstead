// Hollowstead UI v0.5 — original hand-drawn cutaway look. Rendering, input, menus, inspector.
const cv=document.getElementById('c'),ctx=cv.getContext('2d');let VW,VH,DPR;
function rs(){DPR=Math.min(2,devicePixelRatio||1);VW=innerWidth;VH=innerHeight;cv.width=VW*DPR;cv.height=VH*DPR}addEventListener('resize',rs);rs();
let S=HS.newGame(),speed=1,paused=false,tool='inspect',overlay=0,toast='',toastT=0,pri=5,panel=false,saveT=0,menu=null,insp=null,winSeen=false;
const OVL=[['Normal','🌫'],['Oxygen','O₂'],['Heat','🌡'],['Germs','🦠']];
const cam={x:HS.W/2,y:HS.H/2+(innerWidth>innerHeight?2.5:0),z:30};
const TH={bg:'#0b0f1c',panel:'rgba(18,26,46,.92)',panel2:'#1b2742',edge:'#34477a',acc:'#4fd8c8',accDim:'#2b6f72',txt:'#e8eefc',sub:'#9fb0d6',warn:'#ffb347',bad:'#ff5d6c',good:'#7be38b'};
const BT={ladder:HS.B_LADDER,aerator:HS.B_AERATOR,farm:HS.B_FARM,dynamo:HS.B_DYNAMO,desk:HS.B_DESK,scrub:HS.B_SCRUB,cot:HS.B_COT,couch:HS.B_COUCH,cooler:HS.B_COOLER,vat:HS.B_VAT};
const NAME={inspect:'Inspect',dig:'Dig',ladder:'Ladder',aerator:'Lichen Aerator',scrub:'Scrubber',vat:'O₂ Vat',farm:'Farm Plot',dynamo:'Crank Dynamo',desk:'Research Desk',cot:'Med Cot',couch:'Couch',cooler:'Cooler',prio:'Set Priority',cancel:'Cancel Job',pm:'Priority −',pp:'Priority +',research:'Research',save:'Save',load:'Load'};
const ICON={inspect:'🔍',dig:'⛏',ladder:'🪜',aerator:'💨',scrub:'🫧',vat:'🫁',farm:'🌱',dynamo:'⚙',desk:'📘',cot:'🛏',couch:'🛋',cooler:'❄',prio:'🔢',cancel:'✖',pm:'➖',pp:'➕',research:'🔬',save:'💾',load:'📂'};
const CATS=[{id:'dig',icon:'⛏',l:'Dig',tool:'dig'},{id:'base',icon:'🪜',l:'Base',items:['ladder']},{id:'oxy',icon:'💨',l:'Oxygen',items:['aerator','scrub','vat']},{id:'food',icon:'🌱',l:'Food',items:['farm']},
 {id:'power',icon:'⚡',l:'Power',items:['dynamo']},{id:'care',icon:'🛋',l:'Colony',items:['desk','cot','couch','cooler']},{id:'tools',icon:'🔧',l:'Tools',items:['inspect','prio','pm','pp','cancel']},{id:'menu',icon:'☰',l:'Menu',items:['research','save','load']}];
const w2s=(x,y)=>[(x-cam.x)*cam.z+VW/2,(y-cam.y)*cam.z+VH/2],s2w=(x,y)=>[(x-VW/2)/cam.z+cam.x,(y-VH/2)/cam.z+cam.y];
function say(s){toast=s;toastT=2.8}
const locked=id=>BT[id]&&HS.LOCK[BT[id]]&&!S.rs.done[HS.LOCK[BT[id]]];
const costTxt=id=>BT[id]?Object.entries(HS.COST[BT[id]]).map(([k,v])=>v+' '+k).join(', '):'';
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function panelBox(x,y,w,h,r=12,fill=TH.panel){rr(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=TH.edge;ctx.lineWidth=1.5;ctx.stroke()}
function bar(x,y,w,h,f,col){rr(x,y,w,h,h/2);ctx.fillStyle='#0a0f1d';ctx.fill();if(f>0){rr(x,y,Math.max(h,w*Math.min(1,f)),h,h/2);ctx.fillStyle=col;ctx.fill()}}
// ---------- layout ----------
const BAR_H=58;
const narrow=()=>VW<430;
function vitRect(){return narrow()?{x:6,y:6,w:VW-12,h:112}:{x:8,y:8,w:Math.min(330,VW-200),h:118}}
function clusterRect(){const w=4*42+8;return narrow()?{x:VW-w-6,y:124,w,h:92}:{x:VW-w-8,y:8,w,h:92}}
function inspRect(){const w=Math.min(VW-12,310);return{x:6,y:VH-BAR_H-10-96,w,h:92}}
function buttons(){const bs=[];
 const bw=(VW-12)/CATS.length;CATS.forEach((c,i)=>bs.push({id:'cat:'+c.id,cat:c,x:6+i*bw,y:VH-BAR_H-4,w:bw-4,h:BAR_H,on:menu==c.id||(c.tool&&tool==c.tool)}));
 if(menu){const c=CATS.find(c=>c.id==menu),iw=Math.min(104,(VW-16)/c.items.length-6),tot=c.items.length*(iw+6)-6,x0=Math.max(8,Math.min(VW-tot-8,6+CATS.indexOf(c)*bw+bw/2-tot/2));
  c.items.forEach((id,i)=>bs.push({id,item:1,x:x0+i*(iw+6),y:VH-BAR_H-14-70,w:iw,h:66,on:tool==id,dim:locked(id)}))}
 const cr=clusterRect();[['pause',paused?'▶':'❚❚'],['s1','1×'],['s2','2×'],['s3','4×']].forEach(([id,l],i)=>bs.push({id,l,x:cr.x+4+i*42,y:cr.y+4,w:38,h:38,round:1,on:(id=='s1'&&speed==1&&!paused)||(id=='s2'&&speed==2&&!paused)||(id=='s3'&&speed==4&&!paused)||(id=='pause'&&paused)}));
 OVL.forEach(([n,ic],i)=>bs.push({id:'ovl:'+i,l:ic,x:cr.x+4+i*42,y:cr.y+48,w:38,h:38,round:1,on:overlay==i}));
 if(insp)bs.push({id:'insp-close',l:'✕',x:inspRect().x+inspRect().w-30,y:inspRect().y+4,w:26,h:26,round:1});
 if(panel){const ks=Object.keys(HS.TECH),pw=Math.min(VW-20,380),px=(VW-pw)/2,rh=VH<500?46:60;ks.forEach((k,i)=>bs.push({id:'tech:'+k,x:px+10,y:96+i*rh,w:pw-20,h:rh-6,tech:k}));bs.push({id:'research',l:'Close',x:px+pw-84,y:58,w:74,h:30})}
 if(S.won&&!winSeen&&!S.over)bs.push({id:'wincont',l:'Keep playing',x:VW/2-85,y:VH/2+34,w:170,h:46});
 if(S.over)bs.push({id:'restart',l:'New colony',x:VW/2-85,y:VH/2+34,w:170,h:46});return bs}
function doSave(silent){if(S.over&&!silent)return say('The colony has fallen — start a new one');try{localStorage.hsSave=HS.save();if(!silent)say('Colony saved')}catch(e){say('Save failed: '+e.message)}}
function doLoad(){try{if(!localStorage.hsSave)return say('No save found');S=HS.load(localStorage.hsSave);tilesDirty=true;say('Colony loaded')}catch(e){say('Load failed')}}
function press(id){
 if(id.startsWith('cat:')){const c=CATS.find(c=>c.id==id.slice(4));if(c.tool){tool=c.tool;menu=null;say('Dig: tap rock to queue')}else menu=menu==c.id?null:c.id;return}
 if(id=='ovl')overlay=(overlay+1)%OVL.length;else if(id.startsWith('ovl:'))overlay=+id.slice(4);
 else if(id=='pause')paused=!paused;else if(id=='s1'||id=='s2'||id=='s3'){speed={s1:1,s2:2,s3:4}[id];paused=false}
 else if(id=='research'){panel=!panel;menu=null}
 else if(id.startsWith('tech:')){const k=id.slice(5),tc=HS.TECH[k];if(S.rs.done[k])say(tc.name+' already researched');else if(!HS.pickTech(k))say('Requires '+HS.TECH[tc.req].name+' first');else say('Researching '+tc.name+(S.misc.some(m=>m.bt==HS.B_DESK)?'':' — build a Research Desk'))}
 else if(id=='pm'){pri=Math.max(1,pri-1);say('New job priority: '+pri)}else if(id=='pp'){pri=Math.min(9,pri+1);say('New job priority: '+pri)}else if(id=='pv')pri=pri%9+1;
 else if(id=='save'){doSave();menu=null}else if(id=='load'){doLoad();menu=null}else if(id=='insp-close')insp=null;
 else if(id=='restart'){S=HS.newGame();tilesDirty=true;cam.x=HS.W/2;cam.y=HS.H/2+(VW>VH?2.5:0);winSeen=false;insp=null;doSave(true);say('New colony founded')}else if(id=='wincont')winSeen=true;
 else{tool=id;menu=null;if(locked(id))say('Locked — research '+HS.TECH[HS.LOCK[BT[id]]].name);else if(BT[id])say(NAME[id]+' · '+costTxt(id)+' · tap an open tile')}}
function tapWorld(px,py){const[wx,wy]=s2w(px,py),x=Math.floor(wx),y=Math.floor(wy);if(x<0||y<0||x>=HS.W||y>=HS.H)return;
 const i=HS.idx(x,y);insp={x,y};
 if(tool=='inspect'){toastT=0;return}
 if(tool=='dig'){if(!HS.addJob('dig',x,y,0,pri))say(S.t[i]==HS.BEDROCK?'Bedrock is too hard':'Nothing to dig')}
 else if(tool=='cancel')HS.cancelAt(x,y);
 else if(tool=='prio'){if(HS.setPri(x,y,pri))say('Priority set to '+pri);else say('No job on that tile')}
 else if(BT[tool]){const bt=BT[tool];if(locked(tool))return say('Locked — research '+HS.TECH[HS.LOCK[bt]].name);if(!HS.addJob('build',x,y,bt,pri))say(bt==HS.B_FARM?'Farms need an open tile on top of soil':'Need an open, empty tile');
  else if(!Object.entries(HS.COST[bt]).every(([k,v])=>S.res[k]>=v))say('Queued — needs '+costTxt(tool))}}
// ---------- input ----------
const inR=(x,y,r)=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;
const uiHit=(x,y)=>inR(x,y,vitRect())||inR(x,y,clusterRect())||(insp&&inR(x,y,inspRect()))||y>VH-BAR_H-8;
const ptrs=new Map();let gest=null;
cv.addEventListener('pointerdown',e=>{try{cv.setPointerCapture(e.pointerId)}catch(_){}ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(ptrs.size==1)gest={sx:e.clientX,sy:e.clientY,moved:false,multi:false,cx:cam.x,cy:cam.y};
 else if(ptrs.size==2&&gest){const[a,b]=[...ptrs.values()];gest.multi=true;gest.d0=Math.hypot(a.x-b.x,a.y-b.y)||1;gest.z0=cam.z;gest.m0=s2w((a.x+b.x)/2,(a.y+b.y)/2)}});
cv.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId)||!gest)return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(ptrs.size>=2){const[a,b]=[...ptrs.values()];cam.z=Math.max(10,Math.min(80,gest.z0*Math.hypot(a.x-b.x,a.y-b.y)/gest.d0));const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;cam.x=gest.m0[0]-(mx-VW/2)/cam.z;cam.y=gest.m0[1]-(my-VH/2)/cam.z}
 else if(!gest.multi){const dx=e.clientX-gest.sx,dy=e.clientY-gest.sy;if(Math.hypot(dx,dy)>10)gest.moved=true;if(gest.moved&&!panel){cam.x=gest.cx-dx/cam.z;cam.y=gest.cy-dy/cam.z}}});
function up(e){if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);
 if(ptrs.size==0&&gest){if(!gest.moved&&!gest.multi){const x=e.clientX,y=e.clientY,b=buttons().reverse().find(b=>inR(x,y,b));
   if(b)press(b.id);else if(panel)panel=false;else if(menu&&!uiHit(x,y))menu=null;else if(uiHit(x,y)){}else if(!S.over)tapWorld(x,y)}gest=null}}
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('wheel',e=>{e.preventDefault();const[wx,wy]=s2w(e.clientX,e.clientY);cam.z=Math.max(10,Math.min(80,cam.z*(e.deltaY<0?1.1:0.9)));cam.x=wx-(e.clientX-VW/2)/cam.z;cam.y=wy-(e.clientY-VH/2)/cam.z},{passive:false});
addEventListener('keydown',e=>{if(e.key==' ')paused=!paused;if('124'.includes(e.key)){speed=+e.key;paused=false}});
// ---------- procedural art: tile textures (cached) ----------
const TP=32;function hsh(x,y){let h=(x*374761393+y*668265263)^0x5bd1e995;h=(h^(h>>>13))*1274126177;return(h^(h>>>16))>>>0}
const MAT={1:{base:'#6e5f58',band:['#7a6a62','#5f514b','#85756b'],spk:'#4b3f3b',hi:'#9a8a80'},2:{base:'#a9794b',band:['#b88757','#94683f','#c49464'],spk:'#7a5332',hi:'#d9a878'},
 3:{base:'#5a6e4c',band:['#647a52','#4c5e40'],spk:'#3d4d33',hi:'#8fb47a'},4:{base:'#2b2433',band:['#332b3d','#231d2a'],spk:'#17121c',hi:'#4a3f58'}};
const TEX={};function makeTex(m,v){const c=document.createElement('canvas');c.width=c.height=TP;const g=c.getContext('2d'),M=MAT[m];let s=hsh(m*7+v,v*13+1);const r=()=>(s=(s*1664525+1013904223)>>>0)/4294967296;
 g.fillStyle=M.base;g.fillRect(0,0,TP,TP);
 for(let k=0;k<M.band.length;k++){g.fillStyle=M.band[k];g.beginPath();const y0=r()*TP;g.moveTo(0,y0);for(let x=0;x<=TP;x+=8)g.lineTo(x,y0+Math.sin(x*.3+r()*6)*2.5);g.lineTo(TP,y0+4+r()*5);g.lineTo(0,y0+4+r()*5);g.fill()}
 for(let k=0;k<10;k++){g.fillStyle=k%3?M.spk:M.hi;const x=r()*TP,y=r()*TP,sz=1+r()*2.2;g.beginPath();g.arc(x,y,sz,0,7);g.fill()}
 if(m==3){for(let k=0;k<5;k++){const x=4+r()*24,y=4+r()*24;g.fillStyle='#7fcf6a';g.beginPath();g.arc(x,y,2.5+r()*2.5,0,7);g.fill();g.fillStyle='#b8f39a';g.beginPath();g.arc(x-1,y-1,1.2,0,7);g.fill()}}
 if(m==4){g.strokeStyle='#120e17';g.lineWidth=1.2;g.beginPath();let x=r()*TP,y=0;g.moveTo(x,y);for(let k=0;k<4;k++){x+=(r()-.5)*12;y+=8;g.lineTo(x,y)}g.stroke()}
 return c}
for(const m of[1,2,3,4]){TEX[m]=[0,1,2].map(v=>makeTex(m,v))}
const tileC=document.createElement('canvas');tileC.width=HS.W*TP;tileC.height=HS.H*TP;const tg=tileC.getContext('2d');let tilesDirty=true,lastT=null,lastB=null;
function renderTiles(){const{t}=S;tg.clearRect(0,0,tileC.width,tileC.height);
 // cave backdrop with soft rock pattern
 for(let y=0;y<HS.H;y++)for(let x=0;x<HS.W;x++){const i=HS.idx(x,y),X=x*TP,Y=y*TP;if(t[i])continue;tg.fillStyle=(hsh(x,y)%5)?'#231a27':'#271d2c';tg.fillRect(X,Y,TP,TP);
  if(hsh(y,x)%7==0){tg.fillStyle='#2e2333';tg.beginPath();tg.arc(X+TP*.5,Y+TP*.6,TP*.25,0,7);tg.fill()}}
 for(let y=0;y<HS.H;y++)for(let x=0;x<HS.W;x++){const i=HS.idx(x,y),m=t[i],X=x*TP,Y=y*TP;if(!m)continue;tg.drawImage(TEX[m][hsh(x,y)%3],X,Y)}
 // outlines & shading where solid meets open
 const open=(x,y)=>x>=0&&y>=0&&x<HS.W&&y<HS.H&&!t[HS.idx(x,y)];
 for(let y=0;y<HS.H;y++)for(let x=0;x<HS.W;x++){const i=HS.idx(x,y),X=x*TP,Y=y*TP;
  if(t[i]){tg.fillStyle='#120c14';if(open(x,y-1)){tg.fillRect(X,Y,TP,3);tg.fillStyle=MAT[t[i]].hi;tg.fillRect(X,Y+3,TP,2);tg.fillStyle='#120c14'}if(open(x,y+1))tg.fillRect(X,Y+TP-3,TP,3);if(open(x-1,y))tg.fillRect(X,Y,3,TP);if(open(x+1,y))tg.fillRect(X+TP-3,Y,3,TP)}
  else{if(!open(x,y-1)){const g=tg.createLinearGradient(0,Y,0,Y+TP*.6);g.addColorStop(0,'rgba(0,0,0,.45)');g.addColorStop(1,'rgba(0,0,0,0)');tg.fillStyle=g;tg.fillRect(X,Y,TP,TP*.6)}
   if(!open(x-1,y)){tg.fillStyle='rgba(0,0,0,.18)';tg.fillRect(X,Y,TP*.2,TP)}if(!open(x+1,y)){tg.fillStyle='rgba(0,0,0,.18)';tg.fillRect(X+TP*.8,Y,TP*.2,TP)}}}
 tilesDirty=false;lastT=S.t.slice()}
function checkTiles(){if(tilesDirty||!lastT||lastT.length!=S.t.length)return renderTiles();for(let i=0;i<S.t.length;i++)if(S.t[i]!=lastT[i])return renderTiles()}
// ---------- gas / overlay images (1px per tile, smoothed) ----------
const gasC=document.createElement('canvas');gasC.width=HS.W;gasC.height=HS.H;const gg=gasC.getContext('2d');const gImg=gg.createImageData(HS.W,HS.H);
function renderGas(mode){const d=gImg.data,{t,o2,co2,T,G}=S;for(let i=0;i<t.length;i++){const p=i*4;let r=0,g=0,b=0,a=0;
  if(mode==2){const u=Math.max(0,Math.min(1,T[i]/50));r=255*u;g=180*(1-Math.abs(u-.5)*2)+40;b=255*(1-u);a=150}
  else if(!t[i]){const o=o2[i],c=co2[i];
   if(mode==0){const tot=o+c+1e-6,fo=o/tot;r=150*fo+70*(1-fo);g=215*fo+72*(1-fo);b=255*fo+80*(1-fo);a=Math.min(170,(Math.min(1.6,tot))*95)}
   else if(mode==1){const br=Math.min(1,o/1.0);if(o<0.25){r=230;g=70;b=70;a=170}else{r=60+120*(1-br);g=150+80*br;b=255;a=170}if(c>o&&c>.2){r=70;g=72;b=82;a=200}}
   else if(mode==3){const gm=Math.min(1,G[i]/150);r=120+100*gm;g=200;b=60;a=gm*200}}
  d[p]=r;d[p+1]=g;d[p+2]=b;d[p+3]=a}gg.putImageData(gImg,0,0)}
// ---------- buildings ----------
const OUT='#140d18';
function drawBuilding(b,x,y,sx,sy,z,now){const lw=Math.max(1.2,z/18);ctx.lineWidth=lw;ctx.strokeStyle=OUT;
 const box=(px,py,w,h,r,fill)=>{rr(sx+px*z,sy+py*z,w*z,h*z,r*z);ctx.fillStyle=fill;ctx.fill();ctx.stroke()};
 const m=b>=HS.B_DESK?S.misc.find(m=>m.x==x&&m.y==y):null;
 if(b==HS.B_LADDER){ctx.strokeStyle='#5b3a1e';ctx.lineWidth=z*.09;ctx.beginPath();ctx.moveTo(sx+z*.28,sy);ctx.lineTo(sx+z*.28,sy+z);ctx.moveTo(sx+z*.72,sy);ctx.lineTo(sx+z*.72,sy+z);for(let k=0;k<3;k++){ctx.moveTo(sx+z*.28,sy+z*(.2+k*.3));ctx.lineTo(sx+z*.72,sy+z*(.2+k*.3))}ctx.stroke();
  ctx.strokeStyle='#c99a5e';ctx.lineWidth=z*.045;ctx.stroke();return}
 if(b==HS.B_POD){ctx.beginPath();ctx.arc(sx+z*.5,sy+z*.78,z*.46,Math.PI,0);ctx.lineTo(sx+z*.96,sy+z);ctx.lineTo(sx+z*.04,sy+z);ctx.closePath();ctx.fillStyle='#8c63d6';ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.arc(sx+z*.5,sy+z*.68,z*.17,0,7);ctx.fillStyle='#bfe8ff';ctx.fill();ctx.stroke();ctx.fillStyle=Math.sin(now/300)>0?'#ff7ab8':'#5a3a7a';ctx.beginPath();ctx.arc(sx+z*.5,sy+z*.24,z*.06,0,7);ctx.fill();return}
 if(b==HS.B_AERATOR){const a=S.aer.find(a=>a.x==x&&a.y==y);box(.1,.25,.8,.75,.18,'#5e7d8c');box(.24,.42,.52,.42,.12,'#183040');const f=a?Math.min(1,a.lichen/4):0;ctx.fillStyle='#7fcf6a';ctx.fillRect(sx+z*.27,sy+z*(.81-.36*f),z*.46,z*.36*f);
  if(a&&a.on)for(let k=0;k<3;k++){const p=((now/700+k/3)%1);ctx.fillStyle=`rgba(190,235,255,${1-p})`;ctx.beginPath();ctx.arc(sx+z*(.35+k*.15),sy+z*(.22-p*.5),z*.07,0,7);ctx.fill()}return}
 if(b==HS.B_FARM){const f=S.farms.find(f=>f.x==x&&f.y==y),g=f?Math.min(1,f.g/HS.GROW):0;box(.04,.72,.92,.28,.1,'#7a4b2a');ctx.fillStyle='#4a2c18';ctx.fillRect(sx+z*.1,sy+z*.74,z*.8,z*.06);
  for(let k=0;k<3;k++){const px=sx+z*(.22+k*.28),h=z*(.12+.5*g)*(k==1?1:.85),sw=Math.sin(now/600+k)*z*.03;ctx.strokeStyle='#3f8f3a';ctx.lineWidth=z*.05;ctx.beginPath();ctx.moveTo(px,sy+z*.74);ctx.quadraticCurveTo(px+sw,sy+z*.74-h*.6,px+sw*2,sy+z*.74-h);ctx.stroke();
   ctx.fillStyle='#6fcf5a';ctx.beginPath();ctx.ellipse(px+sw*1.5-z*.06,sy+z*.74-h*.6,z*.08,z*.04,-.6,0,7);ctx.fill();if(g>=1){ctx.fillStyle='#ffd34d';ctx.beginPath();ctx.arc(px+sw*2,sy+z*.74-h,z*.07,0,7);ctx.fill();ctx.strokeStyle=OUT;ctx.lineWidth=lw*.7;ctx.stroke()}}return}
 if(b==HS.B_DYNAMO){box(.06,.38,.88,.62,.14,'#8a7448');const on=S.cols.some(c=>c.state=='cranking'&&c.job&&c.job.x==x&&c.job.y==y),a=on?now/150:0;ctx.save();ctx.translate(sx+z*.5,sy+z*.66);ctx.rotate(a);ctx.beginPath();ctx.arc(0,0,z*.2,0,7);ctx.fillStyle='#d8c08a';ctx.fill();ctx.stroke();
  for(let k=0;k<4;k++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(z*.18,0);ctx.stroke()}ctx.restore();ctx.fillStyle=on?'#ffe066':'#6b5a35';ctx.font=`bold ${z*.24|0}px system-ui`;ctx.textAlign='center';ctx.fillText('⚡',sx+z*.82,sy+z*.36);return}
 if(b==HS.B_DESK){box(.04,.5,.92,.14,.05,'#9a6e46');box(.1,.62,.12,.38,.03,'#7a5534');box(.78,.62,.12,.38,.03,'#7a5534');box(.3,.34,.34,.16,.03,'#e9e2d0');ctx.fillStyle=S.jobs.some(j=>j.type=='research'&&j.taken&&j.x==x&&j.y==y)?'#ffe9a0':'#665';ctx.beginPath();ctx.arc(sx+z*.78,sy+z*.36,z*.09,0,7);ctx.fill();ctx.stroke();return}
 if(b==HS.B_SCRUB){box(.14,.2,.72,.8,.25,'#6f8798');ctx.save();ctx.translate(sx+z*.5,sy+z*.55);ctx.rotate(m&&m.on?now/120:0);for(let k=0;k<3;k++){ctx.rotate(2.094);ctx.fillStyle='#cfe3ee';ctx.beginPath();ctx.ellipse(z*.12,0,z*.13,z*.05,0,0,7);ctx.fill()}ctx.restore();ctx.beginPath();ctx.arc(sx+z*.5,sy+z*.55,z*.05,0,7);ctx.fillStyle=OUT;ctx.fill();return}
 if(b==HS.B_COT){box(.02,.62,.96,.2,.08,'#eef0f8');box(.02,.82,.08,.18,.02,'#8a90a8');box(.9,.82,.08,.18,.02,'#8a90a8');box(.06,.5,.26,.16,.07,'#ffffff');ctx.fillStyle='#ff5d6c';ctx.fillRect(sx+z*.58,sy+z*.66,z*.2,z*.06);ctx.fillRect(sx+z*.65,sy+z*.6,z*.06,z*.18);return}
 if(b==HS.B_COUCH){box(.02,.45,.96,.4,.16,'#b44f86');box(.02,.6,.2,.4,.08,'#9a3e70');box(.78,.6,.2,.4,.08,'#9a3e70');box(.22,.62,.56,.2,.06,'#d06aa2');return}
 if(b==HS.B_COOLER){box(.12,.18,.76,.82,.16,'#7fcbe8');ctx.fillStyle=m&&m.on?'#ffffff':'#3d6f85';ctx.font=`bold ${z*.42|0}px system-ui`;ctx.textAlign='center';ctx.fillText('❄',sx+z*.5,sy+z*.74);return}
 if(b==HS.B_VAT){box(.14,.16,.72,.84,.2,'#3b6b5c');box(.24,.28,.52,.56,.14,'rgba(120,240,190,.55)');if(m&&m.on)for(let k=0;k<4;k++){const p=((now/900+k/4)%1);ctx.fillStyle='rgba(230,255,245,.85)';ctx.beginPath();ctx.arc(sx+z*(.34+(k%2)*.3),sy+z*(.8-p*.48),z*.045,0,7);ctx.fill()}return}}
// ---------- settlers ----------
const SKIN=['#f2c9a0','#c98f62','#f6d9c2'],HAIR=['#5a3320','#1f1b24','#d98a3a'];
function drawSettler(c,k,now){const z=cam.z,[sx,sy]=w2s(c.x,c.y),cx=sx+z/2,ph=k*1.7,lw=Math.max(1.2,z/16);
 if(!c.alive){ctx.save();ctx.translate(cx,sy+z*.86);ctx.fillStyle='#6c6f7d';rr(-z*.4,-z*.12,z*.55,z*.24,z*.1);ctx.fill();ctx.strokeStyle=OUT;ctx.lineWidth=lw;ctx.stroke();ctx.beginPath();ctx.arc(z*.28,0,z*.2,0,7);ctx.fillStyle='#9a9aa8';ctx.fill();ctx.stroke();
  ctx.strokeStyle=OUT;ctx.beginPath();ctx.moveTo(z*.22,-z*.06);ctx.lineTo(z*.3,z*.02);ctx.moveTo(z*.3,-z*.06);ctx.lineTo(z*.22,z*.02);ctx.stroke();ctx.restore();return}
 const moving=c.path&&c.path.length>0,bob=moving?Math.abs(Math.sin(now/110+ph))*z*.05:Math.sin(now/600+ph)*z*.025,dir=c.path&&c.path[0]?Math.sign(c.path[0][0]-c.x)||c.dir||1:c.dir||1;c.dir=dir;
 // legs
 ctx.strokeStyle='#2a2238';ctx.lineWidth=z*.09;ctx.lineCap='round';const st=moving?Math.sin(now/110+ph)*z*.1:0;ctx.beginPath();ctx.moveTo(cx-z*.08,sy+z*.8);ctx.lineTo(cx-z*.08+st,sy+z*.97);ctx.moveTo(cx+z*.08,sy+z*.8);ctx.lineTo(cx+z*.08-st,sy+z*.97);ctx.stroke();
 // body
 rr(cx-z*.2,sy+z*.5-bob,z*.4,z*.34,z*.14);ctx.fillStyle=`hsl(${c.hue},60%,55%)`;ctx.fill();ctx.strokeStyle=OUT;ctx.lineWidth=lw;ctx.stroke();
 if(c.carry){rr(cx+dir*z*.12-z*.1,sy+z*.52-bob,z*.2,z*.16,z*.05);ctx.fillStyle='#7fcf6a';ctx.fill();ctx.stroke()}
 // head
 const hy=sy+z*.3-bob,hr=z*.25;ctx.beginPath();ctx.arc(cx,hy,hr,0,7);ctx.fillStyle=c.sick?'#cfe0a0':SKIN[k%3];ctx.fill();ctx.stroke();
 ctx.fillStyle=HAIR[k%3];ctx.beginPath();ctx.arc(cx,hy-hr*.2,hr*.98,Math.PI*1.05,Math.PI*1.95);ctx.fill();
 // eyes (blink) and mouth by stress
 const blink=((now/1000+ph*1.3)%4)<0.12,ex=dir*z*.05;ctx.fillStyle=OUT;
 if(c.state=='breakdown'){ctx.font=`bold ${z*.22|0}px system-ui`;ctx.textAlign='center';ctx.fillText('@ @',cx,hy+z*.04)}
 else if(blink){ctx.fillRect(cx-z*.11+ex,hy,z*.07,z*.02);ctx.fillRect(cx+z*.04+ex,hy,z*.07,z*.02)}else{ctx.beginPath();ctx.arc(cx-z*.08+ex,hy,z*.035,0,7);ctx.arc(cx+z*.08+ex,hy,z*.035,0,7);ctx.fill()}
 ctx.strokeStyle=OUT;ctx.lineWidth=lw*.8;ctx.beginPath();if(c.st<40)ctx.arc(cx+ex,hy+z*.07,z*.07,.2,Math.PI-.2);else if(c.st<70){ctx.moveTo(cx-z*.06+ex,hy+z*.11);ctx.lineTo(cx+z*.06+ex,hy+z*.11)}else ctx.arc(cx+ex,hy+z*.16,z*.07,Math.PI+.3,-.3);ctx.stroke();
 if(c.breath<60){ctx.fillStyle='rgba(120,180,255,.8)';ctx.beginPath();ctx.arc(cx+dir*z*.3,hy-z*.25+Math.sin(now/200)*z*.04,z*.06,0,7);ctx.fill()}
 // tool
 if(c.state=='digging'){const a=Math.sin(now/90)*.8;ctx.save();ctx.translate(cx+dir*z*.18,sy+z*.6);ctx.rotate(a*dir);ctx.strokeStyle='#8a6a40';ctx.lineWidth=z*.05;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(dir*z*.3,-z*.2);ctx.stroke();ctx.strokeStyle='#cfd6e4';ctx.beginPath();ctx.moveTo(dir*z*.22,-z*.3);ctx.lineTo(dir*z*.38,-z*.1);ctx.stroke();ctx.restore()}
 if(c.state=='relaxing'||c.state=='resting'){ctx.fillStyle='#cfe';ctx.font=`bold ${z*.25|0}px system-ui`;ctx.textAlign='center';ctx.fillText('z',cx+z*.3,hy-z*.3-((now/400)%1)*z*.2)}
 if(c.trapped){ctx.fillStyle=TH.bad;ctx.font=`bold ${z*.5|0}px system-ui`;ctx.textAlign='center';ctx.fillText('!',cx,sy-z*.12)}
 // status pips
 const pw=z*.7;bar(cx-pw/2,sy-z*.04,pw,Math.max(3,z*.08),c.breath/100,c.breath>50?'#7fd6ff':c.breath>25?TH.warn:TH.bad)}
// ---------- main draw ----------
function draw(now){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle=TH.bg;ctx.fillRect(0,0,VW,VH);const z=cam.z;checkTiles();
 const[ox,oy]=w2s(0,0),mw=HS.W*z,mh=HS.H*z;
 ctx.imageSmoothingEnabled=true;ctx.drawImage(tileC,0,0,tileC.width,tileC.height,ox,oy,mw,mh); // backdrop (open tiles) + solids
 renderGas(overlay==2?0:overlay);ctx.drawImage(gasC,ox,oy,mw,mh);
 // redraw solids over gas so gas stays inside caves
 ctx.drawImage(solidC(),0,0,tileC.width,tileC.height,ox,oy,mw,mh);
 if(overlay==2){renderGas(2);ctx.globalAlpha=.75;ctx.drawImage(gasC,ox,oy,mw,mh);ctx.globalAlpha=1}
 const[x0,y0]=s2w(0,0),[x1,y1]=s2w(VW,VH);
 for(let y=Math.max(0,y0|0);y<Math.min(HS.H,y1+1);y++)for(let x=Math.max(0,x0|0);x<Math.min(HS.W,x1+1);x++){const b=S.b[HS.idx(x,y)];if(b){const[sx,sy]=w2s(x,y);drawBuilding(b,x,y,sx,sy,z,now)}}
 for(const j of S.jobs){const[sx,sy]=w2s(j.x,j.y);if(sx<-z||sy<-z||sx>VW||sy>VH)continue;const col=j.unr?TH.bad:j.type=='dig'?'#ffc94a':'#5fe0ff';
  ctx.setLineDash([z*.18,z*.12]);ctx.lineWidth=Math.max(1.5,z/14);rr(sx+z*.08,sy+z*.08,z*.84,z*.84,z*.16);ctx.strokeStyle=col;ctx.stroke();ctx.setLineDash([]);
  if(j.type=='build'&&!j.unr){ctx.globalAlpha=.35;rr(sx+z*.1,sy+z*.1,z*.8,z*.8,z*.15);ctx.fillStyle='#5fe0ff';ctx.fill();ctx.globalAlpha=1}
  if(j.unr){ctx.strokeStyle=TH.bad;ctx.lineWidth=Math.max(2,z/10);ctx.beginPath();ctx.moveTo(sx+z*.3,sy+z*.3);ctx.lineTo(sx+z*.7,sy+z*.7);ctx.moveTo(sx+z*.7,sy+z*.3);ctx.lineTo(sx+z*.3,sy+z*.7);ctx.stroke()}
  if(z>18){ctx.beginPath();ctx.arc(sx+z*.2,sy+z*.2,z*.14,0,7);ctx.fillStyle='#0f1730';ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#fff';ctx.font=`bold ${z*.18|0}px system-ui`;ctx.textAlign='center';ctx.fillText(j.pri||5,sx+z*.2,sy+z*.26)}}
 S.cols.forEach((c,k)=>drawSettler(c,k,now));
 if(insp){const[sx,sy]=w2s(insp.x,insp.y);rr(sx,sy,z,z,z*.18);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke()}
 // vignette
 const vg=ctx.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)*.35,VW/2,VH/2,Math.max(VW,VH)*.75);vg.addColorStop(0,'rgba(5,6,14,0)');vg.addColorStop(1,'rgba(5,6,14,.7)');ctx.fillStyle=vg;ctx.fillRect(0,0,VW,VH);
 drawUI(now)}
let solidCache=null,solidVer=null;function solidC(){if(solidCache&&solidVer===lastT)return solidCache;const c=solidCache||document.createElement('canvas');c.width=tileC.width;c.height=tileC.height;const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);
 for(let y=0;y<HS.H;y++)for(let x=0;x<HS.W;x++)if(S.t[HS.idx(x,y)])g.drawImage(tileC,x*TP,y*TP,TP,TP,x*TP,y*TP,TP,TP);solidCache=c;solidVer=lastT;return c}
function colonyAir(){let o=0,n=0;for(const c of S.cols)if(c.alive){const i=HS.idx(Math.round(c.x),Math.round(c.y));o+=S.o2[i];n++}return n?o/n:0}
function drawUI(now){const v=vitRect();panelBox(v.x,v.y,v.w,v.h,14);
 const day=(S.time/HS.CYCLE|0)+1;ctx.fillStyle=TH.txt;ctx.font='bold 14px system-ui';ctx.textAlign='left';ctx.fillText(`Hollowstead`,v.x+12,v.y+22);
 ctx.fillStyle=TH.acc;ctx.font='bold 12px system-ui';ctx.fillText(`Cycle ${day}/${HS.WIN_CYCLES}${S.won?' ★':''}`,v.x+110,v.y+22);
 const un=S.jobs.filter(j=>j.unr).length;if(un){ctx.fillStyle=TH.bad;ctx.textAlign='right';ctx.fillText(`${un} unreachable`,v.x+v.w-10,v.y+22);ctx.textAlign='left'}
 const air=colonyAir(),bw=(v.w-24)/3-6;
 [['O₂',Math.min(1,air/1.2),air<.35?TH.bad:air<.6?TH.warn:'#7fd6ff',air.toFixed(2)],['⚡',S.bat/HS.BAT_CAP,'#ffd84a',`${S.bat|0}`],['🍲',Math.min(1,S.res.food/30),S.res.food<4?TH.bad:TH.good,`${S.res.food|0}`]].forEach(([l,f,c,t],i)=>{const x=v.x+12+i*(bw+6);ctx.fillStyle=TH.sub;ctx.font='11px system-ui';ctx.fillText(l+' '+t,x,v.y+40);bar(x,v.y+45,bw,7,f,c)});
 ctx.fillStyle=TH.sub;ctx.font='11px system-ui';ctx.fillText(`🪨 ${S.res.stone|0}   🌿 ${S.res.lichen.toFixed(0)}   ${(HS.TECH[S.rs.cur]?'🔬 '+HS.TECH[S.rs.cur].name+' '+(S.rs.pts|0)+'/'+HS.TECH[S.rs.cur].cost:'🔬 idle')}   P${pri}`,v.x+12,v.y+68);
 S.cols.forEach((c,k)=>{const y=v.y+84+k*(narrow()?9:11),x=v.x+12;ctx.fillStyle=c.alive?(c.trapped||c.breath<40||c.st>70||c.sick?TH.warn:TH.txt):'#777';ctx.font=(narrow()?'9px':'10px')+' system-ui';
  ctx.fillText(`${c.name}`,x,y);if(c.alive){const bx=x+40,w=Math.min(46,(v.w-150)/3);bar(bx,y-6,w,5,c.breath/100,'#7fd6ff');bar(bx+w+4,y-6,w,5,c.cal/HS.CAL_MAX,TH.good);bar(bx+2*w+8,y-6,w,5,c.st/100,c.st>70?TH.bad:'#c98cff');ctx.fillStyle=TH.sub;ctx.fillText(c.trapped?'TRAPPED':c.state,bx+3*w+14,y)}else{ctx.fillText('  ✝ '+c.state,x+40,y)}});
 const cr=clusterRect();panelBox(cr.x,cr.y,cr.w,cr.h,14);
 for(const b of buttons()){if(b.cat){const c=b.cat;rr(b.x,b.y,b.w,b.h,12);ctx.fillStyle=b.on?TH.accDim:TH.panel;ctx.fill();ctx.strokeStyle=b.on?TH.acc:TH.edge;ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle=TH.txt;ctx.textAlign='center';ctx.font=`${b.w<50?18:22}px system-ui`;ctx.fillText(c.icon,b.x+b.w/2,b.y+28);ctx.font=`bold ${b.w<50?9:11}px system-ui`;ctx.fillStyle=b.on?'#fff':TH.sub;ctx.fillText(c.l,b.x+b.w/2,b.y+48);continue}
  if(b.item){ctx.globalAlpha=b.dim?.5:1;rr(b.x,b.y,b.w,b.h,12);ctx.fillStyle=b.on?TH.accDim:TH.panel2;ctx.fill();ctx.strokeStyle=b.on?TH.acc:TH.edge;ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle=TH.txt;ctx.textAlign='center';ctx.font='20px system-ui';ctx.fillText(ICON[b.id]||'',b.x+b.w/2,b.y+24);
   ctx.font=`bold ${b.w<80?9:11}px system-ui`;ctx.fillText(b.dim?'🔒 '+NAME[b.id]:NAME[b.id],b.x+b.w/2,b.y+42,b.w-6);ctx.fillStyle=TH.sub;ctx.font='9px system-ui';ctx.fillText(BT[b.id]?costTxt(b.id):b.id=='pm'||b.id=='pp'?'now P'+pri:'',b.x+b.w/2,b.y+56,b.w-6);ctx.globalAlpha=1;continue}
  if(b.tech)continue;
  if(b.round){rr(b.x,b.y,b.w,b.h,b.h/2);ctx.fillStyle=b.on?TH.acc:TH.panel2;ctx.fill();ctx.strokeStyle=TH.edge;ctx.lineWidth=1.2;ctx.stroke();ctx.fillStyle=b.on?'#08202a':TH.txt;ctx.textAlign='center';ctx.font='bold 13px system-ui';ctx.fillText(b.l,b.x+b.w/2,b.y+b.h/2+5)}}
 if(insp)drawInspector();
 if(panel){const ks=Object.keys(HS.TECH),pw=Math.min(VW-20,380),px=(VW-pw)/2,rh=VH<500?46:60;panelBox(px,50,pw,ks.length*rh+56,16);ctx.fillStyle=TH.txt;ctx.font='bold 16px system-ui';ctx.textAlign='left';ctx.fillText('🔬 Research',px+14,80);
  for(const b of buttons()){if(!b.tech&&b.id!='research')continue;if(b.id=='research'&&b.l){rr(b.x,b.y,b.w,b.h,b.h/2);ctx.fillStyle=TH.panel2;ctx.fill();ctx.strokeStyle=TH.edge;ctx.stroke();ctx.fillStyle=TH.txt;ctx.textAlign='center';ctx.font='bold 12px system-ui';ctx.fillText(b.l,b.x+b.w/2,b.y+20);continue}
   if(!b.tech)continue;const k=b.tech,tc=HS.TECH[k],dn=S.rs.done[k],av=!tc.req||S.rs.done[tc.req],cur=S.rs.cur==k;rr(b.x,b.y,b.w,b.h,12);ctx.fillStyle=dn?'#1f4a34':cur?TH.accDim:av?TH.panel2:'#141a2c';ctx.fill();ctx.strokeStyle=cur?TH.acc:TH.edge;ctx.stroke();
   ctx.fillStyle=av||dn?TH.txt:'#6b7390';ctx.textAlign='left';ctx.font='bold 13px system-ui';ctx.fillText((dn?'✔ ':av?'':'🔒 ')+tc.name+'  ·  '+tc.cost+' pts',b.x+10,b.y+19);ctx.font='11px system-ui';ctx.fillStyle=TH.sub;ctx.fillText(tc.desc+(tc.req&&!dn?'  (needs '+HS.TECH[tc.req].name+')':''),b.x+10,b.y+(rh>50?38:34),b.w-16);
   const pr=dn?1:cur?S.rs.pts/tc.cost:((S.rs.prog||{})[k]||0)/tc.cost;if(pr>0&&rh>50)bar(b.x+10,b.y+b.h-10,b.w-20,4,pr,TH.acc)}}
 if(toastT>0){ctx.font='bold 12px system-ui';const tw=Math.min(VW-20,ctx.measureText(toast).width+28),ty=insp?inspRect().y-40:VH-BAR_H-(menu?124:46);panelBox(VW/2-tw/2,ty,tw,30,15);ctx.fillStyle='#ffe39a';ctx.textAlign='center';ctx.fillText(toast,VW/2,ty+19,tw-16)}
 const big=(title,col,sub,btn)=>{const w=Math.min(VW-24,360);panelBox(VW/2-w/2,VH/2-80,w,180,18);ctx.fillStyle=col;ctx.font='bold 24px system-ui';ctx.textAlign='center';ctx.fillText(title,VW/2,VH/2-36);ctx.fillStyle=TH.sub;ctx.font='13px system-ui';ctx.fillText(sub,VW/2,VH/2-4,w-20);
  const b=buttons().find(b=>b.id==btn);rr(b.x,b.y,b.w,b.h,b.h/2);ctx.fillStyle=TH.acc;ctx.fill();ctx.fillStyle='#08202a';ctx.font='bold 15px system-ui';ctx.fillText(b.l,VW/2,b.y+29)};
 const dayN=(S.time/HS.CYCLE|0)+1;
 if(S.won&&!winSeen&&!S.over)big('Hollowstead endures!',TH.good,`All settlers survived ${HS.WIN_CYCLES} cycles. You win!`,'wincont');
 if(S.over)big('The colony has fallen',TH.bad,`Everyone died after ${(S.time|0)}s (cycle ${dayN}).`,'restart')}
function drawInspector(){const r=inspRect(),{x,y}=insp,i=HS.idx(x,y);panelBox(r.x,r.y,r.w,r.h,14);ctx.textAlign='left';
 const MN={0:'Open cave',1:'Stone',2:'Soil',3:'Lichen',4:'Bedrock'},col=S.cols.find(c=>Math.abs(c.x-x)<0.8&&Math.abs(c.y-y)<0.9),bn={1:'Ladder',2:'Lichen Aerator',3:'Farm Plot',4:'Crank Dynamo',5:'Colony Pod',6:'Research Desk',7:'Scrubber',8:'Med Cot',9:'Couch',10:'Cooler',11:'O₂ Vat'}[S.b[i]];
 const job=S.jobs.find(j=>j.x==x&&j.y==y);ctx.fillStyle=TH.txt;ctx.font='bold 13px system-ui';ctx.fillText(col?`${col.name} · ${col.alive?(col.trapped?'TRAPPED':col.state):'dead'}`:(bn||MN[S.t[i]])+`  (${x},${y})`,r.x+12,r.y+20,r.w-50);
 ctx.font='11px system-ui';ctx.fillStyle=TH.sub;
 if(col&&col.alive){ctx.fillText(`Air ${col.breath|0}% · ${col.cal|0} kcal · Stress ${col.st|0}${col.sick?' · Grey Cough':''}`,r.x+12,r.y+40);ctx.fillText(`Health ${col.hp|0} · ${col.job?'Job: '+col.job.type:'No job'}${col.carry?' · carrying lichen':''}`,r.x+12,r.y+56)}
 else{ctx.fillText(S.t[i]?`Solid ${MN[S.t[i]]} · ${S.T[i].toFixed(1)}°C`:`O₂ ${S.o2[i].toFixed(2)} kg · CO₂ ${S.co2[i].toFixed(2)} kg · ${S.T[i].toFixed(1)}°C`,r.x+12,r.y+40);ctx.fillText(`Germs ${S.G[i]|0}${S.b[i]==2?' · lichen '+(S.aer.find(a=>a.x==x&&a.y==y)||{lichen:0}).lichen.toFixed(1):''}`,r.x+12,r.y+56)}
 if(job){ctx.fillStyle=job.unr?TH.bad:TH.acc;ctx.fillText(`Job: ${job.type}${job.bt?' '+(NAME[Object.keys(BT).find(k=>BT[k]==job.bt)]||''):''} · P${job.pri||5}${job.unr?' · UNREACHABLE':job.taken?' · '+job.taken.name:' · waiting'}`,r.x+12,r.y+74,r.w-20)}
 for(const b of buttons())if(b.id=='insp-close'){rr(b.x,b.y,b.w,b.h,b.h/2);ctx.fillStyle=TH.panel2;ctx.fill();ctx.strokeStyle=TH.edge;ctx.stroke();ctx.fillStyle=TH.txt;ctx.textAlign='center';ctx.font='bold 12px system-ui';ctx.fillText('✕',b.x+b.w/2,b.y+17)}}
// ---------- loop ----------
let last=performance.now(),acc=0,fps=60,fpsAcc=0,fpsN=0;
function loop(t){const dt=Math.min(.1,(t-last)/1000);last=t;toastT-=dt;fpsAcc+=dt;fpsN++;if(fpsAcc>1){fps=fpsN/fpsAcc;fpsAcc=0;fpsN=0}
 saveT+=dt;if(saveT>30&&!S.over){saveT=0;doSave(true)}
 if(!paused&&!S.over){acc+=dt*speed;let n=0;while(acc>=.05&&n<12){HS.step(.05);acc-=.05;n++}if(n>=12)acc=0}draw(t);requestAnimationFrame(loop)}
window.__hs={get S(){return S},HS,press,tapWorld,cam,buttons,get fps(){return fps},get tool(){return tool},get menu(){return menu},get insp(){return insp}};requestAnimationFrame(loop);
if(localStorage.hsSave&&!(()=>{try{return JSON.parse(localStorage.hsSave).over}catch(e){return true}})()){doLoad()}else say('Tap a category below to dig or build · drag to pan · pinch to zoom');
let lastLog=0;setInterval(()=>{if(S.log.length>lastLog){say(S.log[S.log.length-1]);lastLog=S.log.length}else if(S.log.length<lastLog)lastLog=S.log.length},500);
