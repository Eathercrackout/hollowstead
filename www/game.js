// Hollowstead UI: rendering, pan/pinch, tools, speed.
const cv=document.getElementById('c'),ctx=cv.getContext('2d');let VW,VH,DPR;
function rs(){DPR=devicePixelRatio||1;VW=innerWidth;VH=innerHeight;cv.width=VW*DPR;cv.height=VH*DPR}addEventListener('resize',rs);rs();
let S=HS.newGame(),speed=1,paused=false,tool='dig',overlay=0,toast='',toastT=0,pri=5,tbScroll=0,panel=false,saveT=0;
const OVL=['Normal','O₂ view','Heat view','Germ view'];
const cam={x:HS.W/2,y:HS.H/2,z:28};
const COL={1:'#6b5d55',2:'#a07a52',3:'#4f9a5a',4:'#2a2430'};
const BT={ladder:HS.B_LADDER,aerator:HS.B_AERATOR,farm:HS.B_FARM,dynamo:HS.B_DYNAMO,desk:HS.B_DESK,scrub:HS.B_SCRUB,cot:HS.B_COT,couch:HS.B_COUCH,cooler:HS.B_COOLER};
const TOOLS=[['dig','⛏ Dig'],['ladder','🪜 Ladder'],['aerator','💨 Aerator'],['farm','🌱 Farm'],['dynamo','⚙ Dynamo'],['desk','📘 Desk'],['scrub','🫧 Scrubber'],['cot','🛏 Med Cot'],['couch','🛋 Couch'],['cooler','❄ Cooler'],['prio','🔢 Set Prio'],['cancel','✖ Cancel']];
const w2s=(x,y)=>[(x-cam.x)*cam.z+VW/2,(y-cam.y)*cam.z+VH/2],s2w=(x,y)=>[(x-VW/2)/cam.z+cam.x,(y-VH/2)/cam.z+cam.y];
function say(s){toast=s;toastT=2.5}
const locked=id=>BT[id]&&HS.LOCK[BT[id]]&&!S.rs.done[HS.LOCK[BT[id]]];
// ---------- UI layout: scrollable tool row + fixed system row ----------
const TB_H=46,SY_H=36,TB_W=84;
function tbMax(){return Math.max(0,TOOLS.length*(TB_W+4)+8-VW)}
function buttons(){const bs=[],y=VH-TB_H-8;tbScroll=Math.max(0,Math.min(tbMax(),tbScroll));
 TOOLS.forEach(([id,l],i)=>{const x=6+i*(TB_W+4)-tbScroll;if(x>-TB_W&&x<VW)bs.push({id,l,x,y,w:TB_W,h:TB_H,on:tool==id,dim:locked(id),tb:1})});
 const sys=[['ovl',OVL[overlay]],['research','🔬 Research'],['pm','P−'],['pv','P'+pri],['pp','P+'],['save','💾 Save'],['load','📂 Load']],sw=(VW-12)/sys.length;
 sys.forEach(([id,l],i)=>bs.push({id,l,x:6+i*sw,y:y-SY_H-4,w:sw-4,h:SY_H,on:(id=='ovl'&&overlay>0)||(id=='research'&&panel)}));
 [['pause',paused?'▶':'II'],['s1','1×'],['s2','2×'],['s3','4×']].forEach(([id,l],i)=>bs.push({id,l,x:VW-4*46-6+i*46,y:VW<600?112:8,w:42,h:36,on:(id=='s1'&&speed==1)||(id=='s2'&&speed==2)||(id=='s3'&&speed==4)||(id=='pause'&&paused)}));
 if(panel){const ks=Object.keys(HS.TECH),pw=Math.min(VW-20,360),px=(VW-pw)/2;const rh=VH<500?44:58;ks.forEach((k,i)=>bs.push({id:'tech:'+k,x:px+10,y:90+i*rh,w:pw-20,h:rh-4,tech:k}));bs.push({id:'research',l:'Close',x:px+pw-90,y:56,w:80,h:28})}
 if(S.over)bs.push({id:'restart',l:'New colony',x:VW/2-80,y:VH/2+30,w:160,h:46});return bs}
function doSave(silent){try{localStorage.hsSave=HS.save();if(!silent)say('Colony saved')}catch(e){say('Save failed: '+e.message)}}
function doLoad(){try{if(!localStorage.hsSave)return say('No save found');S=HS.load(localStorage.hsSave);say('Colony loaded')}catch(e){say('Load failed')}}
function press(id){if(id=='ovl')overlay=(overlay+1)%OVL.length;else if(id=='pause')paused=!paused;else if(id[0]=='s'&&id.length==2){speed={s1:1,s2:2,s3:4}[id];paused=false}
 else if(id=='research')panel=!panel;else if(id.startsWith('tech:')){const k=id.slice(5),tc=HS.TECH[k];if(S.rs.done[k])say(tc.name+' already researched');else if(!HS.pickTech(k))say('Requires '+HS.TECH[tc.req].name+' first');else say('Researching '+tc.name+(S.misc.some(m=>m.bt==HS.B_DESK)?'':' — build a Desk'))}
 else if(id=='pm')pri=Math.max(1,pri-1);else if(id=='pp')pri=Math.min(9,pri+1);else if(id=='pv')pri=pri%9+1;
 else if(id=='save')doSave();else if(id=='load')doLoad();
 else if(id=='restart'){S=HS.newGame();cam.x=HS.W/2;cam.y=HS.H/2}else{tool=id;if(locked(id))say('Locked — research '+HS.TECH[HS.LOCK[BT[id]]].name)}}
function tapWorld(px,py){const[wx,wy]=s2w(px,py),x=Math.floor(wx),y=Math.floor(wy);if(x<0||y<0||x>=HS.W||y>=HS.H)return;
 const i=HS.idx(x,y);
 if(tool=='dig'){if(!HS.addJob('dig',x,y,0,pri))say(S.t[i]==HS.BEDROCK?'Bedrock is too hard':'Nothing to dig')}
 else if(tool=='cancel')HS.cancelAt(x,y);
 else if(tool=='prio'){if(HS.setPri(x,y,pri))say('Priority set to '+pri);else say('No job on that tile')}
 else{const bt=BT[tool];if(locked(tool))return say('Locked — research '+HS.TECH[HS.LOCK[bt]].name);if(!HS.addJob('build',x,y,bt,pri))say(bt==HS.B_FARM?'Farms need an open tile on top of soil':'Need an open, empty tile');
  else if(!Object.entries(HS.COST[bt]).every(([k,v])=>S.res[k]>=v))say('Queued — needs '+Object.entries(HS.COST[bt]).map(([k,v])=>v+' '+k).join(', '))}}
// ---------- input: pan, pinch, tap, drag-paint for dig ----------
const ptrs=new Map();let gest=null;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(ptrs.size==1)gest={sx:e.clientX,sy:e.clientY,t:performance.now(),moved:false,multi:false,cx:cam.x,cy:cam.y,tb:e.clientY>VH-TB_H-8,ts:tbScroll};
 else if(ptrs.size==2){const[a,b]=[...ptrs.values()];gest.multi=true;gest.d0=Math.hypot(a.x-b.x,a.y-b.y);gest.z0=cam.z;gest.m0=s2w((a.x+b.x)/2,(a.y+b.y)/2)}});
cv.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId)||!gest)return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(ptrs.size>=2){const[a,b]=[...ptrs.values()];cam.z=Math.max(8,Math.min(80,gest.z0*Math.hypot(a.x-b.x,a.y-b.y)/gest.d0));
  const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;cam.x=gest.m0[0]-(mx-VW/2)/cam.z;cam.y=gest.m0[1]-(my-VH/2)/cam.z}
 else if(!gest.multi){const dx=e.clientX-gest.sx,dy=e.clientY-gest.sy;if(Math.hypot(dx,dy)>10)gest.moved=true;if(gest.moved){if(gest.tb)tbScroll=gest.ts-dx;else if(!panel){cam.x=gest.cx-dx/cam.z;cam.y=gest.cy-dy/cam.z}}}});
function up(e){if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);
 if(ptrs.size==0&&gest){if(!gest.moved&&!gest.multi){const b=buttons().find(b=>e.clientX>=b.x&&e.clientX<=b.x+b.w&&e.clientY>=b.y&&e.clientY<=b.y+b.h);if(b)press(b.id);else if(panel)panel=false;else if(!S.over)tapWorld(e.clientX,e.clientY)}gest=null}}
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('wheel',e=>{e.preventDefault();const[wx,wy]=s2w(e.clientX,e.clientY);cam.z=Math.max(8,Math.min(80,cam.z*(e.deltaY<0?1.1:0.9)));cam.x=wx-(e.clientX-VW/2)/cam.z;cam.y=wy-(e.clientY-VH/2)/cam.z},{passive:false});
addEventListener('keydown',e=>{if(e.key==' ')paused=!paused;if('124'.includes(e.key))speed=+e.key});
// ---------- render ----------
function heat(t,a=1){const u=Math.max(0,Math.min(1,(t-0)/50));return `rgba(${u*255|0},${(1-Math.abs(u-.5)*2)*180|0},${(1-u)*255|0},${a})`}
function draw(){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#0b0a10';ctx.fillRect(0,0,VW,VH);const z=cam.z;
 const[x0,y0]=s2w(0,0),[x1,y1]=s2w(VW,VH);
 for(let y=Math.max(0,y0|0);y<Math.min(HS.H,y1+1);y++)for(let x=Math.max(0,x0|0);x<Math.min(HS.W,x1+1);x++){const i=HS.idx(x,y),[sx,sy]=w2s(x,y),m=S.t[i];
  if(m){ctx.fillStyle=overlay==2?heat(S.T[i],.6):COL[m];ctx.fillRect(sx,sy,z+.5,z+.5);if(m==3){ctx.fillStyle='#7ed08a';ctx.fillRect(sx+z*.2,sy+z*.3,z*.2,z*.2);ctx.fillRect(sx+z*.6,sy+z*.6,z*.15,z*.15)}
   if(z>14){ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(sx,sy+z*.85,z,z*.15)}}
  else{const o=S.o2[i],c=S.co2[i];
   if(overlay==1){ctx.fillStyle=`rgb(${Math.min(255,c*200)|0},${Math.min(255,o*90)|0},${Math.min(255,o*230)|0})`}else if(overlay==2){ctx.fillStyle=heat(S.T[i])}else if(overlay==3){const gm=Math.min(1,S.G[i]/150);ctx.fillStyle=`rgb(${30+gm*150|0},${30+gm*200|0},${40+gm*40|0})`}
   else{const a=Math.min(1,o+c);ctx.fillStyle=`rgba(${40+c*60|0},${40+o*30|0},${60+o*70|0},${.25+a*.5})`}
   ctx.fillRect(sx,sy,z+.5,z+.5);
   const b=S.b[i];if(b==HS.B_LADDER){ctx.strokeStyle='#c9a36a';ctx.lineWidth=Math.max(1,z/12);ctx.beginPath();ctx.moveTo(sx+z*.25,sy);ctx.lineTo(sx+z*.25,sy+z);ctx.moveTo(sx+z*.75,sy);ctx.lineTo(sx+z*.75,sy+z);for(let k=1;k<4;k++){ctx.moveTo(sx+z*.25,sy+z*k/4);ctx.lineTo(sx+z*.75,sy+z*k/4)}ctx.stroke()}
   if(b==HS.B_FARM){const f=S.farms.find(f=>f.x==x&&f.y==y),g=f?Math.min(1,f.g/HS.GROW):0;ctx.fillStyle='#5a3d28';ctx.fillRect(sx,sy+z*.8,z,z*.2);ctx.fillStyle=g>=1?'#e8c64a':'#5fbf4a';const h=z*(.15+.6*g);ctx.fillRect(sx+z*.2,sy+z*.8-h,z*.12,h);ctx.fillRect(sx+z*.45,sy+z*.8-h*.8,z*.12,h*.8);ctx.fillRect(sx+z*.7,sy+z*.8-h*.9,z*.12,h*.9)}
   if(b==HS.B_DYNAMO){ctx.fillStyle='#7a6a3a';ctx.fillRect(sx+z*.1,sy+z*.4,z*.8,z*.6);ctx.strokeStyle='#ffd24a';ctx.lineWidth=2;const a=S.cols.some(c=>c.job&&c.job.type=='operate'&&c.job.x==x&&c.job.y==y&&c.state=='cranking')?performance.now()/120:0;ctx.beginPath();ctx.arc(sx+z/2,sy+z*.65,z*.2,a,a+5);ctx.stroke()}
   if(b==HS.B_POD){ctx.fillStyle='#8a5cc2';ctx.beginPath();ctx.arc(sx+z/2,sy+z*.6,z*.4,Math.PI,0);ctx.fill();ctx.fillRect(sx+z*.1,sy+z*.6,z*.8,z*.4)}
   if(b>=HS.B_DESK){const m=S.misc.find(m=>m.x==x&&m.y==y);ctx.fillStyle={6:'#8a6a4a',7:'#4a7a8a',8:'#d8d8e8',9:'#a04a6a',10:'#6ac8e8'}[b];
    if(b==HS.B_DESK){ctx.fillRect(sx+z*.1,sy+z*.5,z*.8,z*.12);ctx.fillRect(sx+z*.15,sy+z*.6,z*.1,z*.4);ctx.fillRect(sx+z*.75,sy+z*.6,z*.1,z*.4);ctx.fillStyle='#fff';ctx.fillRect(sx+z*.35,sy+z*.32,z*.3,z*.18)}
    else if(b==HS.B_COT){ctx.fillRect(sx,sy+z*.65,z,z*.2);ctx.fillStyle='#e44';ctx.fillRect(sx+z*.4,sy+z*.4,z*.2,z*.2)}
    else if(b==HS.B_COUCH){ctx.fillRect(sx,sy+z*.55,z,z*.45);ctx.fillRect(sx,sy+z*.3,z*.2,z*.7)}
    else{ctx.fillRect(sx+z*.15,sy+z*.2,z*.7,z*.8);ctx.fillStyle=m&&m.on?'#fff':'#333';ctx.fillRect(sx+z*.3,sy+z*.4,z*.4,z*.2)}}
   if(b==HS.B_AERATOR){const a=S.aer.find(a=>a.x==x&&a.y==y);ctx.fillStyle='#5a6b78';ctx.fillRect(sx+z*.1,sy+z*.3,z*.8,z*.7);ctx.fillStyle=a&&a.on?'#7fd6ff':'#334';ctx.fillRect(sx+z*.1,sy+z*.95,z*.8*Math.min(1,(a?a.lichen:0)/4),z*.05);ctx.beginPath();ctx.arc(sx+z/2,sy+z*.55,z*.2,0,7);ctx.fill();
    if(a&&a.on){ctx.fillStyle='rgba(160,230,255,.7)';const t=performance.now()/400;for(let k=0;k<3;k++){const yy=((t+k/3)%1);ctx.beginPath();ctx.arc(sx+z*(.35+k*.15),sy+z*(.3-yy*.6),z*.06,0,7);ctx.fill()}}}}}
 // jobs
 for(const j of S.jobs){const[sx,sy]=w2s(j.x,j.y);ctx.strokeStyle=j.type=='dig'?'#ffcc33':'#66e0ff';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.strokeRect(sx+2,sy+2,z-4,z-4);ctx.setLineDash([]);if(z>16){ctx.fillStyle='#fff';ctx.font='bold '+(z*.35|0)+'px system-ui';ctx.textAlign='left';ctx.fillText(j.pri||5,sx+3,sy+z*.38)}
  if(j.type=='build'){ctx.globalAlpha=.4;ctx.fillStyle='#66e0ff';ctx.fillRect(sx+2,sy+2,z-4,z-4);ctx.globalAlpha=1}}
 // colonists
 for(const c of S.cols){const[sx,sy]=w2s(c.x,c.y);const cx=sx+z/2;
  ctx.fillStyle=c.alive?`hsl(${c.hue},55%,55%)`:'#555';ctx.fillRect(cx-z*.22,sy+z*.35,z*.44,z*.6);
  ctx.fillStyle=c.alive?'#f1d3b3':'#777';ctx.beginPath();ctx.arc(cx,sy+z*.22,z*.2,0,7);ctx.fill();
  if(c.alive&&c.state=='digging'){ctx.strokeStyle='#ddd';ctx.lineWidth=2;const a=Math.sin(performance.now()/90);ctx.beginPath();ctx.moveTo(cx,sy+z*.5);ctx.lineTo(cx+z*.4*Math.cos(a),sy+z*.5-z*.4*Math.abs(Math.sin(a)));ctx.stroke()}
  // breath bar
  ctx.fillStyle='#000a';ctx.fillRect(cx-z*.4,sy-z*.2,z*.8,4);ctx.fillStyle=c.breath>50?'#7fd6ff':c.breath>25?'#fc3':'#f43';ctx.fillRect(cx-z*.4,sy-z*.2,z*.8*Math.max(0,c.breath)/100,4)}
 // HUD
 ctx.fillStyle='#000a';ctx.fillRect(6,8,VW<600?VW-12:360,98);ctx.fillStyle='#fff';ctx.font='bold 13px system-ui';ctx.textAlign='left';
 const day=(S.time/120|0)+1;ctx.fillText(`Hollowstead · Cycle ${day} · ${(S.time|0)}s`,12,26);
 ctx.font='12px system-ui';ctx.fillText(`Stone ${S.res.stone|0}  Lichen ${S.res.lichen.toFixed(1)}  Food ${S.res.food|0}  ⚡${S.bat|0}/${HS.BAT_CAP}  Jobs ${S.jobs.length}`,12,44);
 S.cols.forEach((c,k)=>{ctx.fillStyle=c.alive?((c.breath<40||c.cal<200||c.st>70||c.sick)?'#f87':'#cde'):'#777';ctx.fillText(`${c.name}: ${c.alive?c.state+(c.sick?' 🤒':'')+' · air '+(c.breath|0)+' · kcal '+(c.cal|0)+' · stress '+(c.st|0):'✝ '+c.state}`,12,62+k*15)});
 ctx.fillStyle='#bcd';ctx.font='11px system-ui';const tc=HS.TECH[S.rs.cur];ctx.fillText(tc?`Research: ${tc.name} ${S.rs.pts|0}/${tc.cost}`:'Research: none (tap 🔬)',12,104);
 if(panel){const pw=Math.min(VW-20,360),px=(VW-pw)/2;ctx.fillStyle='#14121cf2';ctx.fillRect(px,50,pw,Object.keys(HS.TECH).length*(VH<500?44:58)+44);ctx.fillStyle='#fff';ctx.font='bold 15px system-ui';ctx.textAlign='left';ctx.fillText('Research tree',px+10,74)}
 for(const b of buttons()){if(b.tech){const k=b.tech,tc=HS.TECH[k],dn=S.rs.done[k],av=!tc.req||S.rs.done[tc.req];ctx.fillStyle=dn?'#245a34':S.rs.cur==k?'#2f6f8f':av?'#2a2836':'#1a1820';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle=av||dn?'#fff':'#777';ctx.textAlign='left';ctx.font='bold 13px system-ui';ctx.fillText((dn?'✔ ':'')+tc.name+'  ('+tc.cost+' pts)'+(tc.req&&!dn?'  needs '+HS.TECH[tc.req].name:''),b.x+8,b.y+20);ctx.font='12px system-ui';ctx.fillText(tc.desc,b.x+8,b.y+(VH<500?34:40));continue}
  ctx.globalAlpha=b.dim?.45:1;ctx.fillStyle=b.on?'#2f6f8f':'#1d1b26e0';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.strokeStyle='#ffffff33';ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.fillStyle='#fff';ctx.font='bold '+(b.w<70?11:13)+'px system-ui';ctx.textAlign='center';ctx.fillText(b.l,b.x+b.w/2,b.y+b.h/2+5);ctx.globalAlpha=1}
 if(tbMax()>0){ctx.fillStyle='#fff6';const y=VH-6,w=VW*VW/(VW+tbMax());ctx.fillRect(tbScroll/tbMax()*(VW-w),y,w,3)}
 if(toastT>0){ctx.fillStyle='#000c';ctx.fillRect(VW/2-150,VH-150,300,30);ctx.fillStyle='#fd7';ctx.textAlign='center';ctx.fillText(toast,VW/2,VH-130)}
 if(S.over){ctx.fillStyle='#000c';ctx.fillRect(0,VH/2-70,VW,150);ctx.fillStyle='#f65';ctx.font='bold 26px system-ui';ctx.textAlign='center';ctx.fillText('THE COLONY HAS FALLEN',VW/2,VH/2-25);ctx.fillStyle='#cde';ctx.font='14px system-ui';ctx.fillText(`Everyone died after ${(S.time|0)}s (cycle ${day}).`,VW/2,VH/2+5);
  const b=buttons().find(b=>b.id=='restart');ctx.fillStyle='#2f6f8f';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='#fff';ctx.font='bold 15px system-ui';ctx.fillText(b.l,VW/2,b.y+29)}}
let last=performance.now(),acc=0;
function loop(t){const dt=Math.min(.1,(t-last)/1000);last=t;toastT-=dt;
 saveT+=dt;if(saveT>30&&!S.over){saveT=0;doSave(true)}
 if(!paused&&!S.over){acc+=dt*speed;while(acc>=.05){HS.step(.05);acc-=.05}}draw();requestAnimationFrame(loop)}
window.__hs={get S(){return S},HS,press,tapWorld,cam,buttons,get tbScroll(){return tbScroll}};requestAnimationFrame(loop);
if(localStorage.hsSave){doLoad()}else say('Tap rock to dig · drag to pan · pinch to zoom');
let lastLog=0;setInterval(()=>{if(S.log.length>lastLog){say(S.log[S.log.length-1]);lastLog=S.log.length}else if(S.log.length<lastLog)lastLog=S.log.length},500);
