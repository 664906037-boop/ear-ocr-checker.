# EAR Vehicle Checker — Precision Learned Scan V21

เป้าหมาย: เพิ่มความแม่นยำจาก V20 โดยยังรักษาความเร็ว

## ระบบจำ 2 อย่าง
1. ตำแหน่งโดยประมาณของ Container / Seal / Booking
2. รูปแบบข้อมูลที่ถูกต้องของแต่ละ field

## Pipeline

Stage 1 — Fast Scan
อ่านตำแหน่งที่จำไว้เพียง 3 pass
ถ้าค่าผ่าน pattern + confidence -> ใช้ทันที

Stage 2 — Nearby Search
ถ้าค่ายังไม่แข็งแรง -> ค้นซ้าย ขวา บน ล่าง

Stage 3 — Precision Scan
เฉพาะ field ที่ยังไม่แน่ใจ:
- 11 ตำแหน่งย่อยรอบ ROI
- sharpen / contrast
- threshold 155 / 170 / 185 / 200
- OCR แบบ single-line
- รวม candidate และโหวต

## Validation

Container:
- 4 letters + 7 digits
- ISO 6346 check digit

Seal:
- ให้คะแนนสูงกับ pattern เช่น THBP49647
- prefix ตัวอักษร + ตัวเลข

Booking:
- 4-5 letters + 7-9 digits
- ให้คะแนนสูงกับ pattern เช่น SGZG06748700 / BSGZC26001315
- reference-aware correction

## Reference
File 2 ที่อ่านได้ชัดกว่าจะถูกใช้ช่วย re-rank candidate ของ EAR
แต่ระบบจะไม่บังคับค่าให้ตรงหาก evidence ไม่เพียงพอ

## Print
คง workflow จาก Production V18:
เมื่อทั้ง 3 ค่า PASS ปุ่มพิมพ์ข้อมูล 2 จะใช้งานได้
