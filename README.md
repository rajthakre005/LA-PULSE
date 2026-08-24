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
python data_generator.py
python train.py
```

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
