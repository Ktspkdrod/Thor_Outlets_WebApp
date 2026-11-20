# Thor Outlet (Edge AI + IoT Energy Management) — Web Application

เว็บแอปพลิเคชันสำหรับตรวจสอบการใช้พลังงานไฟฟ้าแบบเรียลไทม์ จำแนกชนิดเครื่องใช้ไฟฟ้าด้วย Edge AI (Edge Impulse) และควบคุมการเปิด-ปิดเต้ารับอัจฉริยะผ่านระบบคลาวด์

---

## โครงสร้างโฟลเดอร์ (Folder Structure)

```text
thor_outlet_web/
├── index.html                        # โครงสร้างหน้าเว็บหลัก
├── README.md                         # คู่มือการใช้งานและคำอธิบายแต่ละไฟล์
├── package.json                      # รายการ Dependencies และคำสั่งรันโปรเจกต์
├── .env.example                      # ตัวอย่างการตั้งค่าตัวแปรเชื่อมต่อระบบ
├── docs/
│   └── FIREBASE_DATA_CONTRACT.md     # ข้อกำหนดโครงสร้างข้อมูลของระบบ
├── public/
│   └── thor-logo.png                 # โลโก้หลักของ Thor Outlet
└── src/
    ├── main.tsx                      # จุดเริ่มต้นการทำงานของแอป React
    ├── App.tsx                       # ตัวควบคุมหลัก (Login, Dashboard, Devices, Alerts, Account)
    ├── App.css                       # สไตล์เพิ่มเติมของหน้าแอป
    ├── index.css                     # ธีมหลัก การจัดวาง Layout และ Responsive
    ├── firebase.ts                   # ระบบยืนยันตัวตน (Auth) และฐานข้อมูลผู้ใช้ (Firestore)
    ├── thingsboard.ts                # ระบบดึงค่าพลังงาน ผลลัพธ์ AI และส่งคำสั่งเปิด-ปิด Relay
    ├── types.ts                      # โครงสร้างข้อมูล (TypeScript Types)
    ├── i18n/
    │   └── translations.ts           # ระบบสลับภาษา ไทย / อังกฤษ
    └── components/
        ├── AccountSettings.tsx       # หน้าจัดการบัญชี เปลี่ยนรูปโปรไฟล์ และเปลี่ยนรหัสผ่าน
        ├── DeviceList.tsx            # การ์ดแสดงสถานะปลั๊ก ค่าไฟ ผล AI และปุ่มควบคุม ON/OFF
        ├── EmptyState.tsx            # หน้าจอแสดงผลเมื่อยังไม่มีข้อมูล
        ├── LanguagePicker.tsx        # ปุ่มเลือกภาษา ไทย / อังกฤษ
        └── index.ts                  # ตัวรวบรวม Component หลัก
