# AI Based Medical Diagnosis System (Student Project)

এই project-টি React + Node.js/Express + MongoDB Atlas দিয়ে তৈরি starter implementation। এটি তোমাদের Backend Progress Report-এর stack, folder structure এবং API ধারণা অনুসরণ করে।

## Features
- User registration/login (bcrypt password hash + JWT)
- Patient profile create/list/update/delete (নিজের patient records)
- Symptom-based educational demo prediction এবং diagnosis history
- Medical report file upload/list (PDF/JPG/PNG; private local uploads folder)
- Basic role field (`patient` / `admin`)
- Responsive React dashboard

> **Medical safety:** বর্তমান prediction engine হলো demo rule-based prototype; এটি clinically validated নয় এবং কোনো রোগ নির্ণয়/চিকিৎসা নির্দেশ করে না। বাস্তব চিকিৎসা সিদ্ধান্তের জন্য qualified clinician দরকার। রিপোর্ট upload করলে এই starter-এ OCR করা হয় না। Production-এ deploy করার আগে security, privacy, access control, audit, validation এবং clinical validation review জরুরি।

## 1. Requirements
- Node.js LTS (Node 20+ recommended)
- VS Code
- MongoDB Atlas account OR local MongoDB

## 2. Setup
1. ZIP extract করে `ai-medical-diagnosis-system` folder VS Code-এ open করো।
2. Terminal-এ backend চালাও:
   ```powershell
   cd backend
   npm install
   Copy-Item .env.example .env
   ```
3. `backend/.env` খুলে `MONGODB_URI`-তে তোমার MongoDB connection string বসাও (`YOUR_DB_USER`, `YOUR_DB_PASSWORD`, `YOUR_CLUSTER` — তিনটাই বদলাতে হবে)। Local MongoDB হলে: `MONGODB_URI=mongodb://127.0.0.1:27017/medical_diagnosis`।
   `JWT_SECRET`-এ লম্বা random secret দাও। বানাতে: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   Atlas হলে Network Access-এ নিজের IP allow করো এবং Database Access user তৈরি করো। Password-এ `@ : / ? # %` থাকলে URL-encode করতে হবে। Password/URI কাউকে share করো না।
4. Backend চালাও:
   ```powershell
   npm run dev
   ```
   Test: `http://localhost:5000/api/health`
5. আরেকটি VS Code terminal:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
6. Vite terminal-এ দেখানো local URL খুলবে (সাধারণত `http://localhost:5173`)। Frontend `/api` request গুলো Vite proxy দিয়ে backend-এ পাঠায়, তাই CORS সমস্যা হয় না। Backend-এর PORT বদলালে `frontend/.env`-এ `BACKEND_URL=http://localhost:<PORT>` দাও।

## Troubleshooting
| সমস্যা | সমাধান |
|---|---|
| `Backend cannot start — fix backend/.env` | `.env` file নেই বা placeholder বদলানো হয়নি। Message-এ যা বলা আছে সেটা ঠিক করো। |
| `querySrv ENOTFOUND` | Cluster address ভুল / internet নেই। |
| `bad auth` / `Authentication failed` | Atlas user/password ভুল। |
| `Server selection timed out` | Atlas Network Access-এ নিজের IP add করো। |
| `ECONNREFUSED 127.0.0.1:27017` | Local MongoDB service চালু করো। |
| Browser-এ "Cannot reach the backend server" | Backend terminal চালু আছে কিনা দেখো (`npm run dev`)। |
| `Port 5000 is already in use` | আগের server বন্ধ করো বা PORT বদলাও। |

## এই version-এ যা fix করা হয়েছে
- `.env` না থাকলে/placeholder থাকলে পরিষ্কার error message; MongoDB connection error-এর কারণ ও সমাধান দেখায়; `.env` সবসময় `backend/` folder থেকে load হয়।
- `JWT_SECRET` না থাকলে register/login "Internal server error" দিত — এখন development-এ temporary secret দিয়ে চলে (warning সহ)।
- CORS: Vite proxy যোগ হয়েছে + development-এ যেকোনো localhost port allow — "Failed to fetch" সমস্যা ঠিক।
- Logout করে অন্য account-এ login করলে আগের user-এর patient selected থাকত ও symptom check fail করত — ঠিক করা হয়েছে।
- Token expire হলে dashboard আটকে থাকত — এখন automatically login page-এ ফিরে যায়।
- README-তে থাকা `GET /api/patients/:id` route আসলে ছিল না — যোগ করা হয়েছে।
- Patient delete করলে তার diagnosis history ও report file-ও delete হয় (আগে orphan থেকে যেত)।
- ভুল patient ID দিয়ে upload করলে file disk-এ থেকে যেত — এখন মুছে যায়; file extension ও MIME type দুটোই check হয়।
- Demo predictor-এ খুব ছোট/খালি symptom সব pattern-এর সাথে match করত — ঠিক করা হয়েছে; explanation-এ matched symptom দেখায়।
- UI: patient ও report delete, report view, custom symptom যোগ, history-তে patient column, double-submit বন্ধ, same file আবার select করা যায়, 5 MB-এর বড় file আগেই আটকায়।

## 3. API summary
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token)
- `GET/POST /api/patients`
- `GET/PUT/DELETE /api/patients/:id`
- `POST /api/diagnosis/predict`
- `GET /api/diagnosis/history`
- `GET /api/diagnosis/:id`
- `POST /api/reports/upload` (multipart fields: `patientId`, `report`)
- `GET /api/reports`
- `GET /api/reports/:id/file` (নিজের report view/download)
- `DELETE /api/reports/:id`
- `GET /api/health`

Protected requests use `Authorization: Bearer <JWT_TOKEN>`.

## 4. Current AI status
The prediction route currently uses a clearly labeled symptom-matching demo, not the `.sav` models inside the supplied Python/Streamlit ZIP. Those models need their exact input feature order and preprocessing to be verified, then can be served safely through a separate Python API. Do not assume a confidence score is medical certainty.

## 5. Project structure
```text
backend/
  config/db.js
  config/env.js
  controllers/
  middleware/
  models/
  routes/
  uploads/
  utils/demoPredictor.js
  server.js
frontend/
  src/App.jsx
  src/api.js
  src/main.jsx
  src/styles.css
```

## 6. Live deploy (Render — free)
এই repo-তে `render.yaml` আছে, তাই একটা web service-ই API + website দুটো চালায়।
1. https://render.com-এ GitHub দিয়ে sign up করো।
2. **New → Blueprint** → এই repo select করো → **Apply**।
3. `MONGODB_URI` চাইলে তোমার Atlas connection string দাও (`.../medical_diagnosis?retryWrites=true&w=majority`)। `JWT_SECRET` Render নিজেই বানাবে।
4. Atlas → **Network Access**-এ `0.0.0.0/0` allow থাকতে হবে (Render-এর IP fixed না)।
5. Deploy শেষ হলে `https://<service-name>.onrender.com` link-এ site চলবে।

Notes: Free plan-এ ১৫ মিনিট idle থাকলে service ঘুমিয়ে যায়, প্রথম request-এ ~৩০-৫০ সেকেন্ড লাগে। Free plan-এর disk স্থায়ী না, তাই upload করা report file redeploy/restart-এর পর মুছে যেতে পারে (database record থাকবে)।

Local-এ production build test: root folder-এ `npm run build` তারপর `npm start` → `http://localhost:5000`।
