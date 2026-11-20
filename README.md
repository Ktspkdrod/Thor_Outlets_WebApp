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
```
## วิธีเปิดใช้งาน

1. **เข้าใช้งานผ่านหน้าเว็บออนไลน์ (แนะนำ)**
   * เปิดลิงก์ **[https://thoroutlet.vercel.app](https://thoroutlet.vercel.app)** บนเบราว์เซอร์ (Chrome / Edge / Safari) เพื่อใช้งานได้ทันทีโดยไม่ต้องติดตั้งโปรแกรม

2. **การรันบนเครื่อง (Local Development)**
   * ดาวน์โหลดหรือโคลนโปรเจกต์ออกมาเป็นโฟลเดอร์ `thor_outlet_web`
   * เปิด Terminal ในโฟลเดอร์โปรเจกต์ แล้วรันคำสั่ง `npm install` เพื่อติดตั้งแพ็กเกจ
   * คัดลอกไฟล์ `.env.example` เปลี่ยนชื่อเป็น `.env.local` และใส่ค่าเชื่อมต่อให้ครบถ้วน
   * รันคำสั่ง `npm run dev` แล้วเปิดลิงก์ `http://localhost:5173` บนเบราว์เซอร์

3. **การเริ่มต้นควบคุมอุปกรณ์**
   * เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน (หรือกด **"สร้างบัญชี"** สำหรับผู้ใช้งานใหม่)
   * เสียบปลั๊ก **Thor Outlet** และเชื่อมต่อ Wi-Fi เมื่ออุปกรณ์ออนไลน์ สถานะบนหน้าเว็บจะเปลี่ยนเป็นจุดสีเขียวพร้อมแสดงค่าวัตต์ ชนิดเครื่องใช้ไฟฟ้า และปุ่มควบคุม **ON/OFF** ทันที
