<div align="center">

# 🩺 AI Medical Diagnosis System

**A full-stack web app that manages patient records and ranks possible conditions from symptoms using a trained Naive Bayes model.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Open%20App-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://ai-medical-diagnosis-system.onrender.com)

[![CI](https://github.com/mahamud894/ai-medical-diagnosis-system/actions/workflows/ci.yml/badge.svg)](https://github.com/mahamud894/ai-medical-diagnosis-system/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![ML](https://img.shields.io/badge/ML-Naive%20Bayes-FF6F00?logo=scikitlearn&logoColor=white)
![Tests](https://img.shields.io/badge/tests-14%20passing-brightgreen)

[Live Demo](https://ai-medical-diagnosis-system.onrender.com) · [Features](#-features) · [AI Model](#-the-ai-model) · [Getting Started](#-getting-started) · [API](#-api-reference) · [বাংলা গাইড](README_BN.md)

</div>

> [!WARNING]
> **Educational project — not a medical device.** The model is trained on a small public dataset and is not clinically validated. Its results are not a diagnosis. In an emergency, call your local emergency number (999 in Bangladesh).

> [!NOTE]
> The live demo runs on Render's free plan and sleeps after 15 minutes without traffic. The first visit can take 30–50 seconds to wake up.

---

## 📸 Screenshots

| Symptom checker with top-3 results | Dashboard |
|---|---|
| ![Symptom check](docs/screenshots/symptom-check.png) | ![Overview](docs/screenshots/overview.png) |

| Patient management | Mobile — history | Mobile — symptom check |
|---|---|---|
| ![Patients](docs/screenshots/patients.png) | <img src="docs/screenshots/mobile-history.png" width="260" alt="Mobile history"> | <img src="docs/screenshots/mobile-check.png" width="260" alt="Mobile symptom check"> |

## ✨ Features

- **🔐 Accounts** — Register and sign in with bcrypt-hashed passwords and JWT sessions. Expired sessions return to the sign-in page automatically.
- **👥 Patient profiles** — Add, edit, search and delete patients (name, age, gender, notes). Every record is private to the account that created it.
- **🧠 AI symptom checker** — Search 131 symptoms or tap common ones. The model returns the **top 3 possible conditions** with a score bar, the symptoms that matched, and a short description.
- **🚨 Red-flag warnings** — Symptoms such as chest pain, breathlessness or slurred speech trigger an emergency notice, whatever the model predicts.
- **🗂️ Diagnosis history** — Filter by patient, expand any check to see its full ranking, delete old records.
- **📄 Medical reports** — Upload PDF/JPG/PNG files (max 5 MB, drag and drop supported). Files are stored in MongoDB, so they survive server restarts, and only the owner can open them.
- **📱 Responsive UI** — Sidebar on desktop, bottom tab bar on phones.
- **🛡️ Security** — Helmet security headers with a Content Security Policy, rate limiting on login and sign-up, file-content (magic byte) checks, input validation and owner-only data access.

## 🧠 The AI Model

| | |
|---|---|
| **Algorithm** | Multinomial Naive Bayes with Laplace smoothing (α = 1), written in plain JavaScript |
| **Dataset** | [Disease Prediction Using Machine Learning](https://www.kaggle.com/datasets/kaushil268/disease-prediction-using-machine-learning) (Kaggle) — 4,920 rows · 41 conditions · 132 symptom columns |
| **Training script** | [`backend/ml/train.js`](backend/ml/train.js) → produces [`backend/ml/model.json`](backend/ml/model.json) |
| **Inference** | [`backend/ml/predictor.js`](backend/ml/predictor.js) — synonym matching, top-3 ranking, red-flag detection |

For each condition *d*, the model computes

```
score(d) = log P(d) + Σ log P(symptom | d)      for each symptom the user entered
```

and turns the scores into relative percentages with a softmax over the 41 conditions.

**Accuracy on a held-out 20% split** (the user enters only a few random symptoms of each case):

| Symptoms entered | Top-1 accuracy | Top-3 accuracy |
|:---:|:---:|:---:|
| 2 | 82.0% | 95.8% |
| 3 | 94.1% | 99.0% |
| 4 | 97.7% | 100% |

**Limitations:** the dataset is small and very regular, so real-world accuracy would be much lower. It covers only 41 conditions and ignores age, sex, duration, severity and test results. Scores are relative to those 41 conditions; they are not medical probabilities.

Retrain the model with `cd backend && npm run train`.

## 🏗️ Architecture

```mermaid
flowchart LR
    U[Browser<br/>React + Vite] -- "REST /api (JWT)" --> S[Express API<br/>Node.js]
    S --> A[Auth · Patients · Diagnosis · Reports]
    A --> M[(MongoDB Atlas)]
    A --> NB[Naive Bayes model<br/>ml/model.json]
    T[ml/train.js] -- trains on Kaggle CSV --> NB
```

In production a single Render web service serves the API and the built React app from the same origin.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 20 or newer (22 LTS recommended)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (free tier is fine) or a local MongoDB

### 1. Clone
```bash
git clone https://github.com/mahamud894/ai-medical-diagnosis-system.git
cd ai-medical-diagnosis-system
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```
Edit `backend/.env`:

| Variable | Description |
|---|---|
| `MONGODB_URI` | `mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/medical_diagnosis?retryWrites=true&w=majority` |
| `JWT_SECRET` | Long random string — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Session length, default `1d` |
| `CLIENT_ORIGIN` | Frontend URL(s), default `http://localhost:5173` |
| `MAX_UPLOAD_MB` | Report size limit, default `5` |

```bash
npm run dev                 # http://localhost:5000/api/health
```

### 3. Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```
The Vite dev server proxies `/api` to the backend, so no CORS setup is needed.

### Scripts

| Where | Command | What it does |
|---|---|---|
| `backend` | `npm run dev` | Start the API with auto-reload |
| `backend` | `npm test` | Run the test suite |
| `backend` | `npm run train` | Retrain the Naive Bayes model |
| `frontend` | `npm run dev` | Start the React dev server |
| root | `npm run build` | Install everything and build the frontend (used by Render) |
| root | `npm start` | Serve the API and built site on one port |

## 🧪 Testing

```bash
cd backend
npm test
```

14 tests using Node's built-in test runner cover the predictor (accuracy, synonyms, urgent flags, unknown symptoms) and the API (auth guard, validation, security headers, error handling). They need no database. GitHub Actions runs them, plus a frontend build, on every push.

## 📡 API Reference

Protected routes need the header `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Sign in, returns a JWT |
| `GET` | `/api/auth/me` | Current user |
| `GET` `POST` | `/api/patients` | List / create patients |
| `GET` `PUT` `DELETE` | `/api/patients/:id` | Read / update / delete a patient (deleting also removes their history and reports) |
| `GET` | `/api/diagnosis/symptoms` | Symptom vocabulary and model info |
| `POST` | `/api/diagnosis/predict` | `{ patientId, symptoms: [] }` → top-3 conditions |
| `GET` | `/api/diagnosis/history?patientId=` | Saved checks, optionally for one patient |
| `GET` `DELETE` | `/api/diagnosis/:id` | Read / delete one check |
| `POST` | `/api/reports/upload` | Multipart: `patientId`, `report` |
| `GET` | `/api/reports` | List reports |
| `GET` | `/api/reports/:id/file` | View or download a report |
| `DELETE` | `/api/reports/:id` | Delete a report |
| `GET` | `/api/health` | Health check |

## ☁️ Deployment (Render)

The repository includes a [`render.yaml`](render.yaml) blueprint.

1. On [Render](https://render.com), choose **New → Blueprint** and select this repository.
2. Set `MONGODB_URI` when asked (Render generates `JWT_SECRET`).
3. In MongoDB Atlas → **Network Access**, allow `0.0.0.0/0`, because Render's outgoing IPs are not fixed.
4. Every push to `main` redeploys automatically.

## 📁 Project Structure

```text
ai-medical-diagnosis-system/
├── backend/
│   ├── config/          # env checks, MongoDB connection
│   ├── controllers/     # auth, patients, diagnosis, reports
│   ├── middleware/      # JWT auth, error handler
│   ├── ml/              # train.js, predictor.js, model.json, data/
│   ├── models/          # User, Patient, Diagnosis, Report (Mongoose)
│   ├── routes/
│   ├── test/            # node:test suites
│   └── server.js
├── frontend/
│   └── src/
│       ├── pages/       # AuthPage, Overview, Patients, SymptomCheck, History, Reports
│       ├── components/  # shared UI pieces
│       ├── App.jsx      # session, data loading, navigation
│       ├── api.js       # fetch wrapper
│       └── styles.css
├── docs/screenshots/
├── .github/workflows/ci.yml
└── render.yaml
```

## 🙏 Acknowledgements

- Dataset: [Disease Prediction Using Machine Learning](https://www.kaggle.com/datasets/kaushil268/disease-prediction-using-machine-learning) by kaushil268, with condition descriptions from [Disease Symptom Prediction](https://www.kaggle.com/datasets/itachi9604/disease-symptom-description-dataset) by itachi9604 (both on Kaggle). See [`backend/ml/data/SOURCE.md`](backend/ml/data/SOURCE.md).

## 📄 License

The source code is released under the [MIT License](LICENSE). The dataset files in `backend/ml/data/` belong to their original authors and are subject to their Kaggle terms.

## 👤 Author

**Mahamud Hassan** — [GitHub](https://github.com/mahamud894)
