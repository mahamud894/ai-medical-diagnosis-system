# AI Based Medical Diagnosis System (Student Project)

React + Node.js/Express + MongoDB Atlas দিয়ে তৈরি একটি educational web app। Patient profile রাখা যায়, একটি trained **Naive Bayes machine-learning model** দিয়ে symptom থেকে সম্ভাব্য ৩টি condition-এর ranking দেখা যায়, আর medical report (PDF/JPG/PNG) সংরক্ষণ করা যায়।

> **Medical safety:** Model-টি একটি ছোট public dataset-এ train করা, clinically validated নয়, এবং কোনো রোগ নির্ণয় বা চিকিৎসা নির্দেশ করে না। Score শুধু dataset-এর ৪১টা condition-এর মধ্যে relative — এটা medical probability না। Emergency symptom (chest pain, শ্বাসকষ্ট ইত্যাদি) থাকলে app আলাদা warning দেখায়।

## Features
- Register/login (bcrypt password hash + JWT), session expire হলে auto logout
- Patient profile: নাম, বয়স, gender, notes — add / edit / delete / search
- **AI symptom checker:** ১৩১টা symptom থেকে search করে বেছে নেওয়া, common symptom shortcut, top-3 condition + score bar + matched symptoms + description, emergency warning
- Diagnosis history: patient অনুযায়ী filter, expand করে details, delete
- Medical report upload (MongoDB-তে store হয়, তাই server restart-এও হারায় না), view, delete
- Security: helmet (CSP সহ security headers), rate limiting, file content check (magic bytes), owner-only data access
- Responsive design: desktop sidebar, mobile-এ bottom tab bar
- Automated tests (`npm test`)

## 1. Requirements
- Node.js LTS (20+)
- VS Code
- MongoDB Atlas account (অথবা local MongoDB)

## 2. Local setup
1. Project folder VS Code-এ open করো।
2. Backend:
   ```powershell
   cd backend
   npm install
   Copy-Item .env.example .env
   ```
3. `backend/.env`-এ `MONGODB_URI` আর `JWT_SECRET` বসাও।
   - Atlas: `mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/medical_diagnosis?retryWrites=true&w=majority`
   - Local: `mongodb://127.0.0.1:27017/medical_diagnosis`
   - Secret বানাতে: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   - Password-এ `@ : / ? # %` থাকলে URL-encode করতে হবে। Password কাউকে share করো না।
4. `npm run dev` → `http://localhost:5000/api/health`
5. আরেকটা terminal:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
6. `http://localhost:5173` খোলো। Frontend `/api` request Vite proxy দিয়ে backend-এ পাঠায়।

## 3. AI model (viva-র জন্য গুরুত্বপূর্ণ)
| বিষয় | তথ্য |
|---|---|
| Algorithm | Multinomial Naive Bayes, Laplace smoothing (α = 1) |
| Dataset | Kaggle "Disease Prediction Using Machine Learning" — 4,920 rows, 41 conditions, 132 symptom columns (`backend/ml/data/SOURCE.md`) |
| Training | `backend/ml/train.js` (pure JavaScript, কোনো Python লাগে না) → `backend/ml/model.json` |
| Prediction | `backend/ml/predictor.js` — symptom/synonym বোঝে, top-3 ranking, red-flag symptom-এ urgent warning |
| Accuracy (held-out 20%) | ২টা symptom: top-1 ৮২%, top-3 ৯৫.৮% · ৩টা symptom: top-1 ৯৪.১%, top-3 ৯৯% |

কীভাবে কাজ করে: প্রতিটা condition *d*-এর জন্য score = log P(d) + Σ log P(symptom | d)। তারপর softmax দিয়ে ৪১টা condition-এর মধ্যে relative % বানানো হয়।

Limitations (report-এ লিখবে): dataset ছোট ও খুব পরিষ্কার, তাই বাস্তবে accuracy অনেক কম হবে; মাত্র ৪১টা condition; বয়স/gender/সময়কাল/test result ব্যবহার হয় না।

Model আবার train করতে: `cd backend` → `npm run train`

## 4. Tests
```powershell
cd backend
npm test
```
Predictor (accuracy, synonym, urgent flag) আর API (auth guard, validation, security headers) — database ছাড়াই চলে।

## 5. API summary
Protected route-এ `Authorization: Bearer <JWT_TOKEN>` লাগে।
- `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me`
- `GET/POST /api/patients` · `GET/PUT/DELETE /api/patients/:id`
- `GET /api/diagnosis/symptoms` (model-এর symptom list + model info)
- `POST /api/diagnosis/predict` `{ patientId, symptoms: [] }`
- `GET /api/diagnosis/history?patientId=` · `GET/DELETE /api/diagnosis/:id`
- `POST /api/reports/upload` (multipart: `patientId`, `report`) · `GET /api/reports`
- `GET /api/reports/:id/file` · `DELETE /api/reports/:id`
- `GET /api/health`

## 6. Project structure
```text
backend/
  config/        env check, MongoDB connection
  controllers/   auth, patients, diagnosis, reports
  middleware/    JWT auth, error handler
  ml/            train.js, predictor.js, model.json, data/
  models/        User, Patient, Diagnosis, Report
  routes/
  test/          node:test tests
  server.js
frontend/src/
  App.jsx        session, data, navigation
  api.js         fetch helper
  utils.js
  components/ui.jsx
  pages/         AuthPage, Overview, Patients, SymptomCheck, History, Reports
  styles.css
render.yaml      Render deploy config
```

## 7. Live deploy (Render)
GitHub-এ push করলেই Render নিজে থেকে নতুন version deploy করে।
- Render Environment: `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, `NODE_VERSION=20`
- Build: `npm run build` · Start: `npm start`
- Atlas → Network Access-এ `0.0.0.0/0` লাগবে (Render-এর IP fixed না)
- Free plan ১৫ মিনিট idle থাকলে ঘুমিয়ে যায় — demo-র আগে একবার site খুলে রাখো।

## Troubleshooting
| সমস্যা | সমাধান |
|---|---|
| `Backend cannot start — fix backend/.env` | `.env` নেই বা placeholder বদলানো হয়নি |
| `querySrv ENOTFOUND` | Cluster address ভুল / internet নেই |
| `bad auth` / `Authentication failed` | Atlas user/password ভুল |
| `Server selection timed out` / IP whitelist | Atlas Network Access-এ IP (বা `0.0.0.0/0`) add করো |
| `ECONNREFUSED 127.0.0.1:27017` | Local MongoDB service চালু করো |
| "Cannot reach the backend server" | Backend চালু আছে কিনা দেখো |
| পুরনো report "no longer available" | আগের version disk-এ রাখত — report আবার upload করো |
