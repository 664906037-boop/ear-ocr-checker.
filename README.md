# EAR Vehicle Checker V23 Production

## ความสามารถ
- Upload 2 ไฟล์: EAR และแบบฟอร์มควบคุมรถ
- รองรับ PDF/JPG/JPEG/PNG/WEBP
- ตรวจ 3 หัวข้อ:
  - CONTAINER NUMBER
  - SEAL NO
  - BOOKING
- OCR แบบ Label + Value Detection
- Container ตรวจ ISO 6346
- Booking/Seal มี pattern correction
- แสดง ตรงกัน / OCR ไม่ชัวร์ / ไม่ตรงกัน
- เมื่อผ่านทั้ง 3 หัวข้อ ปุ่ม Print จะเปิดใช้งาน
- Print ใช้ไฟล์ข้อมูล 2 ตัวจริง

## วิธีติดตั้ง
1. แตก ZIP
2. Upload 5 ไฟล์ขึ้น GitHub
3. Commit changes
4. Vercel > Import Project
5. Framework Preset = Other
6. Build Command = ว่าง
7. Output Directory = ว่าง
8. Install Command = ว่าง
9. Deploy

## ไฟล์
- index.html
- app.js
- styles.css
- vercel.json
- README.md
