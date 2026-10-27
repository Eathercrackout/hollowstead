// Hollowstead QA harness: node qa/sim_qa.js
const HS=require('../www/sim.js');const out=[];const log=(...a)=>{const s=a.map(x=>typeof x=='string'?x:JSON.stringify(x)).join(' ');out.push(s);console.log(s)};
const run=(sec,f)=>{for(let i=0;i<sec*20&&!HS.S.over;i++){HS.step(.05);f&&f(i)}};
const tot=(a)=>{let s=0;for(const v of a)s+=v;return s};
const cx=30,cy=22,I=HS.idx;
function scen(name,fn){try{fn()}catch(e){log('!! EXCEPTION in',name,e.stack.split('\n').slice(0,3).join(' | '))}}
// 1 map stats
scen('map',()=>{for(const seed of [1,2,3,42,99]){const S=HS.newGame(seed);let lic=0,open=0;for(let i=0;i<S.t.length;i++){if(S.t[i]==3)lic++;if(!S.t[i])open++}
 log('MAP seed',seed,'lichenTiles',lic,'=> lichen units',lic*4,'openTiles',open,'O2',tot(S.o2).toFixed(0),'CO2',tot(S.co2).toFixed(0),'germs',tot(S.G)|0)}});
// 2 unattended
scen('unattended',()=>{for(const seed of [1,42,99]){HS.newGame(seed);run(3600);const S=HS.S;log('UNATTENDED seed',seed,'over',S.over,'t',S.time|0,S.log)}});
// 3 pathfinding: ladder climb, reach and unreachable job
scen('path',()=>{const S=HS.newGame(42);for(let y=0;y<HS.H;y++)for(let x=0;x<HS.W;x++){const i=I(x,y);if(x>0&&x<59&&y>0&&y<43){S.t[i]=1}}
 for(let x=20;x<=40;x++){S.t[I(x,22)]=0;S.t[I(x,16)]=0}for(let y=16;y<=22;y++)S.t[I(35,y)]=0;for(let i=0;i<S.o2.length;i++)if(!S.t[i])S.o2[i]=1;
 S.cols.forEach((c,k)=>{c.x=22+k;c.y=22});
 HS.addJob('dig',38,15);run(30);log('PATH no-ladder: job up shaft done?',!S.jobs.length,'states',S.cols.map(c=>c.state));
 for(let y=16;y<=22;y++)S.b[I(35,y)]=1;run(40);log('PATH with ladder: done?',!S.jobs.length,'pos',S.cols.map(c=>[c.x|0,c.y|0]));
 // falling
 HS.addJob('dig',24,23);run(20);log('PATH dig under: done',!S.jobs.some(j=>j.x==24&&j.y==23),'pos',S.cols.map(c=>[c.x.toFixed(1),c.y.toFixed(1)]));
 // dig 2 below reach
 const c=S.cols[0];c.x=30;c.y=16;c.path=[];S.t[I(30,17)]=1;S.t[I(30,18)]=1;S.jobs=[];HS.addJob('dig',30,18);run(10);log('REACH: tile 2 below a settler dug (through floor)?',S.t[I(30,18)]==0,'floor tile',S.t[I(30,17)]);
 // perf: 60 unreachable jobs
 for(let k=0;k<60;k++)HS.addJob('dig',2+k%50,40);const t0=Date.now();run(20);log('PERF 60 unreachable jobs: ms per sim-sec',((Date.now()-t0)/20).toFixed(1))});
// 4 gas
scen('gas',()=>{const S=HS.newGame(42);S.cols.forEach(c=>c.alive=false);const o=tot(S.o2),c=tot(S.co2);run(1);S.over=false;S.cols.forEach(c=>c.alive=false);
 for(let i=0;i<200*20;i++){HS.step(.05);S.over=false}log('GAS conservation 200s no settlers: O2',o.toFixed(2),'->',tot(S.o2).toFixed(2),'CO2',c.toFixed(2),'->',tot(S.co2).toFixed(2));
 let neg=0,nan=0;for(const a of [S.o2,S.co2,S.G,S.T])for(const v of a){if(v<-1e-4)neg++;if(isNaN(v))nan++}log('GAS negatives',neg,'NaN',nan);
 // CO2 sinks: compare bottom vs top row of chamber
 const S2=HS.newGame(42);S2.cols.forEach(c=>{c.alive=true});run(300);let top=0,bot=0;for(let x=cx-8;x<=cx+8;x++){top+=S2.co2[I(x,cy-3)];bot+=S2.co2[I(x,cy+2)]}log('GAS CO2 top row',top.toFixed(2),'bottom row',bot.toFixed(2));
 // breathing math
 log('GAS breathe: settler uses 0.1 O2/s, exhales 0.06 CO2/s; chamber 17x6=102 O2 => ~',(102/0.3|0),'s for 3 settlers')});
// 5 aerator, overpressure, power dependency
scen('aerator',()=>{const S=HS.newGame(42);S.cols.forEach(c=>c.alive=false);S.aer.push({x:cx,y:cy,on:false,lichen:50});S.b[I(cx,cy)]=2;S.bat=0;for(let i=0;i<100;i++){HS.step(.05);S.over=false}log('AER no power on?',S.aer[0].on);
 S.bat=1000;const o=tot(S.o2);for(let i=0;i<20*60;i++){HS.step(.05);S.over=false}log('AER 60s: O2 +',(tot(S.o2)-o).toFixed(1),'lichen left',S.aer[0].lichen.toFixed(1),'bat',S.bat|0,'tile pressure',(S.o2[I(cx,cy)]+S.co2[I(cx,cy)]).toFixed(2),'tile T',S.T[I(cx,cy)].toFixed(1));
 let mx=0;for(let i=0;i<20*600;i++){HS.step(.05);S.over=false;S.bat=1000}for(let x=cx-8;x<=cx+8;x++)mx=Math.max(mx,S.o2[I(x,cy)]);log('AER 600s sealed chamber: max tile O2',mx.toFixed(2),'T at aerator',S.T[I(cx,cy)].toFixed(1))});
// 6 scrubber
scen('scrub',()=>{const S=HS.newGame(42);S.rs.done.scrub=1;S.res.stone=99;S.cols.forEach(c=>c.alive=false);S.misc.push({x:cx,y:cy+2,bt:7,on:false});S.b[I(cx,cy+2)]=7;for(let x=cx-8;x<=cx+8;x++)S.co2[I(x,cy+2)]=1;S.bat=1000;const c=tot(S.co2),o=tot(S.o2);
 for(let i=0;i<20*60;i++){HS.step(.05);S.over=false}log('SCRUB 60s: CO2',(tot(S.co2)-c).toFixed(1),'O2',(tot(S.o2)-o).toFixed(1),'bat used',1000-S.bat|0,'(note: auto dynamo requested?)',S.jobs.map(j=>j.type))});
// 7 food & farming
scen('food',()=>{const S=HS.newGame(42);S.res.food=0;run(400);log('FOOD none: deaths',S.log,'t',S.time|0);
 const S2=HS.newGame(42);S2.res.stone=99;for(let x=cx-3;x<=cx+3;x++)HS.addJob('build',x,cy+2,3);S2.jobs=S2.jobs.filter(j=>!(j.x==cx&&j.y==cy+2));const f0=S2.res.food;run(900);
 log('FARM 7-tile soil strip -> farms built',S2.farms.length,'(pod occupies one soil tile) food after 900s',S2.res.food|0,'from',f0,'deaths',S2.log,'kcal',S2.cols.map(c=>c.cal|0));
 log('FOOD math: 3 settlers eat',(3*1000/150/500*60).toFixed(1),'food/min; each farm makes',(2/90*60).toFixed(2),'food/min powered,',(2/(90/0.4)*60).toFixed(2),'unpowered')});
// 8 power
scen('power',()=>{const S=HS.newGame(42);S.res.stone=99;HS.addJob('build',cx+5,cy+2,4);run(30);log('POWER dynamo built',S.dyn.length,'cranking jobs w/o consumers',S.jobs.filter(j=>j.type=='operate').length,'bat',S.bat|0);
 HS.addJob('build',cx-5,cy+2,2);run(300);log('POWER with aerator 300s: bat',S.bat|0,'states seen ok; aerator lichen',S.aer[0]&&S.aer[0].lichen.toFixed(1))});
// 9 heat
scen('heat',()=>{const S=HS.newGame(42);S.rs.done.scrub=S.rs.done.cooler=1;S.cols.forEach(c=>c.alive=false);for(let x=cx-8;x<=cx+8;x++)for(let y=cy-3;y<=cy+2;y++)S.T[I(x,y)]=40;
 S.misc.push({x:cx,y:cy,bt:10,on:false});S.b[I(cx,cy)]=10;S.bat=1000;for(let i=0;i<20*120;i++){HS.step(.05);S.over=false}let avg=0;for(let x=cx-8;x<=cx+8;x++)avg+=S.T[I(x,cy)];log('HEAT cooler 120s room 40C -> avg',(avg/17).toFixed(1),'cooler tile',S.T[I(cx,cy)].toFixed(1),'(heat deleted, not moved)');
 const S2=HS.newGame(42);S2.cols.forEach(c=>{c.x=cx;c.y=cy+2});S2.T.fill(50);run(60);log('HEAT 50C everywhere 60s: alive',S2.cols.map(c=>[c.alive,c.hp|0,c.st|0]),S2.log)});
// 10 germs and sickness
scen('germs',()=>{const S=HS.newGame(42);for(let x=cx-8;x<=cx+8;x++)for(let y=cy-3;y<=cy+2;y++)S.G[I(x,y)]=200;let first=-1;run(300,i=>{if(first<0&&S.cols.some(c=>c.sick))first=i/20});
 log('GERMS chamber 200 germs: first sick at',first,'s, log',S.log);
 const S2=HS.newGame(42);S2.cols[0].sick=90;let inf=0;run(300,()=>{});log('GERMS one sick settler 300s: log',S2.log,'germs total',tot(S2.G)|0);
 const S3=HS.newGame(42);S3.rs.done.medcot=1;S3.res.stone=99;HS.addJob('build',cx+6,cy+2,8);run(20);S3.cols[0].sick=90;let t=-1;run(120,i=>{if(t<0&&!S3.cols[0].sick)t=i/20});log('MEDCOT: built',S3.misc.length,'recovered after',t,'s; states',[...new Set()]);
 const S4=HS.newGame(42);S4.rs.done.medcot=1;S4.res.stone=99;HS.addJob('build',cx+6,cy+2,8);run(20);S4.cols.forEach(c=>c.sick=90);const st=new Set();run(60,()=>S4.cols.forEach(c=>st.add(c.state)));log('MEDCOT 3 sick 1 cot: states',[...st])});
// 11 stress
scen('stress',()=>{const S=HS.newGame(42);S.res.stone=99;for(let k=0;k<40;k++)HS.addJob('dig',cx-8+k%17,cy+4+(k/17|0));let mx=0;run(600,()=>S.cols.forEach(c=>mx=Math.max(mx,c.st)));log('STRESS busy digging 600s: max stress',mx.toFixed(0),'log',S.log);
 const S2=HS.newGame(42);S2.rs.done.couch=1;S2.res.stone=99;HS.addJob('build',cx-6,cy+2,9);run(20);S2.cols[0].st=80;const st=new Set();let t=-1;run(60,i=>{st.add(S2.cols[0].state);if(t<0&&S2.cols[0].st<=15)t=i/20});log('COUCH: states',[...st],'stress<=15 after',t,'s, final',S2.cols[0].st|0);
 const S3=HS.newGame(42);S3.cols[1].st=99.95;run(2);log('BREAKDOWN',S3.cols[1].state,S3.cols[1].brk|0);run(25);log('after breakdown stress',S3.cols[1].st|0,S3.cols[1].state)});
// 12 research
scen('research',()=>{const S=HS.newGame(42);log('RESEARCH cooler before scrub allowed?',HS.pickTech('cooler'));HS.pickTech('scrub');log('build desk',HS.addJob('build',cx+4,cy+2,6));let t=-1;run(200,i=>{if(t<0&&S.rs.done.scrub)t=i/20});log('RESEARCH scrub done at',t,'s');
 log('RESEARCH queue scrubber now',HS.addJob('build',cx+6,cy+2,7));HS.pickTech('scrub');log('re-pick done tech ->',S.rs.cur);HS.pickTech('medcot');run(5);HS.pickTech('couch');log('switching tech resets points ->',S.rs.pts.toFixed(1))});
// 13 priorities
scen('prio',()=>{const S=HS.newGame(42);HS.addJob('dig',cx-9,cy,0,1);HS.addJob('dig',cx+9,cy,0,9);run(1);const j9=S.jobs.find(j=>j.pri==9),j1=S.jobs.find(j=>j.pri==1);log('PRIO taken: p9',!!(j9&&j9.taken),'p1',!!(j1&&j1.taken));
 S.jobs.forEach(j=>{if(j.taken){j.taken.job=null;j.taken.path=[];j.taken=null}});HS.setPri(cx-9,cy,9);log('setPri on taken job ok')});
// 14 save/load
scen('save',()=>{const S=HS.newGame(42);S.res.stone=99;HS.addJob('build',cx-5,cy+2,2);HS.addJob('build',cx-2,cy+2,3);run(120);const a=HS.save();const S2=HS.load(a);
 run(60);const b=HS.save();log('SAVE size KB',(a.length/1024).toFixed(0),'reload ok, time',HS.S.time|0,'aer obj',HS.S.aer.length,'farms',HS.S.farms.length);
 // determinism: compare continuing original vs loaded
 const A=HS.load(a);run(30);const ta=tot(HS.S.o2);HS.load(a);run(30);log('SAVE determinism O2 after 30s',ta.toFixed(3),tot(HS.S.o2).toFixed(3));
 try{HS.load('{"v":2}');log('SAVE bad version accepted!')}catch(e){log('SAVE bad version rejected ok')}
 // mid-carry save
 const S3=HS.newGame(42);S3.res.stone=99;HS.addJob('build',cx-5,cy+2,2);let saved=null;run(200,()=>{if(!saved&&S3.cols.some(c=>c.carry)){saved=HS.save()}});if(saved){const L=JSON.parse(saved);log('SAVE mid-carry lichen conserved: res',L.res.lichen,'aer',L.aer.map(a=>a.lichen.toFixed(2)))}});
// 15 game over
scen('over',()=>{const S=HS.newGame(42);S.o2.fill(0);run(60);log('OVER all suffocate: over',S.over,'t',S.time|0,S.log);const n=HS.newGame(5);log('NEW colony over',n.over,'alive',n.cols.filter(c=>c.alive).length)});
// 16 competent player 25 min
scen('competent',()=>{for(const [ver,seed] of [[2,42],[2,7],[2,123],[3,42],[3,7],[3,123]]){const S=HS.newGame(seed);let stage=0;const st={};const bl=new Set(),age=new Map();
 const frontier=(pred,max,pri)=>{let n=0;const c=[];for(let y=1;y<HS.H-1;y++)for(let x=1;x<HS.W-1;x++){const i=I(x,y);if(!S.t[i]||S.t[i]==4)continue;if(!pred(x,y,S.t[i])||bl.has(i))continue;const adj=[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>!S.t[I(x+a,y+b)]);if(adj)c.push([Math.hypot(x-cx,y-cy),x,y])}
  c.sort((a,b)=>a[0]-b[0]);for(const[,x,y]of c){if(n>=max)break;if(HS.addJob('dig',x,y,0,pri))n++}};
 const tryB=(bt,x,y,p=6)=>HS.addJob('build',x,y,bt,p);
 tryB(2,cx-5,cy+2,8);tryB(3,cx-2,cy+2,7);tryB(4,cx+5,cy+2,7);
 let mn={o2:9},sick=0;
 run(1500,i=>{if(i%200)return;const t=i/20;
  if(ver==3)for(const j of [...S.jobs])if(j.type=='dig'&&!j.taken){const k=I(j.x,j.y);age.set(k,(age.get(k)||0)+10);if(age.get(k)>=30){bl.add(k);HS.cancelAt(j.x,j.y)}}
  if(S.jobs.filter(j=>j.type=='dig').length<6)frontier((x,y,m)=>y>=cy-3&&y<=cy+2,6,5);
  if(S.jobs.filter(j=>j.type=='dig'&&S.t[I(j.x,j.y)]==3).length<3)frontier((x,y,m)=>m==3&&y>=cy-3&&y<=cy+2,3,8);
  if(t>60&&S.farms.length<5)for(const x of[cx-3,cx-1,cx+1,cx+2,cx+3])tryB(3,x,cy+2,7);
  if(t>120&&!S.misc.some(m=>m.bt==6))tryB(6,cx+7,cy+2,6);
  if(!S.rs.cur){for(const k of['scrub','medcot','couch','cooler'])if(HS.pickTech(k))break}
  if(S.rs.done.scrub&&!S.misc.some(m=>m.bt==7))tryB(7,cx-7,cy+2,7);
  if(S.rs.done.medcot&&!S.misc.some(m=>m.bt==8))tryB(8,cx+8,cy+2,6);
  if(S.rs.done.couch&&!S.misc.some(m=>m.bt==9))tryB(9,cx-8,cy+2,6);
  if(S.rs.done.cooler&&!S.misc.some(m=>m.bt==10))tryB(10,cx+4,cy-2,6);
  if(S.aer.length<2&&S.res.lichen>20)tryB(2,cx+1,cy-3,7);
  let o=0;for(let x=cx-8;x<=cx+8;x++)o+=S.o2[I(x,cy)];mn.o2=Math.min(mn.o2,o/17);
  if(i%(20*120)==0){let T=0;for(let x=cx-8;x<=cx+8;x++)T+=S.T[I(x,cy)];log(`  [v${ver} ${seed}] t=${t}s stone=${S.res.stone|0} lichen=${S.res.lichen.toFixed(0)} aerLichen=${S.aer.map(a=>a.lichen.toFixed(1))} food=${S.res.food|0} farms=${S.farms.length} bat=${S.bat|0} roomO2=${(o/17).toFixed(2)} roomT=${(T/17).toFixed(1)} research=${Object.keys(S.rs.done)} cols=${S.cols.map(c=>c.alive?`${c.state}/air${c.breath|0}/kcal${c.cal|0}/st${c.st|0}${c.sick?'/SICK':''}`:'DEAD')}`)}});
 log('COMPETENT v'+ver+(ver==3?' (also cancels digs untaken for 30s)':' (horizontal tunnels only)'),'seed',seed,'survived',S.time|0,'s over',S.over,'alive',S.cols.filter(c=>c.alive).length,'log',S.log,'min room O2',mn.o2.toFixed(2))}});
require('fs').writeFileSync(__dirname+'/sim_qa_output.txt',out.join('\n'));
