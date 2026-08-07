
const pdfjsLib = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

let currentFile = null;

const FIELD_INFO = {
  containerNumber: {
    label: "CONTAINER NUMBER",
    aliases: ["CONTAINER NUMBER", "CONTAINER NO", "CONTAINER"],
  },
  sealNo: {
    label: "SEAL NO",
    aliases: ["SEAL NO", "SEAL NUMBER", "SEAL"],
  },
  booking: {
    label: "BOOKING",
    aliases: ["BOOKING", "BOOKING NO", "BOOKING NUMBER"],
  },
};

function normalizeText(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/C[0O]NTA[I1L]NER/g, "CONTAINER")
    .replace(/B[0O][0O]K[I1L]NG/g, "BOOKING")
    .replace(/SEA[I1L]/g, "SEAL")
    .replace(/\bN[0O]\b/g, "NO")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function editDistance(a, b) {
  a = normalizeText(a);
  b = normalizeText(b);
  const m = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) m[i][0] = i;
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = Math.min(
        m[i - 1][j] + 1,
        m[i][j - 1] + 1,
        m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return m[a.length][b.length];
}

function similarity(a, b) {
  a = normalizeText(a);
  b = normalizeText(b);
  if (!a || !b) return 0;
  return 1 - editDistance(a, b) / Math.max(a.length, b.length);
}

function repairContainer(raw) {
  let value = cleanCode(raw);
  const windows = [];
  for (let i = 0; i <= Math.max(0, value.length - 11); i++) {
    windows.push(value.slice(i, i + 11));
  }
  if (!windows.length) windows.push(value);

  for (const s of windows) {
    if (s.length !== 11) continue;
    const prefix = s
      .slice(0, 4)
      .replace(/0/g, "O")
      .replace(/1/g, "I")
      .replace(/5/g, "S")
      .replace(/8/g, "B");
    const digits = s
      .slice(4)
      .replace(/O/g, "0")
      .replace(/[IL]/g, "1")
      .replace(/Z/g, "2")
      .replace(/S/g, "5")
      .replace(/B/g, "8")
      .replace(/G/g, "6");
    const candidate = prefix + digits;
    if (/^[A-Z]{4}\d{7}$/.test(candidate)) return candidate;
  }
  return "";
}

function parseCode(fieldKey, raw) {
  const text = String(raw || "").toUpperCase();

  if (fieldKey === "containerNumber") {
    return repairContainer(text);
  }

  const tokens =
    text.match(/[A-Z0-9][A-Z0-9\-_/]{4,20}/g)?.map(cleanCode) || [];

  const filtered = tokens.filter(
    (x) => /[A-Z]/.test(x) && /\d/.test(x)
  );

  if (fieldKey === "sealNo") {
    return (
      filtered
        .filter((x) => x.length >= 7 && x.length <= 14)
        .sort((a, b) => Math.abs(a.length - 9) - Math.abs(b.length - 9))[0] ||
      ""
    );
  }

  if (fieldKey === "booking") {
    return (
      filtered
        .filter((x) => x.length >= 8 && x.length <= 16)
        .sort((a, b) => b.length - a.length)[0] || ""
    );
  }

  return "";
}

function wordBox(word) {
  const box = word.bbox || {};
  const x0 = box.x0 ?? 0;
  const y0 = box.y0 ?? 0;
  const x1 = box.x1 ?? 0;
  const y1 = box.y1 ?? 0;
  return {
    text: String(word.text || "").trim(),
    confidence: Number(word.confidence ?? word.conf ?? 0),
    x0,
    y0,
    x1,
    y1,
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    w: Math.max(1, x1 - x0),
    h: Math.max(1, y1 - y0),
  };
}

function groupLines(words) {
  const sorted = words
    .map(wordBox)
    .filter((w) => w.text && w.confidence > 8)
    .sort((a, b) => a.cy - b.cy || a.x0 - b.x0);

  const lines = [];
  for (const word of sorted) {
    let chosen = null;
    let best = Infinity;
    for (const line of lines) {
      const tolerance = Math.max(12, Math.max(line.avgH, word.h) * 0.8);
      const d = Math.abs(line.cy - word.cy);
      if (d <= tolerance && d < best) {
        chosen = line;
        best = d;
      }
    }

    if (!chosen) {
      lines.push({ words: [word], cy: word.cy, avgH: word.h });
    } else {
      chosen.words.push(word);
      chosen.cy =
        chosen.words.reduce((s, x) => s + x.cy, 0) / chosen.words.length;
      chosen.avgH =
        chosen.words.reduce((s, x) => s + x.h, 0) / chosen.words.length;
    }
  }

  for (const line of lines) {
    line.words.sort((a, b) => a.x0 - b.x0);
    line.text = line.words.map((w) => w.text).join(" ");
  }
  return lines.sort((a, b) => a.cy - b.cy);
}

function findLabel(lines, aliases) {
  let bestHit = null;

  for (const line of lines) {
    const words = line.words;
    for (let start = 0; start < words.length; start++) {
      for (let count = 1; count <= 3 && start + count <= words.length; count++) {
        const group = words.slice(start, start + count);
        const text = group.map((w) => w.text).join(" ");

        for (const alias of aliases) {
          const score = similarity(text, alias);
          const threshold = alias.length <= 6 ? 0.68 : 0.62;
          if (
            score >= threshold &&
            (!bestHit || score > bestHit.score)
          ) {
            bestHit = {
              score,
              text,
              x0: group[0].x0,
              x1: group[group.length - 1].x1,
              y0: Math.min(...group.map((x) => x.y0)),
              y1: Math.max(...group.map((x) => x.y1)),
              cy: group.reduce((s, x) => s + x.cy, 0) / group.length,
              avgH: group.reduce((s, x) => s + x.h, 0) / group.length,
            };
          }
        }
      }
    }
  }

  return bestHit;
}

function cropRelativeToLabel(source, label, fieldKey) {
  // The EAR samples consistently place the value to the right of the label.
  // Take a tight horizontal band around that row.
  const padY = Math.max(10, label.avgH * 1.0);
  const startX = Math.max(0, Math.round(label.x1 + label.avgH * 0.5));
  const y0 = Math.max(0, Math.round(label.y0 - padY));
  const y1 = Math.min(
    source.height,
    Math.round(label.y1 + padY)
  );

  // Width is intentionally field-specific.
  let widthFactor = 11;
  if (fieldKey === "containerNumber") widthFactor = 13;
  if (fieldKey === "booking") widthFactor = 15;

  const endX = Math.min(
    source.width,
    Math.round(startX + label.avgH * widthFactor)
  );

  return cropCanvas(source, startX, y0, endX - startX, y1 - y0, 5);
}

function fallbackCrop(source, fieldKey) {
  // Fallback calibrated from the five EAR examples after full-page normalization.
  // Used only when the label itself is too blurry for first-pass OCR.
  const zones = {
    containerNumber: { x: 0.15, y: 0.29, w: 0.34, h: 0.11 },
    sealNo: { x: 0.15, y: 0.38, w: 0.34, h: 0.10 },
    booking: { x: 0.58, y: 0.37, w: 0.34, h: 0.11 },
  };
  const z = zones[fieldKey];
  return cropCanvas(
    source,
    Math.round(z.x * source.width),
    Math.round(z.y * source.height),
    Math.round(z.w * source.width),
    Math.round(z.h * source.height),
    5
  );
}

function cropCanvas(source, x, y, w, h, scale = 4) {
  x = Math.max(0, x);
  y = Math.max(0, y);
  w = Math.max(1, Math.min(w, source.width - x));
  h = Math.max(1, Math.min(h, source.height - y));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function preprocess(source, mode) {
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0);

  if (mode === "original") return out;

  const image = ctx.getImageData(0, 0, out.width, out.height);
  const d = image.data;

  for (let i = 0; i < d.length; i += 4) {
    const gray = Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
    let v = gray;

    if (mode === "contrast") {
      v = Math.max(0, Math.min(255, (gray - 128) * 2.4 + 128));
    } else if (mode === "threshold") {
      v = gray < 185 ? 0 : 255;
    } else if (mode === "soft") {
      v = gray < 205 ? 25 : 255;
    }

    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(image, 0, 0);
  return out;
}

async function ocrSmallCrop(worker, crop, fieldKey) {
  const passes = [
    ["original", 7],
    ["contrast", 7],
    ["threshold", 7],
    ["soft", 8],
  ];

  const results = [];

  for (const [mode, psm] of passes) {
    await worker.setParameters({
      tessedit_pageseg_mode: String(psm),
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_/",
    });

    const processed = preprocess(crop, mode);
    const result = await worker.recognize(processed);
    const raw = result.data.text || "";
    const value = parseCode(fieldKey, raw);

    results.push({
      mode,
      raw,
      value,
      confidence: Number(result.data.confidence || 0),
    });
  }

  const votes = new Map();
  for (const item of results) {
    if (!item.value) continue;
    const key = item.value;
    const existing = votes.get(key) || {
      value: item.value,
      count: 0,
      confidence: 0,
    };
    existing.count += 1;
    existing.confidence += item.confidence;
    votes.set(key, existing);
  }

  const ranked = [...votes.values()].sort(
    (a, b) => b.count - a.count || b.confidence - a.confidence
  );

  return { value: ranked[0]?.value || "", passes: results };
}

async function fileToCanvas(file) {
  if (file.type.startsWith("image/")) {
    const bitmap = await createImageBitmap(file);
    const maxSide = 3000;
    const scale = Math.max(
      1,
      Math.min(5, maxSide / Math.max(bitmap.width, bitmap.height))
    );

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d", { willReadFrequently: true })
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas;
  }

  if (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  ) {
    const pdf = await pdfjsLib.getDocument({
      data: await file.arrayBuffer(),
    }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 3.2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({
      canvasContext: canvas.getContext("2d", { willReadFrequently: true }),
      viewport,
    }).promise;
    return canvas;
  }

  throw new Error("รองรับเฉพาะ JPG, JPEG, PNG, WEBP และ PDF");
}

function showCanvas(canvas) {
  const preview = document.querySelector("#preview");
  preview.innerHTML = "";
  const clone = document.createElement("canvas");
  clone.width = canvas.width;
  clone.height = canvas.height;
  clone.getContext("2d").drawImage(canvas, 0, 0);
  preview.append(clone);
}

function setProgress(percent, text) {
  document.querySelector("#progressWrap").classList.remove("hidden");
  document.querySelector("#progressBar").style.width = `${percent}%`;
  document.querySelector("#progressPercent").textContent = `${Math.round(percent)}%`;
  document.querySelector("#progressText").textContent = text;
}

function status(fieldKey, ok) {
  const id =
    fieldKey === "containerNumber"
      ? "containerStatus"
      : fieldKey === "sealNo"
      ? "sealStatus"
      : "bookingStatus";
  const el = document.querySelector(`#${id}`);
  el.className = `status ${ok ? "ok" : "fail"}`;
  el.textContent = ok ? "อ่านได้" : "อ่านไม่พบ";
}

function drawCropCard(fieldKey, crop, debug, labelFound) {
  const grid = document.querySelector("#cropGrid");
  const card = document.createElement("div");
  card.className = "crop-card";

  const img = document.createElement("img");
  img.src = crop.toDataURL("image/png");

  card.innerHTML = `
    <h3>${FIELD_INFO[fieldKey].label}</h3>
    <p>${labelFound ? "พบหัวข้อแล้ว → อ่านค่าทางขวา" : "ใช้ fallback zone เพราะหัวข้อรอบแรกไม่ชัด"}</p>
  `;
  card.append(img);

  const p = document.createElement("p");
  p.textContent = debug.passes
    .map((x) => `${x.mode}: ${x.raw.trim() || "(ว่าง)"}`)
    .join(" | ");
  card.append(p);
  grid.append(card);
}

async function readEar() {
  if (!currentFile) {
    showError("กรุณาเลือกไฟล์ EAR ก่อน");
    return;
  }

  clearError();
  document.querySelector("#readBtn").disabled = true;
  document.querySelector("#cropGrid").innerHTML = "";
  document.querySelector("#debugSection").classList.add("hidden");

  try {
    setProgress(5, "กำลังขยายภาพ...");
    const canvas = await fileToCanvas(currentFile);
    showCanvas(canvas);

    setProgress(15, "OCR รอบแรก: กำลังหาตำแหน่งหัวข้อ...");
    const locator = await Tesseract.createWorker("eng", 1, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          setProgress(
            15 + (m.progress || 0) * 25,
            `หา CONTAINER / SEAL / BOOKING ${Math.round((m.progress || 0) * 100)}%`
          );
        }
      },
    });

    await locator.setParameters({
      tessedit_pageseg_mode: "6",
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
    });

    const firstPass = await locator.recognize(preprocess(canvas, "contrast"));
    await locator.terminate();

    document.querySelector("#rawText").textContent = firstPass.data.text || "";

    const lines = groupLines(firstPass.data.words || []);
    const labels = {};
    for (const [key, info] of Object.entries(FIELD_INFO)) {
      labels[key] = findLabel(lines, info.aliases);
    }

    setProgress(45, "กำลัง Crop ช่องค่าของทั้ง 3 หัวข้อ...");

    const valueWorker = await Tesseract.createWorker("eng", 1, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          setProgress(
            45 + (m.progress || 0) * 45,
            `OCR เฉพาะรหัส ${Math.round((m.progress || 0) * 100)}%`
          );
        }
      },
    });

    const values = {};
    let step = 0;

    for (const key of ["containerNumber", "sealNo", "booking"]) {
      step += 1;
      const hit = labels[key];
      const crop = hit
        ? cropRelativeToLabel(canvas, hit, key)
        : fallbackCrop(canvas, key);

      const debug = await ocrSmallCrop(valueWorker, crop, key);
      values[key] = debug.value;

      drawCropCard(key, crop, debug, Boolean(hit));
      setProgress(50 + step * 14, `อ่าน ${FIELD_INFO[key].label} เสร็จ`);
    }

    await valueWorker.terminate();

    document.querySelector("#containerNumber").value = values.containerNumber;
    document.querySelector("#sealNo").value = values.sealNo;
    document.querySelector("#booking").value = values.booking;

    status("containerNumber", Boolean(values.containerNumber));
    status("sealNo", Boolean(values.sealNo));
    status("booking", Boolean(values.booking));

    const found = Object.values(values).filter(Boolean).length;
    document.querySelector("#summary").innerHTML =
      found === 3
        ? `<strong>อ่านครบ 3/3 ค่า</strong><br>ขั้นต่อไปให้ทดสอบกับ EAR หลายรูปเพื่อวัดความแม่นยำ`
        : `<strong>อ่านได้ ${found}/3 ค่า</strong><br>เปิด “กรอบที่ OCR อ่านจริง” ด้านล่างเพื่อดูว่าปัญหาเกิดจากตำแหน่ง Crop หรือความคมชัด`;

    document.querySelector("#debugSection").classList.remove("hidden");
    setProgress(100, "เสร็จแล้ว");
  } catch (error) {
    console.error(error);
    showError(`เกิดข้อผิดพลาด: ${error?.message || error}`);
  } finally {
    document.querySelector("#readBtn").disabled = false;
  }
}

function showError(message) {
  const box = document.querySelector("#errorBox");
  box.textContent = message;
  box.classList.remove("hidden");
}

function clearError() {
  document.querySelector("#errorBox").classList.add("hidden");
}

function reset() {
  currentFile = null;
  document.querySelector("#fileInput").value = "";
  document.querySelector("#fileName").textContent = "ยังไม่ได้เลือกไฟล์";
  document.querySelector("#preview").innerHTML = "ตัวอย่างเอกสารจะแสดงที่นี่";
  document.querySelector("#containerNumber").value = "";
  document.querySelector("#sealNo").value = "";
  document.querySelector("#booking").value = "";
  for (const id of ["containerStatus", "sealStatus", "bookingStatus"]) {
    const el = document.querySelector(`#${id}`);
    el.className = "status waiting";
    el.textContent = "รออ่าน";
  }
  document.querySelector("#summary").textContent =
    "เลือกไฟล์ EAR แล้วกด “เริ่มอ่าน 3 ข้อมูล”";
  document.querySelector("#progressWrap").classList.add("hidden");
  document.querySelector("#debugSection").classList.add("hidden");
  clearError();
}

document.querySelector("#fileInput").addEventListener("change", (e) => {
  currentFile = e.target.files?.[0] || null;
  document.querySelector("#fileName").textContent =
    currentFile?.name || "ยังไม่ได้เลือกไฟล์";
});

document.querySelector("#readBtn").addEventListener("click", readEar);
document.querySelector("#resetBtn").addEventListener("click", reset);
