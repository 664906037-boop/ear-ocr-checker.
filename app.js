const pdfjsLib=await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const FIELD_INFO={
  containerNumber:{label:"CONTAINER NUMBER",aliases:["CONTAINER NUMBER","CONTAINER NO","CONTAINER","CNTR NO","CNTR NUMBER"]},
  sealNo:{label:"SEAL NO",aliases:["SEAL NO","SEAL NUMBER","SEAL"]},
  booking:{label:"BOOKING",aliases:["BOOKING NO","BOOKING NUMBER","BOOKING"]}
};

let files=[null,null],canvases=[null,null],file2PrintPages=[];

function clean(v){return String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"")}
function norm(v){return clean(v)}
function fixLabel(v){
  return String(v||"").toUpperCase()
    .replace(/C[0O]NTA[I1L]NER/g,"CONTAINER")
    .replace(/B[0O][0O]K[I1L]NG/g,"BOOKING")
    .replace(/SEA[I1L]/g,"SEAL")
    .replace(/\bN[0O]\b/g,"NO")
    .replace(/\s+/g," ").trim()
}

const ISO_VALUES=(()=>{const m={};let n=10;for(const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ"){while(n%11===0)n++;m[c]=n;n++}return m})();
function isoDigit(code10){
  if(!/^[A-Z]{4}\d{6}$/.test(code10))return null;
  let s=0;
  for(let i=0;i<10;i++){const c=code10[i],v=/\d/.test(c)?+c:ISO_VALUES[c];s+=v*(2**i)}
  return(s%11)%10
}
function validContainer(v){
  const x=clean(v);
  return/^[A-Z]{4}\d{7}$/.test(x)&&isoDigit(x.slice(0,10))===+x[10]
}
function repairContainer(raw){
  const x=clean(raw),out=[];
  for(let i=0;i<=x.length-11;i++){
    const s=x.slice(i,i+11);
    const p=s.slice(0,4).replace(/0/g,"O").replace(/1/g,"I").replace(/5/g,"S").replace(/8/g,"B");
    const n=s.slice(4).replace(/O/g,"0").replace(/[IL]/g,"1").replace(/Z/g,"2").replace(/S/g,"5").replace(/B/g,"8").replace(/G/g,"6");
    const v=p+n;
    if(/^[A-Z]{4}\d{7}$/.test(v))out.push(v)
  }
  return out.find(validContainer)||out[0]||""
}
function normalizeBooking(raw){
  let x=clean(raw);if(x.length<10)return x;
  let best={v:x,s:-1};
  for(const split of [4,5]){
    let p=x.slice(0,split).replace(/0/g,"O").replace(/1/g,"I").replace(/2/g,"Z").replace(/5/g,"S").replace(/6/g,"G").replace(/8/g,"B");
    let n=x.slice(split).replace(/O/g,"0").replace(/[IL]/g,"1").replace(/Z/g,"2").replace(/S/g,"5").replace(/B/g,"8").replace(/G/g,"6");
    const v=p+n;
    let s=0;
    if(/^[A-Z]{4,5}\d{7,9}$/.test(v))s+=100;
    if(/^SGZG\d{7,9}$/.test(v))s+=25;
    if(s>best.s)best={v,s}
  }
  return best.v
}
function parseValue(field,raw){
  const text=String(raw||"").toUpperCase();
  const tokens=(text.match(/[A-Z0-9][A-Z0-9\-_/]{4,22}/g)||[]).map(clean);

  if(field==="containerNumber"){
    for(const t of tokens){const v=repairContainer(t);if(v)return v}
    return repairContainer(text)
  }

  if(field==="sealNo"){
    const c=tokens.filter(x=>/[A-Z]/.test(x)&&/\d/.test(x)&&x.length>=7&&x.length<=14);
    c.sort((a,b)=>{
      const sa=(/^TH[A-Z]{2}\d{5,9}$/.test(a)?100:0)+(/^[A-Z]{4}\d{5,9}$/.test(a)?50:0);
      const sb=(/^TH[A-Z]{2}\d{5,9}$/.test(b)?100:0)+(/^[A-Z]{4}\d{5,9}$/.test(b)?50:0);
      return sb-sa
    });
    return c[0]||""
  }

  const c=tokens.map(normalizeBooking).filter(x=>/^[A-Z]{4,5}\d{7,9}$/.test(x));
  c.sort((a,b)=>(/^SGZG/.test(b)?1:0)-(/^SGZG/.test(a)?1:0));
  return c[0]||""
}

function editDistance(a,b){
  a=norm(a);b=norm(b);
  const m=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++)m[i][0]=i;
  for(let j=0;j<=b.length;j++)m[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)m[i][j]=Math.min(
    m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1)
  );
  return m[a.length][b.length]
}
function similarity(a,b){
  const x=norm(a),y=norm(b);
  if(!x||!y)return 0;
  return 1-editDistance(x,y)/Math.max(x.length,y.length)
}

async function fileToCanvas(file,side){
  if(file.type.startsWith("image/")){
    const src=URL.createObjectURL(file);
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src});
    const max=2800,sc=Math.min(5,Math.max(1,max/Math.max(img.naturalWidth,img.naturalHeight)));
    const c=document.createElement("canvas");
    c.width=Math.round(img.naturalWidth*sc);c.height=Math.round(img.naturalHeight*sc);
    c.getContext("2d").drawImage(img,0,0,c.width,c.height);
    if(side===1)file2PrintPages=[src];
    return c
  }

  if(file.type==="application/pdf"||file.name.toLowerCase().endsWith(".pdf")){
    const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
    let first=null;const pages=[];
    for(let p=1;p<=pdf.numPages;p++){
      const page=await pdf.getPage(p),vp=page.getViewport({scale:3}),c=document.createElement("canvas");
      c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);
      await page.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;
      if(!first)first=c;
      if(side===1)pages.push(c.toDataURL("image/png"))
    }
    if(side===1)file2PrintPages=pages;
    return first
  }
  throw new Error("รองรับเฉพาะ PDF และรูปภาพ")
}

function preview(side){
  const src=canvases[side],c=document.querySelector(`#preview${side+1}`),ctx=c.getContext("2d"),ph=document.querySelector(`#ph${side+1}`);
  ph.style.display="none";
  const sc=Math.min(520/src.width,290/src.height,1);
  c.width=Math.round(src.width*sc);c.height=Math.round(src.height*sc);
  ctx.drawImage(src,0,0,c.width,c.height)
}

for(let s=0;s<2;s++){
  document.querySelector(`#file${s+1}`).addEventListener("change",async e=>{
    const f=e.target.files?.[0];if(!f)return;
    files[s]=f;
    document.querySelector(`#name${s+1}`).textContent=f.name;
    canvases[s]=await fileToCanvas(f,s);
    preview(s)
  })
}

function prep(src,mode,t=190){
  const c=document.createElement("canvas");
  c.width=src.width;c.height=src.height;
  const x=c.getContext("2d",{willReadFrequently:true});
  x.drawImage(src,0,0);
  if(mode==="original")return c;
  const im=x.getImageData(0,0,c.width,c.height),d=im.data;
  for(let i=0;i<d.length;i+=4){
    const g=Math.round(d[i]*.299+d[i+1]*.587+d[i+2]*.114);
    let v=g;
    if(mode==="contrast")v=Math.max(0,Math.min(255,(g-128)*2.6+128));
    if(mode==="threshold")v=g<t?0:255;
    d[i]=d[i+1]=d[i+2]=v
  }
  x.putImageData(im,0,0);
  return c
}

function wordBox(w){
  const b=w.bbox||{};
  return{text:String(w.text||"").trim(),conf:+(w.confidence??w.conf??0),
    x0:b.x0||0,y0:b.y0||0,x1:b.x1||0,y1:b.y1||0,
    cx:((b.x0||0)+(b.x1||0))/2,cy:((b.y0||0)+(b.y1||0))/2,
    h:Math.max(1,(b.y1||0)-(b.y0||0))}
}
function linesFromWords(words){
  const arr=(words||[]).map(wordBox).filter(w=>w.text&&w.conf>8).sort((a,b)=>a.cy-b.cy||a.x0-b.x0),lines=[];
  for(const w of arr){
    let hit=null,dist=1e9;
    for(const l of lines){
      const d=Math.abs(l.cy-w.cy),tol=Math.max(12,Math.max(l.h,w.h)*.8);
      if(d<=tol&&d<dist){hit=l;dist=d}
    }
    if(!hit)lines.push({words:[w],cy:w.cy,h:w.h});
    else{
      hit.words.push(w);
      hit.cy=hit.words.reduce((s,x)=>s+x.cy,0)/hit.words.length;
      hit.h=hit.words.reduce((s,x)=>s+x.h,0)/hit.words.length
    }
  }
  for(const l of lines){l.words.sort((a,b)=>a.x0-b.x0);l.text=l.words.map(w=>w.text).join(" ")}
  return lines
}
function lev(a,b){
  a=fixLabel(a);b=fixLabel(b);
  const m=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++)m[i][0]=i;
  for(let j=0;j<=b.length;j++)m[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)m[i][j]=Math.min(
    m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1)
  );
  return m[a.length][b.length]
}
function simLabel(a,b){
  a=fixLabel(a);b=fixLabel(b);
  if(!a||!b)return 0;
  return 1-lev(a,b)/Math.max(a.length,b.length)
}
function findLabel(lines,aliases){
  let best=null;
  for(const line of lines){
    for(let i=0;i<line.words.length;i++){
      for(let n=1;n<=3&&i+n<=line.words.length;n++){
        const g=line.words.slice(i,i+n),text=g.map(x=>x.text).join(" ");
        for(const alias of aliases){
          const s=simLabel(text,alias);
          if(s>=.62&&(!best||s>best.score)){
            best={score:s,line,group:g,x1:g[g.length-1].x1,
              y0:Math.min(...g.map(x=>x.y0)),y1:Math.max(...g.map(x=>x.y1)),
              h:g.reduce((q,x)=>q+x.h,0)/g.length}
          }
        }
      }
    }
  }
  return best
}
function cropNearLabel(src,hit){
  const x0=Math.max(0,Math.round(hit.x1+hit.h*.3));
  const y0=Math.max(0,Math.round(hit.y0-hit.h*.9));
  const x1=Math.min(src.width,Math.round(x0+hit.h*18));
  const y1=Math.min(src.height,Math.round(hit.y1+hit.h*1.1));
  const sw=Math.max(1,x1-x0),sh=Math.max(1,y1-y0),scale=5;
  const c=document.createElement("canvas");
  c.width=sw*scale;c.height=sh*scale;
  c.getContext("2d").drawImage(src,x0,y0,sw,sh,0,0,c.width,c.height);
  return c
}
async function locateAndRead(worker,src,field){
  await worker.setParameters({tessedit_pageseg_mode:"6",preserve_interword_spaces:"1",user_defined_dpi:"300"});
  const first=await worker.recognize(prep(src,"contrast"));
  const lines=linesFromWords(first.data.words||[]);
  const hit=findLabel(lines,FIELD_INFO[field].aliases);
  const candidates=[];

  if(hit){
    const crop=cropNearLabel(src,hit);
    for(const [mode,psm,t] of [["original",7,190],["contrast",7,190],["threshold",7,175],["threshold",7,195]]){
      await worker.setParameters({
        tessedit_pageseg_mode:String(psm),
        preserve_interword_spaces:"1",
        user_defined_dpi:"300",
        tessedit_char_whitelist:"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_/"
      });
      const r=await worker.recognize(prep(crop,mode,t));
      const v=parseValue(field,r.data.text||"");
      if(v)candidates.push({v,conf:+(r.data.confidence||0)})
    }
  }

  if(!candidates.length){
    const v=parseValue(field,first.data.text||"");
    if(v)candidates.push({v,conf:+(first.data.confidence||0)})
  }

  candidates.sort((a,b)=>b.conf-a.conf);
  return candidates[0]?.v||""
}

function setProgress(p,t){
  document.querySelector("#progressWrap").classList.remove("hidden");
  document.querySelector("#bar").style.width=`${p}%`;
  document.querySelector("#progressPct").textContent=`${Math.round(p)}%`;
  document.querySelector("#progressText").textContent=t
}
function showError(m){const e=document.querySelector("#error");e.textContent=m;e.classList.remove("hidden")}
function clearError(){document.querySelector("#error").classList.add("hidden")}

document.querySelector("#checkBtn").addEventListener("click",async()=>{
  clearError();
  document.querySelector("#printBtn").disabled=true;
  if(!files[0]||!files[1]){showError("กรุณาเลือกไฟล์ทั้ง 2 ไฟล์");return}

  const btn=document.querySelector("#checkBtn");
  btn.disabled=true;

  try{
    const worker=await Tesseract.createWorker("eng",1,{
      logger:m=>{
        if(m.status==="recognizing text"){
          setProgress(10+(m.progress||0)*80,"กำลังอ่านหัวข้อและค่าที่อยู่ใกล้กัน...")
        }
      }
    });

    const values=[{},{}];
    for(let side=0;side<2;side++){
      for(let i=0;i<Object.keys(FIELD_INFO).length;i++){
        const field=Object.keys(FIELD_INFO)[i];
        setProgress(8+(side*3+i)*14,`อ่าน ${FIELD_INFO[field].label} — ข้อมูล ${side+1}`);
        values[side][field]=await locateAndRead(worker,canvases[side],field)
      }
    }

    await worker.terminate();
    render(values)
  }catch(e){
    console.error(e);
    showError(`เกิดข้อผิดพลาด: ${e?.message||e}`)
  }finally{
    btn.disabled=false
  }
});

function render(values){
  const body=document.querySelector("#tbody");
  body.innerHTML="";
  const mismatch=[],uncertain=[];

  for(const [field,info] of Object.entries(FIELD_INFO)){
    const a=values[0][field]||"",b=values[1][field]||"";
    const sim=similarity(a,b);
    let cls="fail",txt="ไม่ตรงกัน";

    if(norm(a)&&norm(a)===norm(b)){cls="pass";txt="ตรงกัน"}
    else if(a&&b&&sim>=.82){cls="wait";txt="OCR ไม่ชัวร์";uncertain.push(info.label)}
    else mismatch.push(info.label);

    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${info.label}</td>
      <td><input value="${a}" readonly></td>
      <td><input value="${b}" readonly></td>
      <td><span class="status ${cls}">${txt}</span></td>`;
    body.append(tr)
  }

  const overall=document.querySelector("#overall");
  const summary=document.querySelector("#summary");

  if(!mismatch.length&&!uncertain.length){
    overall.className="overall pass";
    overall.textContent="ผ่านการตรวจสอบ";
    summary.textContent="ทั้ง 3 หัวข้อตรงกัน — พร้อมพิมพ์แบบฟอร์มข้อมูล 2";
    document.querySelector("#printBtn").disabled=false
  }else if(uncertain.length){
    overall.className="overall wait";
    overall.textContent="ยังยืนยันผลไม่ได้";
    summary.textContent=`OCR ไม่ชัวร์: ${uncertain.join(", ")}${mismatch.length?` | ไม่ตรงกัน: ${mismatch.join(", ")}`:""}`
  }else{
    overall.className="overall fail";
    overall.textContent="ไม่ผ่านการตรวจสอบ";
    summary.textContent=`หัวข้อที่ไม่ตรง: ${mismatch.join(", ")}`
  }

  document.querySelector("#results").classList.remove("hidden");
  setProgress(100,"ตรวจสอบเสร็จแล้ว")
}

document.querySelector("#printBtn").addEventListener("click",()=>{
  if(!file2PrintPages.length){showError("ไม่พบไฟล์ข้อมูล 2 สำหรับพิมพ์");return}

  const w=window.open("","_blank");
  if(!w){alert("กรุณาอนุญาต Pop-up สำหรับเว็บไซต์นี้");return}

  const pages=file2PrintPages.map(src=>`<section class="page"><img src="${src}"></section>`).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Print Form</title>
  <style>
    @page{size:A4;margin:0}
    html,body{margin:0}
    .page{width:210mm;min-height:297mm;page-break-after:always}
    .page:last-child{page-break-after:auto}
    img{width:210mm;height:auto;display:block}
  </style></head><body>${pages}<script>
  window.onload=()=>setTimeout(()=>window.print(),400)
  <\/script></body></html>`);
  w.document.close()
});

document.querySelector("#resetBtn").addEventListener("click",()=>location.reload());
