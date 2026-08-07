const pdfjsLib=await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const FIELDS=[
  {key:"containerNumber",label:"CONTAINER NUMBER"},
  {key:"sealNo",label:"SEAL NO"},
  {key:"booking",label:"BOOKING"}
];

let files=[null,null],canvases=[null,null],file2PrintPages=[];

function norm(v){return String(v||"").toUpperCase().replace(/\s+/g,"").replace(/[-_/.:,;|()[\]{}]/g,"")}
function clean(v){return String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"")}

const ISO_VALUES=(()=>{const m={};let n=10;for(const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ"){while(n%11===0)n++;m[c]=n;n++}return m})();
function isoDigit(code10){if(!/^[A-Z]{4}\d{6}$/.test(code10))return null;let s=0;for(let i=0;i<10;i++){const c=code10[i],v=/\d/.test(c)?+c:ISO_VALUES[c];s+=v*(2**i)}return(s%11)%10}
function validContainer(v){const x=clean(v);return/^[A-Z]{4}\d{7}$/.test(x)&&isoDigit(x.slice(0,10))===+x[10]}

function editDistance(a,b){a=norm(a);b=norm(b);const m=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));for(let i=0;i<=a.length;i++)m[i][0]=i;for(let j=0;j<=b.length;j++)m[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return m[a.length][b.length]}
function similarity(a,b){const x=norm(a),y=norm(b);if(!x||!y)return 0;return 1-editDistance(x,y)/Math.max(x.length,y.length)}

const GROUPS=[["0","O","Q","D"],["1","I","L","T"],["2","Z"],["3","8"],["4","A"],["5","S","6"],["6","G","5","8"],["7","T","1"],["8","B","3","6"],["9","G","4"],["P","F","R"],["C","G"],["V","Y"]];
function confusable(a,b){return a===b||GROUPS.some(g=>g.includes(a)&&g.includes(b))}

function bookingNormalize(v){
  let x=clean(v);if(x.length<10)return x;
  let best={v:x,s:-1};
  for(const split of [4,5]){
    if(x.length<=split)continue;
    let p=x.slice(0,split).replace(/0/g,"O").replace(/1/g,"I").replace(/2/g,"Z").replace(/5/g,"S").replace(/6/g,"G").replace(/8/g,"B");
    let n=x.slice(split).replace(/O/g,"0").replace(/[IL]/g,"1").replace(/Z/g,"2").replace(/S/g,"5").replace(/B/g,"8").replace(/G/g,"6");
    const v=p+n;let s=0;if(/^[A-Z]{4,5}\d{7,9}$/.test(v))s+=100;if(/^SGZG\d{7,9}$/.test(v))s+=30;if(v.length>=11&&v.length<=13)s+=10;if(s>best.s)best={v,s}
  }
  return best.v
}

function parseReference(field,text){
  const raw=String(text||"").toUpperCase();
  const tokens=(raw.match(/[A-Z0-9][A-Z0-9\-_/]{4,22}/g)||[]).map(clean);

  if(field==="containerNumber"){
    const out=[];
    for(const t of tokens){
      for(let i=0;i<=t.length-11;i++){let s=t.slice(i,i+11),p=s.slice(0,4).replace(/0/g,"O").replace(/1/g,"I").replace(/5/g,"S").replace(/8/g,"B"),n=s.slice(4).replace(/O/g,"0").replace(/[IL]/g,"1").replace(/Z/g,"2").replace(/S/g,"5").replace(/B/g,"8").replace(/G/g,"6"),v=p+n;if(validContainer(v))out.push(v)}
    }
    return [...new Set(out)];
  }

  if(field==="sealNo") return [...new Set(tokens.filter(t=>/[A-Z]/.test(t)&&/\d/.test(t)&&t.length>=7&&t.length<=14))];
  if(field==="booking") return [...new Set(tokens.filter(t=>/[A-Z]/.test(t)&&/\d/.test(t)&&t.length>=8&&t.length<=18).map(bookingNormalize))];
  return[];
}

async function loadFile(file,side){
  if(file.type.startsWith("image/")){
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=URL.createObjectURL(file)});
    const max=2600,sc=Math.min(5,Math.max(1,max/Math.max(img.naturalWidth,img.naturalHeight))),c=document.createElement("canvas");
    c.width=Math.round(img.naturalWidth*sc);c.height=Math.round(img.naturalHeight*sc);c.getContext("2d").drawImage(img,0,0,c.width,c.height);
    if(side===1)file2PrintPages=[img.src];
    return c
  }

  if(file.type==="application/pdf"||file.name.toLowerCase().endsWith(".pdf")){
    const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise,pages=[];
    let first=null;
    for(let p=1;p<=pdf.numPages;p++){
      const page=await pdf.getPage(p),vp=page.getViewport({scale:3}),c=document.createElement("canvas");
      c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);await page.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;
      if(!first)first=c;
      if(side===1)pages.push(c.toDataURL("image/png"));
    }
    if(side===1)file2PrintPages=pages;
    return first
  }

  throw new Error("รองรับเฉพาะ PDF และรูปภาพ")
}

function preview(side){
  const src=canvases[side],c=document.querySelector(`#preview${side+1}`),ctx=c.getContext("2d"),ph=document.querySelector(`#ph${side+1}`);
  if(!src)return;ph.style.display="none";const sc=Math.min(520/src.width,290/src.height,1);c.width=Math.round(src.width*sc);c.height=Math.round(src.height*sc);ctx.drawImage(src,0,0,c.width,c.height)
}

for(let s=0;s<2;s++){
  document.querySelector(`#file${s+1}`).addEventListener("change",async e=>{
    const f=e.target.files?.[0];if(!f)return;
    files[s]=f;document.querySelector(`#name${s+1}`).textContent=f.name;
    canvases[s]=await loadFile(f,s);preview(s)
  })
}

function prep(src,mode,t=190){
  const c=document.createElement("canvas");c.width=src.width;c.height=src.height;const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(src,0,0);
  if(mode==="original")return c;
  const im=x.getImageData(0,0,c.width,c.height),d=im.data;
  for(let i=0;i<d.length;i+=4){const g=Math.round(d[i]*.299+d[i+1]*.587+d[i+2]*.114);let v=g;if(mode==="contrast")v=Math.max(0,Math.min(255,(g-128)*2.7+128));if(mode==="threshold")v=g<t?0:255;d[i]=d[i+1]=d[i+2]=v}
  x.putImageData(im,0,0);return c
}

async function ocrPasses(worker,src){
  const outputs=[];
  for(const [mode,psm,t] of [["original",6,190],["contrast",6,190],["contrast",11,190],["threshold",11,165],["threshold",11,185],["threshold",11,205]]){
    await worker.setParameters({tessedit_pageseg_mode:String(psm),preserve_interword_spaces:"1",user_defined_dpi:"300"});
    const r=await worker.recognize(prep(src,mode,t));outputs.push({text:r.data.text||"",conf:+(r.data.confidence||0)})
  }
  return outputs
}

function selectReference(field,passes){
  const score=new Map();
  for(const p of passes)for(const v of parseReference(field,p.text)){const o=score.get(v)||{value:v,count:0,conf:0};o.count++;o.conf+=p.conf;score.set(v,o)}
  return [...score.values()].sort((a,b)=>b.count-a.count||b.conf-a.conf)
}

function broadCropEar(field){
  const src=canvases[0];
  // Broad zones, intentionally larger than exact value boxes.
  const z={
    containerNumber:{x:.10,y:.20,w:.48,h:.20},
    sealNo:{x:.10,y:.30,w:.48,h:.18},
    booking:{x:.50,y:.25,w:.47,h:.22}
  }[field];
  const sx=Math.round(z.x*src.width),sy=Math.round(z.y*src.height),sw=Math.round(z.w*src.width),sh=Math.round(z.h*src.height),c=document.createElement("canvas");
  c.width=sw;c.height=sh;c.getContext("2d").drawImage(src,sx,sy,sw,sh,0,0,sw,sh);return c
}

function tokensForEar(field,text){
  const raw=String(text||"").toUpperCase(),tokens=(raw.match(/[A-Z0-9][A-Z0-9\-_/]{4,22}/g)||[]).map(clean);
  if(field==="containerNumber"){const a=[];for(const t of tokens)for(let i=0;i<=t.length-11;i++)a.push(t.slice(i,i+11));return a}
  if(field==="sealNo")return tokens.filter(x=>x.length>=7&&x.length<=14);
  return tokens.filter(x=>x.length>=8&&x.length<=18)
}

function repairAgainstReference(field,candidate,ref){
  let c=clean(candidate),r=clean(ref);
  if(field==="booking"){c=bookingNormalize(c);r=bookingNormalize(r)}
  if(c.length!==r.length)return null;

  let hard=0;
  for(let i=0;i<r.length;i++){
    if(c[i]===r[i])continue;
    if(!confusable(c[i],r[i]))hard++
  }

  const sim=similarity(c,r);
  const maxHard=field==="containerNumber"?1:field==="sealNo"?1:2;
  const minSim=field==="containerNumber"?.72:field==="sealNo"?.76:.70;

  if(hard<=maxHard&&sim>=minSim)return r;
  return null
}

function bestEarMatch(field,passes,reference){
  let best=null;
  for(const p of passes){
    for(const token of tokensForEar(field,p.text)){
      let candidate=token;
      if(field==="booking")candidate=bookingNormalize(candidate);
      const repaired=repairAgainstReference(field,candidate,reference);
      const sim=similarity(candidate,reference);
      const score=(repaired?200:0)+sim*100+p.conf/10;
      if(!best||score>best.score)best={raw:candidate,value:repaired||candidate,sim,repaired:Boolean(repaired),score}
    }
  }
  return best
}

function setProgress(p,t){
  document.querySelector("#progressWrap").classList.remove("hidden");
  document.querySelector("#bar").style.width=`${p}%`;
  document.querySelector("#progressPct").textContent=`${Math.round(p)}%`;
  document.querySelector("#progressText").textContent=t
}

function showError(msg){const e=document.querySelector("#error");e.textContent=msg;e.classList.remove("hidden")}
function clearError(){document.querySelector("#error").classList.add("hidden")}

document.querySelector("#checkBtn").addEventListener("click",async()=>{
  clearError();
  if(!files[0]||!files[1]){showError("กรุณาเลือกไฟล์ทั้ง 2 ไฟล์");return}
  const btn=document.querySelector("#checkBtn");btn.disabled=true;

  try{
    const worker=await Tesseract.createWorker("eng",1,{logger:m=>{if(m.status==="recognizing text")setProgress(10+(m.progress||0)*80,"กำลังอ่านเอกสาร...")}});
    setProgress(5,"อ่านข้อมูล 2 เพื่อสร้าง reference...");
    const refPasses=await ocrPasses(worker,canvases[1]);

    const refs={};
    for(const f of FIELDS){
      const arr=selectReference(f.key,refPasses);
      refs[f.key]=arr[0]?.value||""
    }

    if(FIELDS.some(f=>!refs[f.key])){
      await worker.terminate();
      showError("ข้อมูล 2 ยังอ่านไม่ครบ กรุณาใช้ไฟล์ PDF/ภาพที่คมชัดของแบบฟอร์มควบคุมรถ");
      return
    }

    const ear={};
    for(let i=0;i<FIELDS.length;i++){
      const f=FIELDS[i];
      setProgress(35+i*18,`กำลังตรวจ ${f.label} ในใบ EAR...`);
      const passes=await ocrPasses(worker,broadCropEar(f.key));
      ear[f.key]=bestEarMatch(f.key,passes,refs[f.key])
    }

    await worker.terminate();
    render(refs,ear)
  }catch(err){console.error(err);showError(`เกิดข้อผิดพลาด: ${err?.message||err}`)}
  finally{btn.disabled=false}
});

function render(refs,ear){
  const body=document.querySelector("#tbody");body.innerHTML="";
  const mismatch=[],uncertain=[];

  for(const f of FIELDS){
    const e=ear[f.key],r=refs[f.key];
    let status="fail",txt="ไม่ตรงกัน",earValue=e?.value||"";

    if(e?.repaired||norm(earValue)===norm(r)){status="pass";txt=e?.repaired?"ตรงกันหลังแก้ OCR":"ตรงกัน"}
    else if(e&&e.sim>=.65){status="wait";txt="OCR ไม่ชัวร์";uncertain.push(f.label)}
    else mismatch.push(f.label);

    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${f.label}</td><td><input value="${earValue}" readonly></td><td><input value="${r}" readonly></td><td><span class="status ${status}">${txt}</span></td>`;
    body.append(tr)
  }

  const overall=document.querySelector("#overall"),summary=document.querySelector("#summary");
  const passed=!mismatch.length&&!uncertain.length;

  if(passed){
    overall.className="overall pass";overall.textContent="ผ่านการตรวจสอบ";
    summary.textContent="ทั้ง 3 หัวข้อตรงกัน — สามารถพิมพ์แบบฟอร์มข้อมูล 2 ได้";
    document.querySelector("#printBtn").classList.remove("hidden")
  }else if(uncertain.length){
    overall.className="overall wait";overall.textContent="ยังยืนยันผลไม่ได้";
    summary.textContent=`OCR ไม่ชัวร์: ${uncertain.join(", ")}${mismatch.length?` | ไม่ตรงกัน: ${mismatch.join(", ")}`:""}`;
    document.querySelector("#printBtn").classList.add("hidden")
  }else{
    overall.className="overall fail";overall.textContent="ไม่ผ่านการตรวจสอบ";
    summary.textContent=`หัวข้อที่ไม่ตรง: ${mismatch.join(", ")}`;
    document.querySelector("#printBtn").classList.add("hidden")
  }

  document.querySelector("#results").classList.remove("hidden");
  setProgress(100,"ตรวจสอบเสร็จแล้ว")
}

document.querySelector("#printBtn").addEventListener("click",()=>{
  if(!file2PrintPages.length){showError("ไม่พบภาพสำหรับพิมพ์ข้อมูล 2");return}
  const w=window.open("","_blank");
  const pages=file2PrintPages.map((src,i)=>`<div class="page"><img src="${src}"></div>`).join("");
  w.document.write(`<!doctype html><html><head><title>Print Vehicle Control Form</title>
  <style>
    @page{size:auto;margin:0}
    html,body{margin:0;padding:0;background:white}
    .page{page-break-after:always;width:100%;display:flex;align-items:flex-start;justify-content:center}
    .page:last-child{page-break-after:auto}
    img{width:100%;height:auto;display:block}
  </style></head><body>${pages}<script>
    window.onload=()=>setTimeout(()=>window.print(),300);
  <\/script></body></html>`);
  w.document.close()
});

document.querySelector("#resetBtn").addEventListener("click",()=>location.reload());
