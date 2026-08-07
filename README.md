# EAR Vehicle Checker — Validated OCR V11

สิ่งที่เพิ่มจาก V10:
- Container ตรวจ ISO 6346 check digit
- Container ที่ OCR อ่านแล้วไม่ผ่าน ISO จะไม่ถูกฟันธงว่าเอกสารไม่ตรง
- ลอง candidate correction แบบจำกัด แล้วเลือกเฉพาะ candidate ที่ผ่าน ISO
- ใช้ confidence threshold สำหรับ Seal / Booking
- ถ้า OCR confidence ต่ำหรือค่าคล้ายกันมาก จะขึ้น "OCR ไม่ชัวร์"
- "ไม่ตรงกัน" จะใช้เฉพาะกรณีที่หลักฐาน OCR แตกต่างชัดและ confidence พอ

หลักการผลลัพธ์:
- ตรงกัน = OCR เห็นตรงกันและผ่าน validation ที่เกี่ยวข้อง
- OCR ไม่ชัวร์ = ต้องตรวจด้วยตา ไม่ถือว่าเอกสารผิด
- ไม่ตรงกัน = OCR มีหลักฐานชัดว่าค่าต่างกัน

Calibration boxes จาก V9/V10 ใช้ต่อได้
