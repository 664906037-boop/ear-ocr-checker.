# EAR Vehicle Checker — Smart Scan V19

V19 ต่อจาก Production V18 โดยไม่เปลี่ยน OCR logic ที่อ่านได้ดีแล้ว

## สิ่งใหม่: Smart Search ROI

เดิม:
- Calibration box = กรอบตายตัว
- ถ้ารูปคลาดตำแหน่ง ค่าอาจหลุดกรอบ

V19:
- Calibration box = "ศูนย์กลางของบริเวณค้นหา"
- อ่านกรอบเดิมก่อนด้วย OCR pipeline เต็ม
- ถ้าค่าที่อ่านได้แข็งแรง ระบบหยุดทันที
- ถ้ายังไม่มั่นใจ ระบบสแกนเพิ่ม:
  - ซ้าย
  - ขวา
  - บน
  - ล่าง
  - ขยายกรอบ
  - ขยายไปทางซ้าย/ขวา
- รวม candidate จากหลายตำแหน่ง
- ให้คะแนนตำแหน่งใกล้กรอบเดิมมากกว่า
- Container ยังใช้ ISO 6346
- Seal / Booking ยังใช้ consensus / reference correction จาก V15/V18

## Workflow

ครั้งแรก:
1. Upload EAR และตั้งบริเวณ Container / Seal / Booking
2. Upload Form 2 และตั้งบริเวณถ้าจำเป็น
3. Save

ครั้งถัดไป:
1. Upload 2 ไฟล์
2. กดตรวจ
3. ระบบสแกนบริเวณใกล้ตำแหน่งที่จำไว้เอง
4. ถ้าทั้ง 3 ผ่าน ปุ่ม Print เปิดใช้งาน
5. Print พิมพ์ข้อมูล 2 ตัวจริง

## ข้อจำกัด

Smart Scan ช่วยกรณี "คลาดเล็กน้อยถึงปานกลาง"
ถ้าเอกสารถูก crop จนตำแหน่งเปลี่ยนทั้งหน้า หรือหมุน/เอียงรุนแรงมาก ควรถ่ายใหม่หรือตั้ง Calibration ใหม่

## Deploy

อัปโหลด 5 ไฟล์ขึ้น GitHub:
- index.html
- app.js
- styles.css
- vercel.json
- README.md

Commit แล้วรอ Vercel Deploy
