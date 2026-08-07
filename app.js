const pdfjsLib=await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
const fields=["containerNumber","sealNo","booking"],labels={containerNumber:"CONTAINER NUMBER",sealNo:"SEAL NO",booking:"BOOKING"};
let files=[null,null],images=[null,null],boxes=[JSON.parse(localStorage.getItem("roi_side_0")||"{}"),JSON.parse(localStorage.getItem("roi_side_1")||"{}")];
let modalSide=0,activeField="containerNumber",drawing=false,start=null,tempBoxes={};
const cal=document.querySelector("#calCanvas"),cctx=cal.getContext("2d");
const colors={containerNumber:"#ef4444",sealNo:"#22c55e",booking:"#3b82f6"};

function norm(v){return String(v||"").toUpperCase().replace(/\s+/g,"").replace(/[-_/.:,;|()[\]{}]/g,"")}
function clean(v){return String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"")}

const ISO_VALUES=(()=>{const map={};let n=10;for(const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ"){while(n%11===0)n++;map[ch]=n;n++}return map})();
function isoCheckDigit(code10){if(!/^[A-Z]{4}\d{6}$/.test(code10))return null;let sum=0;for(let i=0;i<code10.length;i++){const ch=code10[i],v=/\d/.test(ch)?Number(ch):ISO_VALUES[ch];sum+=v*(2**i)}return(sum%11)%10}
function isValidContainer(code){const c=clean(code);return/^[A-Z]{4}\d{7}$/.test(c)&&isoCheckDigit(c.slice(0,10))===Number(c[10])}

function baseContainerCandidates(v){
  const raw=clean(v),out=[];
  for(let i=0;i<=raw.length-11;i++){
    const s=raw.slice(i,i+11),
      p=s.slice(0,4).replace(/0/g,"O").replace(/1/g,"I").replace(/5/g,"S").replace(/8/g,"B"),
      n=s.slice(4).replace(/O/g,"0").replace(/[IL]/g,"1").replace(/Z/g,"2").replace(/S/g,"5").replace(/B/g,"8").replace(/G/g,"6"),
      x=p+n;
    if(/^[A-Z]{4}\d{7}$/.test(x))out.push(x)
  }
  return[...new Set(out)]
}

function containerCorrectionCandidates(code){
  const c=clean(code);if(!/^[A-Z]{4}\d{7}$/.test(c))return[];
  const results=new Set([c]);
  const digitSubs={"0":["8","6","9"],"1":["7"],"2":["7"],"3":["8"],"4":["9"],"5":["6","8"],"6":["5","8","0"],"7":["1","2"],"8":["3","5","6","9","0"],"9":["4","8","0"]};
  for(let i=4;i<11;i++){for(const alt of(digitSubs[c[i]]||[]))results.add(c.slice(0,i)+alt+c.slice(i+1))}
  return[...results].filter(isValidContainer)
}

function parseCandidates(field,text){
  const raw=String(text||"").toUpperCase();
  if(field==="containerNumber"){
    const all=new Set();
    for(const base of baseContainerCandidates(raw)){all.add(base);for(const corrected of containerCorrectionCandidates(base))all.add(corrected)}
    return[...all]
  }
  const tokens=(raw.match(/[A-Z0-9][A-Z0-9\-_/]{4,22}/g)||[]).map(clean).filter(x=>/[A-Z]/.test(x)&&/\d/.test(x));
  if(field==="sealNo")return[...new Set(tokens.filter(x=>x.length>=7&&x.length<=14))];
  return[...new Set(tokens.filter(x=>x.length>=8&&x.length<=18))]
}

function editDistance(a,b){
  a=norm(a);b=norm(b);const m=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++)m[i][0]=i;for(let j=0;j<=b.length;j++)m[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return m[a.length][b.length]
}
function similarity(a,b){const na=norm(a),nb=norm(b);if(!na||!nb)return 0;return 1-editDistance(na,nb)/Math.max(na.length,nb.length)}

async function fileToImage(file){
  if(file.type.startsWith("image/"))return await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=URL.createObjectURL(file)});
  if(file.type==="application/pdf"||file.name.toLowerCase().endsWith(".pdf")){
    const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise,page=await pdf.getPage(1),vp=page.getViewport({scale:3.5}),c=document.createElement("canvas");
    c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);await page.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;
    const i=new Image();await new Promise(res=>{i.onload=res;i.src=c.toDataURL()});return i
  }
  throw new Error("รองรับเฉพาะ PDF และรูปภาพ")
}
function drawPreview(side){
  const c=document.querySelector(`#preview${side+1}`),ctx=c.getContext("2d"),img=images[side],ph=document.querySelector(`#placeholder${side+1}`);
  if(!img){c.width=c.height=0;ph.style.display="block";return}
  ph.style.display="none";const maxW=520,maxH=280,sc=Math.min(maxW/img.naturalWidth,maxH/img.naturalHeight,1);
  c.width=Math.round(img.naturalWidth*sc);c.height=Math.round(img.naturalHeight*sc);ctx.drawImage(img,0,0,c.width,c.height)
}
for(let s=0;s<2;s++)document.querySelector(`#file${s+1}`).addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;files[s]=f;document.querySelector(`#name${s+1}`).textContent=f.name;images[s]=await fileToImage(f);drawPreview(s)});

document.querySelectorAll(".calibrate").forEach(b=>b.addEventListener("click",()=>openCalibration(Number(b.dataset.side))));
function openCalibration(side){
  if(!images[side]){alert("กรุณาเลือกไฟล์ก่อน");return}
  modalSide=side;tempBoxes=JSON.parse(JSON.stringify(boxes[side]||{}));document.querySelector("#modal").classList.remove("hidden");
  document.querySelector("#modalTitle").textContent=side===0?"กำหนดกรอบ — ใบ EAR":"กำหนดกรอบ — แบบฟอร์มควบคุมรถ";
  const img=images[side],maxW=1000,sc=Math.min(1,maxW/img.naturalWidth);cal.width=Math.round(img.naturalWidth*sc);cal.height=Math.round(img.naturalHeight*sc);redrawCal()
}
function redrawCal(){
  const img=images[modalSide];cctx.clearRect(0,0,cal.width,cal.height);cctx.drawImage(img,0,0,cal.width,cal.height);
  for(const[k,b]of Object.entries(tempBoxes)){const x=b.x*cal.width,y=b.y*cal.height,w=b.w*cal.width,h=b.h*cal.height;cctx.save();cctx.strokeStyle=colors[k];cctx.lineWidth=3;cctx.fillStyle=colors[k]+"22";cctx.fillRect(x,y,w,h);cctx.strokeRect(x,y,w,h);cctx.fillStyle=colors[k];cctx.font="bold 16px Arial";cctx.fillText(labels[k],x+4,Math.max(18,y-4));cctx.restore()}
}
document.querySelectorAll(".field").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".field").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeField=b.dataset.field}));
function pt(e){const r=cal.getBoundingClientRect();return{x:(e.clientX-r.left)*cal.width/r.width,y:(e.clientY-r.top)*cal.height/r.height}}
cal.addEventListener("pointerdown",e=>{drawing=true;start=pt(e);cal.setPointerCapture(e.pointerId)});
cal.addEventListener("pointermove",e=>{if(!drawing)return;redrawCal();const p=pt(e);cctx.save();cctx.strokeStyle=colors[activeField];cctx.lineWidth=3;cctx.setLineDash([7,5]);cctx.strokeRect(start.x,start.y,p.x-start.x,p.y-start.y);cctx.restore()});
cal.addEventListener("pointerup",e=>{if(!drawing)return;drawing=false;const p=pt(e),x=Math.min(start.x,p.x),y=Math.min(start.y,p.y),w=Math.abs(p.x-start.x),h=Math.abs(p.y-start.y);if(w>8&&h>8)tempBoxes[activeField]={x:x/cal.width,y:y/cal.height,w:w/cal.width,h:h/cal.height};redrawCal()});
document.querySelector("#clearCurrent").addEventListener("click",()=>{tempBoxes={};redrawCal()});
document.querySelector("#saveCalibration").addEventListener("click",()=>{if(fields.some(k=>!tempBoxes[k])){alert("กรุณากำหนดกรอบทั้ง 3 หัวข้อ");return}boxes[modalSide]=JSON.parse(JSON.stringify(tempBoxes));localStorage.setItem(`roi_side_${modalSide}`,JSON.stringify(boxes[modalSide]));document.querySelector("#modal").classList.add("hidden")});
document.querySelector("#closeModal").addEventListener("click",()=>document.querySelector("#modal").classList.add("hidden"));

function crop(side,field){
  const img=images[side],b=boxes[side][field];if(!img||!b)return null;
  const sx=Math.round(b.x*img.naturalWidth),sy=Math.round(b.y*img.naturalHeight),sw=Math.round(b.w*img.naturalWidth),sh=Math.round(b.h*img.naturalHeight),scale=12,c=document.createElement("canvas");
  c.width=Math.max(1,sw*scale);c.height=Math.max(1,sh*scale);
  const x=c.getContext("2d",{willReadFrequently:true});x.imageSmoothingEnabled=true;x.imageSmoothingQuality="high";x.drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);return c
}

function sharpenCanvas(src){
  const out=document.createElement("canvas");out.width=src.width;out.height=src.height;
  const ctx=out.getContext("2d",{willReadFrequently:true});ctx.drawImage(src,0,0);
  const img=ctx.getImageData(0,0,out.width,out.height),d=img.data,copy=new Uint8ClampedArray(d),w=out.width,h=out.height;
  const idx=(x,y)=>(y*w+x)*4;
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const i=idx(x,y);
    for(let c=0;c<3;c++){
      const v=copy[i+c]*5-copy[idx(x-1,y)+c]-copy[idx(x+1,y)+c]-copy[idx(x,y-1)+c]-copy[idx(x,y+1)+c];
      d[i+c]=Math.max(0,Math.min(255,v))
    }
  }
  ctx.putImageData(img,0,0);return out
}

function prep(src,mode,threshold=190){
  let base=mode.startsWith("sharp")?sharpenCanvas(src):src;
  const c=document.createElement("canvas");c.width=base.width;c.height=base.height;
  const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(base,0,0);
  if(mode==="original"||mode==="sharp")return c;
  const im=x.getImageData(0,0,c.width,c.height),d=im.data;
  for(let i=0;i<d.length;i+=4){
    const g=Math.round(d[i]*.299+d[i+1]*.587+d[i+2]*.114);let v=g;
    if(mode.includes("contrast"))v=Math.max(0,Math.min(255,(g-128)*3.2+128));
    if(mode.includes("threshold"))v=g<threshold?0:255;
    if(mode.includes("soft"))v=g<205?25:255;
    d[i]=d[i+1]=d[i+2]=v
  }
  x.putImageData(im,0,0);return c
}

async function readCropCandidates(worker,field,c){
  const passes=[
    ["original",7,190],["sharp",7,190],["contrast",7,190],["sharp-contrast",7,190],
    ["threshold",7,145],["threshold",7,160],["threshold",7,175],["threshold",7,190],["threshold",7,205],
    ["sharp-threshold",7,160],["sharp-threshold",7,180],["soft",7,190],["contrast",8,190],["contrast",13,190]
  ];
  const score=new Map();
  for(const[mode,psm,t]of passes){
    await worker.setParameters({tessedit_pageseg_mode:String(psm),preserve_interword_spaces:"1",user_defined_dpi:"300",tessedit_char_whitelist:"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_/"});
    const r=await worker.recognize(prep(c,mode,t)),txt=r.data.text||"",conf=Number(r.data.confidence||0);
    for(const value of parseCandidates(field,txt)){
      const old=score.get(value)||{value,count:0,conf:0,maxConf:0};old.count++;old.conf+=conf;old.maxConf=Math.max(old.maxConf,conf);score.set(value,old)
    }
  }
  let ranked=[...score.values()].sort((a,b)=>b.count-a.count||b.maxConf-a.maxConf||b.conf-a.conf);
  if(field==="containerNumber")ranked=ranked.sort((a,b)=>(isValidContainer(b.value)?1:0)-(isValidContainer(a.value)?1:0)||b.count-a.count||b.maxConf-a.maxConf);
  return ranked
}

function reconcile(field,aList,bList){
  let best=null;
  for(const a of aList.slice(0,20))for(const b of bList.slice(0,20)){
    const sim=similarity(a.value,b.value),exact=norm(a.value)===norm(b.value),dist=editDistance(a.value,b.value),support=a.count+b.count,confidence=(a.maxConf+b.maxConf)/2;
    let score=(exact?1500:0)+sim*120+support*12+confidence/8;
    if(field==="containerNumber"){if(isValidContainer(a.value))score+=300;if(isValidContainer(b.value))score+=300}
    if(!best||score>best.score)best={a,b,sim,exact,dist,support,confidence,score}
  }
  if(!best)return null;

  // If both OCRs are very close and one side has a much stronger candidate,
  // prefer the stronger reading as canonical rather than immediately declaring mismatch.
  const stronger=best.a.count>best.b.count?best.a:best.b.count>best.a.count?best.b:(best.a.maxConf>=best.b.maxConf?best.a:best.b);
  return {...best,canonical:stronger.value}
}

function verdict(field,p){
  if(!p)return{status:"missing",text:"OCR อ่านไม่ครบ"};

  if(p.exact){
    if(field==="containerNumber"&&!isValidContainer(p.a.value))return{status:"uncertain",text:"OCR ตรงกัน แต่ Container ไม่ผ่าน ISO"};
    if(p.confidence<35)return{status:"uncertain",text:"OCR ตรงกัน แต่ความมั่นใจต่ำ"};
    return{status:"pass",text:"ตรงกัน"}
  }

  if(field==="containerNumber"){
    const av=isValidContainer(p.a.value),bv=isValidContainer(p.b.value);
    if(av&&bv&&p.dist>=3)return{status:"fail",text:"ไม่ตรงกัน"};
    if(!av||!bv)return{status:"uncertain",text:"OCR ไม่ชัวร์ — Container ไม่ผ่าน ISO"};
    return p.dist<=2?{status:"uncertain",text:"OCR ไม่ชัวร์"}:{status:"fail",text:"ไม่ตรงกัน"}
  }

  if(field==="sealNo"){
    if(p.dist<=1||p.sim>=0.88||p.confidence<50)return{status:"uncertain",text:"OCR ไม่ชัวร์"};
    return{status:"fail",text:"ไม่ตรงกัน"}
  }

  if(field==="booking"){
    if(p.dist<=2||p.sim>=0.82||p.confidence<55)return{status:"uncertain",text:"OCR ไม่ชัวร์"};
    return{status:"fail",text:"ไม่ตรงกัน"}
  }

  return{status:"fail",text:"ไม่ตรงกัน"}
}

function setProgress(p,t){document.querySelector("#progressWrap").classList.remove("hidden");document.querySelector("#bar").style.width=`${p}%`;document.querySelector("#progressPct").textContent=`${Math.round(p)}%`;document.querySelector("#progressText").textContent=t}

document.querySelector("#checkBtn").addEventListener("click",async()=>{
  const err=document.querySelector("#error");err.classList.add("hidden");
  if(!files[0]||!files[1]){err.textContent="กรุณาเลือกไฟล์ทั้ง 2 ฝั่ง";err.classList.remove("hidden");return}
  if([0,1].some(s=>fields.some(k=>!boxes[s]?.[k]))){err.textContent="กรุณากำหนดกรอบอ่านของข้อมูล 1 และข้อมูล 2 ให้ครบก่อน";err.classList.remove("hidden");return}

  const btn=document.querySelector("#checkBtn");btn.disabled=true;
  try{
    const candidateData=[{},{}],worker=await Tesseract.createWorker("eng",1,{logger:m=>{if(m.status==="recognizing text")setProgress(10+(m.progress||0)*80,"กำลัง sharpen + OCR หลายแบบ...")}});
    for(let s=0;s<2;s++)for(const f of fields){setProgress(8+(s*3+fields.indexOf(f))*14,`อ่าน ${labels[f]} — ข้อมูล ${s+1}`);candidateData[s][f]=await readCropCandidates(worker,f,crop(s,f))}
    await worker.terminate();

    const resolved={};
    for(const f of fields){const pair=reconcile(f,candidateData[0][f],candidateData[1][f]);resolved[f]={pair,verdict:verdict(f,pair)}}
    renderResolved(resolved);setProgress(100,"อ่านและเปรียบเทียบเสร็จแล้ว")
  }catch(e){err.textContent=`เกิดข้อผิดพลาด: ${e?.message||e}`;err.classList.remove("hidden")}finally{btn.disabled=false}
});

function renderResolved(resolved){
  const tbody=document.querySelector("#tbody");tbody.innerHTML="";
  const mismatches=[],uncertain=[],missing=[];

  for(const f of fields){
    const r=resolved[f],p=r.pair,a=p?.a?.value||"",b=p?.b?.value||"";
    let cls="missing";if(r.verdict.status==="pass")cls="pass";if(r.verdict.status==="fail")cls="fail";
    if(r.verdict.status==="fail")mismatches.push(labels[f]);
    if(r.verdict.status==="uncertain")uncertain.push(labels[f]);
    if(r.verdict.status==="missing")missing.push(labels[f]);

    const note=r.verdict.status==="uncertain"&&p?.canonical?`<div style="font-size:11px;color:#667085;margin-top:4px">ค่าที่น่าเชื่อถือกว่า: ${p.canonical}</div>`:"";
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${labels[f]}</td><td><input value="${a}" readonly></td><td><input value="${b}" readonly></td><td><span class="status ${cls}">${r.verdict.text}</span>${note}</td>`;
    tbody.append(tr)
  }

  const overall=document.querySelector("#overall"),sum=document.querySelector("#mismatchSummary");
  if(!mismatches.length&&!uncertain.length&&!missing.length){overall.className="overall pass";overall.textContent="ผ่านการตรวจสอบ";sum.textContent="ทั้ง 3 หัวข้อตรงกัน"}
  else if(mismatches.length){overall.className="overall fail";overall.textContent="ไม่ผ่านการตรวจสอบ";sum.textContent=`หัวข้อที่ยืนยันว่าไม่ตรง: ${mismatches.join(", ")}${uncertain.length?` | OCR ไม่ชัวร์: ${uncertain.join(", ")}`:""}`}
  else{overall.className="overall fail";overall.textContent="ยังยืนยันผลไม่ได้";const parts=[];if(uncertain.length)parts.push(`OCR ไม่ชัวร์: ${uncertain.join(", ")}`);if(missing.length)parts.push(`อ่านไม่ครบ: ${missing.join(", ")}`);sum.textContent=parts.join(" | ")}
  document.querySelector("#results").classList.remove("hidden")
}

document.querySelector("#resetBtn").addEventListener("click",()=>location.reload());