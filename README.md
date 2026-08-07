# EAR Vehicle Checker — Production V18

เวอร์ชันนี้ยึด OCR Engine จาก V15 ซึ่งเป็นเวอร์ชันที่ผู้ใช้ทดสอบแล้วอ่านได้ดีที่สุด

## Workflow จริง

### ตั้งค่าครั้งแรก
1. Upload ใบ EAR
2. กดตั้งค่ากรอบข้อมูล 1
3. ลากเฉพาะค่าจริง:
   - CONTAINER NUMBER
   - SEAL NO
   - BOOKING
4. Save
5. Upload แบบฟอร์มควบคุมรถ
6. ถ้าเป็น PDF ที่มี text layer ระบบอ่านค่าโดยตรงและไม่ต้องตั้งกรอบข้อมูล 2
7. ถ้าเป็นภาพหรือ PDF scan ให้ตั้งกรอบข้อมูล 2 ครั้งเดียว
8. ระบบจำ Calibration ใน Browser/Production domain

### การใช้งานประจำ
1. Upload ข้อมูล 1
2. Upload ข้อมูล 2
3. กด "เริ่มอ่านและเปรียบเทียบ"
4. ระบบตรวจ 3 ค่า
5. ถ้าผ่านทั้ง 3 ค่า ปุ่ม "พิมพ์แบบฟอร์มข้อมูล 2" จะเปิดใช้งาน
6. กด Print แล้วระบบพิมพ์ภาพของข้อมูล 2 ตัวจริง

## ความแม่น
- EAR ใช้ ROI + sharpen + multi-threshold + OCR voting จาก V15
- Container ใช้ ISO 6346 validation
- Seal ใช้ OCR consensus
- Booking ใช้ reference-aware correction
- File 2 PDF ใช้ native PDF text ก่อน OCR ถ้ามี

## Print
ปุ่ม Print แสดงตลอด แต่ disabled จนกว่าผลตรวจทั้ง 3 หัวข้อจะผ่าน
เมื่อผ่าน ระบบจะพิมพ์ File 2 ที่อัปโหลด ไม่สร้างฟอร์มใหม่

## หมายเหตุ
Calibration เก็บใน localStorage ตาม domain
ควรใช้งานผ่าน Production URL เดิมของ Vercel เพื่อไม่ต้องตั้งกรอบใหม่
