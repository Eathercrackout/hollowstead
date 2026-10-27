// Hollowstead simulation core (no DOM). Tiles, gas, colonists, jobs.
const HS=(()=>{
const W=60,H=44,EMPTY=0,ROCK=1,SOIL=2,LICHEN=3,BEDROCK=4;
const B_NONE=0,B_LADDER=1,B_AERATOR=2,B_FARM=3,B_DYNAMO=4,B_POD=5,B_DESK=6,B_SCRUB=7,B_COT=8,B_COUCH=9,B_COOLER=10;
const TECH={scrub:{name:'Air Scrubbing',cost:30,unlock:B_SCRUB,desc:'Scrubber: CO2 to O2, uses power'},medcot:{name:'Field Medicine',cost:30,unlock:B_COT,desc:'Med Cot: sick settlers heal fast'},couch:{name:'Leisure',cost:40,unlock:B_COUCH,desc:'Couch: relieves stress'},cooler:{name:'Thermal Control',cost:50,unlock:B_COOLER,desc:'Cooler: pumps heat out, uses power',req:'scrub'}};
const LOCK={7:'scrub',8:'medcot',9:'couch',10:'cooler'};
const BAT_CAP=1000,AER_W=6,FARM_W=2,CRANK_W=40,GROW=90,CAL_MAX=1000,CAL_RATE=1000/150;
const HARD={1:3,2:1.5,3:1.2};             // seconds to dig
const COST={1:{stone:1},2:{stone:10},3:{stone:4},4:{stone:8},6:{stone:6},7:{stone:12},8:{stone:6},9:{stone:8},10:{stone:12}};
const NAMES=['Bram','Ilse','Toma','Vero','Kade','Nell'];
let S;
const idx=(x,y)=>y*W+x, inb=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
function rng(seed){return()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296}
function newGame(seed=Date.now()){
 const r=rng(seed>>>0);
 const t=new Uint8Array(W*H),b=new Uint8Array(W*H),o2=new Float32Array(W*H),co2=new Float32Array(W*H),T=new Float32Array(W*H),G=new Float32Array(W*H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)T[idx(x,y)]=14+y/H*26+r()*3;
 // value-noise for material + caves
 const N=(sx)=>{const g=[];for(let i=0;i<(W/sx+2)*(H/sx+2);i++)g.push(r());const gw=W/sx+2|0;return(x,y)=>{const fx=x/sx,fy=y/sx,ix=fx|0,iy=fy|0,ax=fx-ix,ay=fy-iy,s=v=>v*v*(3-2*v);const v=(i,j)=>g[(iy+j)*gw+ix+i];return(v(0,0)*(1-s(ax))+v(1,0)*s(ax))*(1-s(ay))+(v(0,1)*(1-s(ax))+v(1,1)*s(ax))*s(ay)}};
 const cave=N(6),mat=N(5),lic=N(3);
 const cx=W/2,cy=H/2;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=idx(x,y);const d=Math.hypot((x-cx)/W*2,(y-cy)/H*2);
  if(d>0.97||x==0||y==0||x==W-1||y==H-1){t[i]=BEDROCK;continue}
  if(cave(x,y)>0.68){t[i]=EMPTY;const pc=r()<0.5;o2[i]=pc?0:0.6;co2[i]=pc?0.8:0.2;if(pc){G[i]=150;T[i]+=8}continue}
  t[i]=lic(x,y)>0.72?LICHEN:(mat(x,y)>0.5?SOIL:ROCK)}
 // starting chamber
 for(let y=cy-3;y<=cy+2;y++)for(let x=cx-8;x<=cx+8;x++){const i=idx(x,y);t[i]=EMPTY;o2[i]=1.0;co2[i]=0;T[i]=22;G[i]=0}
 for(let x=cx-8;x<=cx+8;x++)t[idx(x,cy+3)]=ROCK;
 for(const dx of[-6,6])t[idx(cx+dx,cy+3)]=LICHEN;
 for(let x=cx-3;x<=cx+3;x++)t[idx(x,cy+3)]=SOIL;
 b[idx(cx,cy+2)]=B_POD;
 const cols=[];for(let k=0;k<3;k++)cols.push({name:NAMES[k],x:cx-2+k*2,y:cy+2,path:[],job:null,work:0,breath:100,cal:CAL_MAX*(0.7+k*0.1),hp:100,carry:0,st:0,sick:0,exp:0,brk:0,alive:true,state:'idle',hue:[30,200,320][k]});
 S={W,H,t,b,o2,co2,T,G,cols,jobs:[],rs:{cur:null,pts:0,done:{}},misc:[],res:{stone:30,lichen:8,food:10},bat:300,pod:{x:cx,y:cy+2},time:0,over:false,aer:[],farms:[],dyn:[],log:[]};
 return S}
// ---------- gas ----------
const open=i=>S.t[i]==EMPTY;
function gasStep(dt){
 const {t,o2,co2,T,G}=S,k=Math.min(0.24,dt*2.4),kh=Math.min(.2,dt*1.2),ks=kh*.15;
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=idx(x,y);
  if(t[i]){for(const n of[i+1,i+W]){const q=(T[i]-T[n])*ks;T[i]-=q;T[n]+=q}continue}
  for(const n of[i+1,i+W])if(!t[n]){const q=(T[i]-T[n])*kh,g=(G[i]-G[n])*k;T[i]-=q;T[n]+=q;G[i]-=g;G[n]+=g}else{const q=(T[i]-T[n])*ks;T[i]-=q;T[n]+=q}
  G[i]*=1-0.02*dt;
  const j=i+1;if(!t[j]){const a=(o2[i]-o2[j])*k,c=(co2[i]-co2[j])*k;o2[i]-=a;o2[j]+=a;co2[i]-=c;co2[j]+=c}
  const d=i+W;if(!t[d]){let a=(o2[i]-o2[d])*k,c=(co2[i]-co2[d])*k;
   // buoyancy: CO2 sinks, O2 rises (swap)
   const sw=Math.min(co2[i],o2[d])*k*0.5;a+=sw;c-=sw;o2[i]-=a;o2[d]+=a;co2[i]-=c;co2[d]+=c}}
 // aerators
 for(const a of S.aer){const i=idx(a.x,a.y);a.on=a.lichen>0&&o2[i]+co2[i]<1.8&&S.bat>=AER_W*dt;
  if(a.on){T[i]+=0.6*dt;o2[i]+=0.55*dt;a.lichen=Math.max(0,a.lichen-0.12*dt);S.bat-=AER_W*dt}}
 for(const m of S.misc){const i=idx(m.x,m.y);m.on=false;
  if(m.bt==B_SCRUB&&co2[i]>0.05&&S.bat>=5*dt){const q=Math.min(co2[i],0.4*dt);co2[i]-=q;o2[i]+=q*0.8;S.bat-=5*dt;T[i]+=0.3*dt;m.on=true}
  if(m.bt==B_COOLER&&T[i]>18&&S.bat>=4*dt){T[i]-=6*dt;S.bat-=4*dt;m.on=true}}}
// ---------- navigation ----------
const solid=(x,y)=>!inb(x,y)||S.t[idx(x,y)]!=EMPTY;
const ladder=(x,y)=>inb(x,y)&&S.b[idx(x,y)]==B_LADDER;
const stand=(x,y)=>!solid(x,y)&&(solid(x,y+1)||ladder(x,y)||ladder(x,y+1));
function fall(x,y){while(!solid(x,y+1)&&!ladder(x,y)&&!ladder(x,y+1)&&y<H-1)y++;return y}
function nbrs(x,y){const out=[];
 for(const dx of[-1,1]){const nx=x+dx;if(solid(nx,y))continue;out.push([nx,fall(nx,y)])}
 if(ladder(x,y)&&!solid(x,y-1)&&(ladder(x,y-1)||stand(x,y-1)))out.push([x,y-1]);
 if(!solid(x,y+1)&&ladder(x,y+1))out.push([x,y+1]);
 // step up 1 onto ledge (climb small bump)
 for(const dx of[-1,1]){const nx=x+dx;if(solid(nx,y)&&!solid(nx,y-1)&&!solid(x,y-1)&&solid(nx,y))out.push([nx,y-1])}
 return out}
function bfs(sx,sy,goal,maxN=4000){const prev=new Map(),k0=idx(sx,sy);prev.set(k0,-1);const q=[[sx,sy]];let n=0;
 while(q.length&&n++<maxN){const[x,y]=q.shift();if(goal(x,y)){const p=[];let k=idx(x,y);while(k!=-1&&k!=k0){p.unshift([k%W,k/W|0]);k=prev.get(k)}return{x,y,path:p}}
  for(const[nx,ny]of nbrs(x,y)){const k=idx(nx,ny);if(!prev.has(k)){prev.set(k,idx(x,y));q.push([nx,ny])}}}return null}
// ---------- jobs ----------
function addJob(type,x,y,bt,pri=5){if(!inb(x,y))return false;const i=idx(x,y);
 if(S.jobs.some(j=>j.x==x&&j.y==y))return false;
 if(type=='dig'&&!(S.t[i]&&S.t[i]!=BEDROCK))return false;
 if(type=='dig'&&S.b[idx(x,y-1)]==B_FARM)return false;
 if(type=='build'&&LOCK[bt]&&!S.rs.done[LOCK[bt]])return false;
 if(type=='build'&&(S.t[i]||S.b[i]))return false;
 if(type=='build'&&bt==B_FARM&&S.t[idx(x,y+1)]!=SOIL)return false;
 S.jobs.push({type,x,y,bt,taken:null,pri});return true}
function setPri(x,y,p){let n=0;for(const j of S.jobs)if(j.x==x&&j.y==y){j.pri=p;n++}return n>0}
function cancelAt(x,y){S.jobs=S.jobs.filter(j=>{if(j.x==x&&j.y==y){for(const c of S.cols)if(c.job==j){c.job=null;c.path=[]}return false}return true})}
function canAfford(bt){const c=COST[bt];return Object.keys(c).every(k=>S.res[k]>=c[k])}
const tgt=j=>j.type=='supply'&&j.stage==0?S.pod:j;
const near=(x,y,j)=>{const t=tgt(j);return Math.abs(x-t.x)<=1&&Math.abs(y-t.y)<=(j.type=='dig'?2:1)&&!(x==t.x&&y==t.y&&j.type=='dig')};
function colStep(c,dt){if(!c.alive)return;
 if(c.carry&&(!c.job||c.job.type!='supply')){S.res.lichen+=c.carry;c.carry=0}
 const cx=Math.round(c.x),cy=Math.round(c.y),hi=idx(cx,Math.max(0,cy));
 // breathing: draw O2 from head cell, exhale CO2
 const need=0.1*dt;if(S.o2[hi]>=0.25){const take=Math.min(need,S.o2[hi]);S.o2[hi]-=take;S.co2[hi]+=take*0.6;c.breath=Math.min(100,c.breath+25*dt)}
 else c.breath-=100/40*dt;
 const tmp=S.T[hi];S.T[hi]+=0.04*dt;
 if(c.sick>0){c.sick-=dt*(c.resting?4:1);S.G[hi]+=20*dt;if(c.sick<=0){c.sick=0;S.log.push(c.name+' recovered')}}
 else{if(S.G[hi]>30)c.exp+=S.G[hi]*0.0004*dt;else c.exp=Math.max(0,c.exp-0.01*dt);if(c.exp>1){c.exp=0;c.sick=90;S.log.push(c.name+' caught Grey Cough')}}
 let ds=-0.4;if(S.o2[hi]<0.25)ds+=2;if(c.cal<200)ds+=1;if(c.sick)ds+=0.6;if(tmp>35||tmp<6)ds+=1.2;if(c.job)ds+=0.45;if(c.relax)ds=-8;
 c.st=Math.max(0,Math.min(100,c.st+ds*dt));
 if(tmp>45){c.hp-=3*dt}
 if(c.st>=100&&!c.brk){c.brk=20;S.log.push(c.name+' had a breakdown');if(c.job){c.job.taken=null;c.job=null}c.path=[]}
 if(c.sick)S.o2[hi]=Math.max(0,S.o2[hi]-0.05*dt);
 c.cal-=CAL_RATE*dt;if(c.cal<=0){c.cal=0;c.hp-=100/45*dt}else c.hp=Math.min(100,c.hp+dt);
 if(c.hp<=0){c.alive=false;c.state=c.cal<=0?'starved':'heatstroke';if(c.job){c.job.taken=null;c.job=null}S.log.push(c.name+' died ('+c.state+')');return}
 if(c.breath<=0){c.alive=false;c.state='suffocated';if(c.job){c.job.taken=null;c.job=null}S.log.push(c.name+' suffocated');return}
 // gravity if unsupported
 if(!c.path.length&&!stand(cx,cy)){c.y+=6*dt;if(stand(cx,Math.round(c.y))){c.y=Math.round(c.y)}return}
 // follow path
 if(c.path.length){const[tx,ty]=c.path[0],dx=tx-c.x,dy=ty-c.y,d=Math.hypot(dx,dy),sp=3.2*dt;
  if(d<=sp){c.x=tx;c.y=ty;c.path.shift()}else{c.x+=dx/d*sp;c.y+=dy/d*sp}return}
 c.x=cx;c.y=cy;
 if(c.brk>0){c.brk-=dt;c.state='breakdown';if(c.brk<=0){c.brk=0;c.st=60}return}
 // seek air
 if(c.breath<45||(S.o2[hi]<0.25&&c.breath<90)){if(c.job){c.job.taken=null;c.job=null}c.state='seeking air';
  const r=bfs(cx,cy,(x,y)=>S.o2[idx(x,y)]>0.5);if(r&&r.path.length){c.path=r.path}return}
 // eat when hungry (interrupts non-critical work)
 if(c.eating>0){c.eating-=dt;c.state='eating';if(c.eating<=0){c.cal=Math.min(CAL_MAX,c.cal+500)}return}
 if(c.cal<350&&S.res.food>=1){if(c.job){c.job.taken=null;c.job=null}S.res.food-=1;c.eating=3;c.state='eating';return}
 const atB=bt=>S.b[idx(cx,cy)]==bt;
 c.resting=c.sick>0&&atB(B_COT);if(c.resting){c.state='resting';return}
 c.relax=c.relax&&c.st>15&&atB(B_COUCH);if(c.relax){c.state='relaxing';return}
 const occ=(x,y)=>S.cols.some(o=>o!=c&&o.alive&&Math.round(o.x)==x&&Math.round(o.y)==y);
 const seekB=(bt)=>{const r=bfs(cx,cy,(x,y)=>S.b[idx(x,y)]==bt&&!occ(x,y));if(r&&r.path.length){if(c.job){c.job.taken=null;c.job=null}c.path=r.path;return true}return false};
 if(c.sick>0&&S.misc.some(m=>m.bt==B_COT)&&seekB(B_COT)){c.state='to cot';return}
 if(c.st>70&&S.misc.some(m=>m.bt==B_COUCH)){if(atB(B_COUCH)){c.relax=true;return}if(seekB(B_COUCH)){c.state='to couch';return}}
 // work
 if(c.job){const j=c.job;if(!S.jobs.includes(j)){c.job=null;return}
  if(!near(cx,cy,j)){c.job=null;j.taken=null;return}
  c.state={dig:'digging',build:'building',supply:j.stage?'delivering':'fetching',harvest:'harvesting',operate:'cranking',research:'researching'}[j.type];const wdt=c.sick?dt*.5:dt;c.work+=wdt;
  if(j.type=='research'){const tc=TECH[S.rs.cur];if(!tc){S.jobs.splice(S.jobs.indexOf(j),1);c.job=null;return}S.rs.pts+=wdt;if(S.rs.pts>=tc.cost){S.rs.done[S.rs.cur]=1;S.log.push('Researched '+tc.name);S.rs.cur=null;S.rs.pts=0}if(c.work>30){S.jobs.splice(S.jobs.indexOf(j),1);c.job=null;c.work=0}return}
  if(j.type=='operate'){S.bat=Math.min(BAT_CAP,S.bat+CRANK_W*wdt);S.T[idx(j.x,j.y)]+=0.5*dt;if(S.bat>=BAT_CAP||c.work>25){S.jobs.splice(S.jobs.indexOf(j),1);c.job=null;c.work=0}return}
  if(j.type=='supply'){if(c.work<1)return;c.work=0;
   if(j.stage==0){const n=Math.min(4,S.res.lichen);if(n<=0){S.jobs.splice(S.jobs.indexOf(j),1);c.job=null;return}S.res.lichen-=n;c.carry=n;j.stage=1;
    const r=bfs(cx,cy,(x,y)=>near(x,y,j));if(r){c.path=r.path}else{S.res.lichen+=c.carry;c.carry=0;S.jobs.splice(S.jobs.indexOf(j),1);c.job=null}return}
   const a=S.aer.find(a=>a.x==j.x&&a.y==j.y);if(a)a.lichen+=c.carry;else S.res.lichen+=c.carry;c.carry=0;S.jobs.splice(S.jobs.indexOf(j),1);c.job=null;return}
  const need=j.type=='dig'?HARD[S.t[idx(j.x,j.y)]]||1:2;
  if(c.work>=need){finish(j);c.job=null;c.work=0}return}
 // find job: nearest reachable unassigned
 for(const j of S.jobs)if(!j.taken&&j.type=='supply'&&j.stage==1)j.stage=0;
 const free=S.jobs.filter(j=>!j.taken&&(j.type!='build'||canAfford(j.bt))).sort((a,b)=>(b.pri||5)-(a.pri||5));
 if(free.length){let r=null,top=free.length?free[0].pri||5:0;for(const p of [...new Set(free.map(j=>j.pri||5))]){const fp=free.filter(j=>(j.pri||5)==p);r=bfs(cx,cy,(x,y)=>fp.some(j=>near(x,y,j)));if(r)break}
  if(r){const j=free.find(j=>near(r.x,r.y,j));j.taken=c;c.job=j;c.work=0;c.path=r.path;c.state='walking';return}}
 c.state='idle'}
function finish(j){const i=idx(j.x,j.y);S.jobs.splice(S.jobs.indexOf(j),1);
 if(j.type=='dig'){const m=S.t[i];if(m==LICHEN)S.res.lichen+=4;else S.res.stone+=m==ROCK?2:1;S.t[i]=EMPTY;S.o2[i]=0;S.co2[i]=0;
  // the tile becomes gas-open; drop jobs that are no longer valid
 }else if(j.type=="build"){if(S.t[i]||!canAfford(j.bt))return;const c=COST[j.bt];for(const k in c)S.res[k]-=c[k];S.b[i]=j.bt;if(j.bt==B_AERATOR)S.aer.push({x:j.x,y:j.y,on:false,lichen:0});if(j.bt==B_FARM)S.farms.push({x:j.x,y:j.y,g:0});if(j.bt==B_DYNAMO)S.dyn.push({x:j.x,y:j.y});if(j.bt>=B_DESK)S.misc.push({x:j.x,y:j.y,bt:j.bt,on:false})}
 if(j.type=='harvest'){const f=S.farms.find(f=>f.x==j.x&&f.y==j.y);if(f){f.g=0;S.res.food+=2}}}
const has=(type,x,y)=>S.jobs.some(j=>j.type==type&&j.x==x&&j.y==y);
function auto(dt){
 for(const a of S.aer)if(a.lichen<1.5&&S.res.lichen>=1&&!has('supply',a.x,a.y))S.jobs.push({type:'supply',x:a.x,y:a.y,stage:0,taken:null,pri:7});
 for(const f of S.farms){if(f.g<GROW){const pw=S.bat>=FARM_W*dt;if(pw)S.bat-=FARM_W*dt;f.g+=dt*(pw?1:0.4)}else if(!has('harvest',f.x,f.y))S.jobs.push({type:'harvest',x:f.x,y:f.y,taken:null,pri:6})}
 if(S.rs.cur)for(const m of S.misc)if(m.bt==B_DESK&&!has('research',m.x,m.y)){S.jobs.push({type:'research',x:m.x,y:m.y,taken:null,pri:4});break}
 const need=S.aer.length||S.farms.length||S.misc.some(m=>m.bt==B_SCRUB||m.bt==B_COOLER);if(need&&S.bat<BAT_CAP*0.6)for(const d of S.dyn)if(!has('operate',d.x,d.y)){S.jobs.push({type:'operate',x:d.x,y:d.y,taken:null,pri:6});break}}
function pickTech(id){const tc=TECH[id];if(!tc||S.rs.done[id]||(tc.req&&!S.rs.done[tc.req]))return false;if(S.rs.cur!=id){S.rs.cur=id;S.rs.pts=0}return true}
const ARR=['t','b','o2','co2','T','G'];
function save(){const o={v:3};for(const k in S){if(ARR.includes(k))o[k]=Array.from(S[k],v=>Math.round(v*1000)/1000);else if(k=='jobs')o.jobs=S.jobs.map(j=>({...j,taken:null,stage:0}));else if(k=='cols')o.cols=S.cols.map(c=>({...c,job:null,path:[],carry:0,relax:false}));else o[k]=S[k]}
 o.res={...S.res};for(const c of S.cols)o.res.lichen+=c.carry||0;return JSON.stringify(o)}
function load(str){const o=JSON.parse(str);if(!o||o.v!=3)throw new Error('bad save');const C={t:Uint8Array,b:Uint8Array};for(const k of ARR)o[k]=new(C[k]||Float32Array)(o[k]);delete o.v;S=o;return S}
function step(dt){if(S.over)return;S.time+=dt;gasStep(dt);auto(dt);for(const c of S.cols)colStep(c,dt);
 if(S.cols.every(c=>!c.alive))S.over=true}
return{newGame,step,addJob,cancelAt,setPri,pickTech,save,load,TECH,LOCK,B_DESK,B_SCRUB,B_COT,B_COUCH,B_COOLER,get S(){return S},W,H,idx,EMPTY,ROCK,SOIL,LICHEN,BEDROCK,B_LADDER,B_AERATOR,B_FARM,B_DYNAMO,B_POD,BAT_CAP,CAL_MAX,GROW,COST}})();
if(typeof module!='undefined')module.exports=HS;
