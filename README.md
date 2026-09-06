# LA-PULSE — Land Acquisition Predictive Early-Warning & Intervention Engine

> **SIH26017 — Predictive Analytics System for Early Detection of Land Acquisition Delays**
> Ministry of Rural Development | Software Category

## 🎯 Core Innovation

**Instead of asking why a land acquisition project was delayed, LA-PULSE predicts the delay early, identifies the exact bottleneck causing it, shows where the problem is occurring, recommends the best intervention, and simulates how much delay could be avoided.**

### Flow: PREDICT → EXPLAIN → LOCALIZE → SIMULATE → INTERVENE → LEARN

## ⚠️ Prototype Notice

> **Prototype demonstration using synthetic operational data.**
> This system does not use real government data. All project data, coordinates, and identifiers are synthetically generated for demonstration purposes.

## 🏗️ Architecture

```
Frontend:     React + TypeScript + Vite
Visualization: Apache ECharts + Recharts
GIS:          Leaflet + OpenStreetMap
Backend:      FastAPI + Python
ML:           XGBoost + Scikit-learn + SHAP
Database:     PostgreSQL + PostGIS
Auth:         JWT + RBAC
Deployment:   Docker Compose
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Docker Deployment
```bash
docker-compose up --build
```

### Local Development

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**ML Pipeline:**
```bash
cd ml
pip install -r requirements.txt
python data_generator.py        # Generate training data (817 projects)
python generate_test_data.py    # Generate test data (200 projects)
python train.py                 # Train models on training data only
python evaluate.py              # Evaluate on unseen test data
python data_integrity_check.py  # Validate train/test separation
```

## 📊 Dataset

The ML pipeline uses a strict train/test split to ensure proper model evaluation:

- **Training Data:** 817 projects (training_data.csv) - Used ONLY for training
- **Test Data:** 200 projects (test_data.csv) - Used ONLY for final evaluation
- **Total:** 1,017 projects

### Train/Test Separation

- Training data uses project IDs starting with `LA-*`
- Test data uses project IDs starting with `TEST-*` to clearly distinguish
- No overlap between training and test project IDs
- Models are trained ONLY on training_data.csv
- Evaluation is performed ONLY on test_data.csv
- This prevents data leakage and ensures realistic performance estimates

### Evaluation Metrics

**Classification (Delay Prediction):**
- Accuracy, Precision, Recall, F1-score, ROC-AUC, Confusion Matrix

**Regression (Delay Days & Risk Score):**
- MAE (Mean Absolute Error), RMSE (Root Mean Square Error), R²

### Live Prediction

The system provides runtime prediction for new projects via:
- `POST /predict` - Get risk score, delay probability, and expected delay
- `POST /predict/explain` - Get predictions with SHAP feature explanations

## 📁 Project Structure

```
LA-PULSE/
├── frontend/          # React + TypeScript frontend
├── backend/           # FastAPI backend
├── ml/                # ML pipeline (training, prediction, SHAP)
├── data/              # Generated synthetic datasets
├── database/          # PostgreSQL schema & migrations
├── docs/              # Architecture diagrams & documentation
├── docker/            # Dockerfiles
├── docker-compose.yml
└── README.md
```

## 🔑 Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| National Admin | admin | lapulse2026 |
| State Admin | state_admin | lapulse2026 |
| District Officer | dist_officer | lapulse2026 |
| LAO | lao_officer | lapulse2026 |

## 📊 Key Features

1. **Land Acquisition Digital Twin** — Complete digital representation of every acquisition project
2. **Predictive Engine** — ML-powered delay probability, expected delay days, stage-level risk
3. **Bottleneck Dependency Graph** — Identifies Critical Delay Nodes
4. **Intervention Engine** — Automated recommendations with what-if simulation
5. **Geospatial Risk Engine** — Interactive map with drill-down to parcel level
6. **Early Warning System** — Proactive alerts before deadlines are missed
7. **Delay Propagation Engine** — Shows how delays cascade through stages
8. **Project War Room** — Comprehensive single-project command center
9. **Continuous Learning** — Feedback loop for model improvement

## License

Developed for Smart India Hackathon 2026.
