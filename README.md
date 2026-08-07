# EAR Vehicle Checker — Booking Refined V14

โฟกัสเฉพาะ BOOKING

เพิ่ม:
- Booking-specific prefix/digit zoning
- แก้ OCR ใน prefix: 2->Z, 0->O, 1->I, 6->G ฯลฯ
- แก้ OCR ใน numeric suffix: O->0, I/L->1, Z->2, G->6 ฯลฯ
- รองรับรูปแบบที่พบจริง เช่น SGZG06748700, SGZG07601300, SGZG06692500, BSGZC26001315
- ใช้ candidate จาก File 1 และ File 2 มาสร้าง booking consensus
- ถ้า consensus มีรูปแบบสมเหตุสมผล จะแสดง “ตรงกันหลังแก้ OCR”
- Container และ Seal logic จาก V13 คงเดิม

ใช้ calibration boxes เดิมได้
