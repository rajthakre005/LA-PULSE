"""LA-PULSE FastAPI Backend — Main Application"""
import json, os, pickle, math
from datetime import datetime, timedelta
from typing import Optional, List
from pathlib import Path

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError
import hashlib

# ── Config ──
SECRET_KEY = os.getenv("SECRET_KEY", "lapulse-secret-key-change-in-production")
ALGORITHM = "HS256"
TOKEN_EXPIRE = 480
DATA_DIR = Path(__file__).parent.parent / "data"

app = FastAPI(title="LA-PULSE API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

security = HTTPBearer(auto_error=False)

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def verify_pw(pw: str, hashed: str) -> bool:
    return hash_pw(pw) == hashed

# ── In-memory data store (loaded from JSON) ──
PROJECTS: list = []
ALERTS: list = []
AUDIT_LOG: list = []
MODEL_META: dict = {}

USERS = {
    "admin": {"password": hash_pw("lapulse2026"), "role": "national_admin", "name": "National Administrator"},
    "state_admin": {"password": hash_pw("lapulse2026"), "role": "state_admin", "name": "State Administrator", "state": "Maharashtra"},
    "dist_officer": {"password": hash_pw("lapulse2026"), "role": "district_officer", "name": "District Officer", "state": "Maharashtra", "district": "Nashik"},
    "lao_officer": {"password": hash_pw("lapulse2026"), "role": "lao", "name": "LAO Officer", "state": "Maharashtra", "district": "Nashik"},
}

ROLES_HIERARCHY = ["national_admin", "state_admin", "district_officer", "lao", "legal_officer", "rr_officer", "auditor"]

# ── Auth ──
class LoginReq(BaseModel):
    username: str
    password: str

class TokenResp(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

def create_token(data: dict):
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    if not creds:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username not in USERS:
            raise HTTPException(401, "Invalid token")
        return {**USERS[username], "username": username}
    except JWTError:
        raise HTTPException(401, "Invalid token")

@app.post("/auth/login", response_model=TokenResp)
def login(req: LoginReq):
    user = USERS.get(req.username)
    if not user or not verify_pw(req.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_token({"sub": req.username, "role": user["role"]})
    return {"access_token": token, "user": {"username": req.username, "role": user["role"], "name": user["name"]}}

# ── Data Loading ──
def load_data():
    global PROJECTS, ALERTS, MODEL_META
    projects_file = DATA_DIR / "projects.json"
    if projects_file.exists():
        with open(projects_file) as f:
            PROJECTS = json.load(f)
    generate_alerts()
    meta_file = DATA_DIR / "models" / "model_metadata.json"
    if meta_file.exists():
        with open(meta_file) as f:
            MODEL_META = json.load(f)

def generate_alerts():
    global ALERTS
    ALERTS = []
    for p in PROJECTS:
        if p["risk_score"] >= 76:
            ALERTS.append({"id": f"ALT-{len(ALERTS)+1:04d}", "type": "critical_risk", "severity": "critical",
                "project_id": p["project_id"], "project_name": p["project_name"],
                "message": f"Project {p['project_id']} has {p['risk_score']}% risk score with {p['delay_probability']*100:.0f}% delay probability.",
                "created_at": datetime.utcnow().isoformat(), "status": "active"})
        if p["velocity_change_pct"] < -40:
            ALERTS.append({"id": f"ALT-{len(ALERTS)+1:04d}", "type": "velocity_drop", "severity": "high",
                "project_id": p["project_id"], "project_name": p["project_name"],
                "message": f"Acquisition velocity dropped {abs(p['velocity_change_pct'])}% in {p['project_id']}.",
                "created_at": datetime.utcnow().isoformat(), "status": "active"})
        if p["documents_pending"] > 80:
            ALERTS.append({"id": f"ALT-{len(ALERTS)+1:04d}", "type": "documentation_issue", "severity": "high",
                "project_id": p["project_id"], "project_name": p["project_name"],
                "message": f"{p['documents_pending']} documents pending in {p['project_id']}.",
                "created_at": datetime.utcnow().isoformat(), "status": "active"})

@app.on_event("startup")
def startup():
    load_data()

# ── Project APIs ──
@app.get("/projects")
def list_projects(state: Optional[str] = None, district: Optional[str] = None,
                  status: Optional[str] = None, min_risk: int = 0,
                  limit: int = 100, offset: int = 0):
    filtered = PROJECTS
    if state: filtered = [p for p in filtered if p["state"] == state]
    if district: filtered = [p for p in filtered if p["district"] == district]
    if status: filtered = [p for p in filtered if p["status"] == status]
    if min_risk: filtered = [p for p in filtered if p["risk_score"] >= min_risk]
    return {"total": len(filtered), "projects": filtered[offset:offset+limit]}

@app.get("/projects/{project_id}")
def get_project(project_id: str):
    p = next((p for p in PROJECTS if p["project_id"] == project_id), None)
    if not p: raise HTTPException(404, "Project not found")
    return p

@app.get("/projects/{project_id}/risk")
def get_risk(project_id: str):
    p = next((p for p in PROJECTS if p["project_id"] == project_id), None)
    if not p: raise HTTPException(404)
    risk_cat = "LOW" if p["risk_score"]<=25 else "MODERATE" if p["risk_score"]<=50 else "HIGH" if p["risk_score"]<=75 else "CRITICAL"
    conf = "High" if p["data_confidence"]>80 else "Medium" if p["data_confidence"]>60 else "Low"
    return {"risk_score": p["risk_score"], "category": risk_cat, "delay_probability": p["delay_probability"],
            "expected_delay_days": p["expected_delay_days"], "confidence": conf, "data_confidence": p["data_confidence"],
            "risk_contribution": p["risk_contribution"], "stage_health": p["stage_health"]}

@app.get("/projects/{project_id}/explainability")
def get_explainability(project_id: str):
    p = next((p for p in PROJECTS if p["project_id"] == project_id), None)
    if not p: raise HTTPException(404)
    reasons = []
    if p["stage_completion"]["compensation"] < 0.6:
        reasons.append(f"Compensation completion is only {p['stage_completion']['compensation']*100:.0f}%.")
    if p["legal_disputes"] > 10:
        reasons.append(f"Legal disputes stand at {p['legal_disputes']} cases.")
    if p["stage_completion"]["verification"] < 0.7:
        reasons.append(f"Ownership verification is below benchmark at {p['stage_completion']['verification']*100:.0f}%.")
    if p["approval_delay_days"] > 15:
        reasons.append(f"Average approval time is {p['approval_delay_days']} days.")
    if p["velocity_change_pct"] < -20:
        reasons.append(f"Acquisition velocity dropped {abs(p['velocity_change_pct']):.1f}% recently.")
    if p["documents_pending"] > 50:
        reasons.append(f"{p['documents_pending']} required documents remain incomplete.")
    if not reasons:
        reasons.append("Project metrics are within acceptable thresholds.")
    return {"project_id": project_id, "risk_score": p["risk_score"],
            "reasons": reasons, "risk_contribution": p["risk_contribution"],
            "shap_features": MODEL_META.get("classifier_shap", {}),
            "disclaimer": "AI provides decision support. Final administrative decisions remain with authorized officials."}

@app.get("/projects/{project_id}/timeline")
def get_timeline(project_id: str):
    p = next((p for p in PROJECTS if p["project_id"] == project_id), None)
    if not p: raise HTTPException(404)
    stages = ["notification","survey","verification","objection","award","compensation","rr","possession"]
    labels = {"notification":"Notification","survey":"Survey","verification":"Verification",
              "objection":"Objection","award":"Award","compensation":"Compensation","rr":"R&R","possession":"Possession"}
    timeline = []
    base = datetime.strptime(p["start_date"], "%Y-%m-%d")
    for i, s in enumerate(stages):
        pct = p["stage_completion"][s]
        status = "completed" if pct >= 0.95 else "in_progress" if pct > 0.1 else "pending"
        planned = (base + timedelta(days=(i+1)*45)).strftime("%Y-%m-%d")
        timeline.append({"stage": s, "label": labels[s], "completion_pct": pct,
                         "status": status, "health": p["stage_health"][s],
                         "planned_date": planned, "risk": p["stage_health"][s] < 50})
    return {"project_id": project_id, "start_date": p["start_date"],
            "planned_completion": p["planned_completion"], "predicted_completion": p["predicted_completion"],
            "expected_slippage_days": p["expected_delay_days"], "stages": timeline}

@app.get("/projects/{project_id}/interventions")
def get_interventions(project_id: str):
    p = next((p for p in PROJECTS if p["project_id"] == project_id), None)
    if not p: raise HTTPException(404)
    delay = p["expected_delay_days"]
    interventions = [
        {"id": "INT-A", "title": "Deploy additional verification teams",
         "description": f"Deploy 2 additional verification teams to critical villages.",
         "delay_reduction_days": int(delay*0.45), "effort": "Medium", "priority": "High",
         "responsible": "Land Acquisition Office", "confidence": "Medium",
         "before_delay": delay, "after_delay": delay - int(delay*0.45)},
        {"id": "INT-B", "title": "Priority legal review",
         "description": "Fast-track resolution of pending legal disputes.",
         "delay_reduction_days": int(delay*0.30), "effort": "High", "priority": "High",
         "responsible": "Legal Cell", "confidence": "Medium",
         "before_delay": delay, "after_delay": delay - int(delay*0.30)},
        {"id": "INT-C", "title": "Compensation verification camp",
         "description": "Organize special compensation verification camps in critical villages.",
         "delay_reduction_days": int(delay*0.35), "effort": "Medium", "priority": "High",
         "responsible": "Compensation Authority", "confidence": "High",
         "before_delay": delay, "after_delay": delay - int(delay*0.35)},
        {"id": "INT-D", "title": "Inter-department escalation",
         "description": "Escalate pending approvals to department heads.",
         "delay_reduction_days": int(delay*0.20), "effort": "Low", "priority": "Medium",
         "responsible": "District Administration", "confidence": "Low",
         "before_delay": delay, "after_delay": delay - int(delay*0.20)},
        {"id": "INT-E", "title": "Parallel R&R documentation",
         "description": "Process R&R documentation in parallel with compensation.",
         "delay_reduction_days": int(delay*0.25), "effort": "Medium", "priority": "Medium",
         "responsible": "R&R Office", "confidence": "Medium",
         "before_delay": delay, "after_delay": delay - int(delay*0.25)},
    ]
    return {"project_id": project_id, "current_delay": delay, "interventions": interventions,
            "disclaimer": "Simulated delay reductions based on model estimates. Actual results may vary."}

@app.post("/projects/{project_id}/simulate")
def simulate(project_id: str, body: dict):
    p = next((p for p in PROJECTS if p["project_id"] == project_id), None)
    if not p: raise HTTPException(404)
    delay = p["expected_delay_days"]
    risk = p["risk_score"]
    # Apply counterfactual adjustments
    if "legal_disputes_resolved" in body:
        resolved = min(body["legal_disputes_resolved"], p["legal_disputes"])
        factor = resolved / max(p["legal_disputes"], 1)
        delay = max(0, int(delay * (1 - factor * 0.35)))
        risk = max(0, int(risk * (1 - factor * 0.25)))
    if "verification_boost" in body:
        boost = min(body["verification_boost"], 1.0 - p["stage_completion"]["verification"])
        delay = max(0, int(delay * (1 - boost * 0.4)))
        risk = max(0, int(risk * (1 - boost * 0.3)))
    if "compensation_boost" in body:
        boost = min(body["compensation_boost"], 1.0 - p["stage_completion"]["compensation"])
        delay = max(0, int(delay * (1 - boost * 0.5)))
        risk = max(0, int(risk * (1 - boost * 0.35)))
    if "intervention_id" in body:
        reductions = {"INT-A": 0.45, "INT-B": 0.30, "INT-C": 0.35, "INT-D": 0.20, "INT-E": 0.25}
        r = reductions.get(body["intervention_id"], 0.2)
        delay = max(0, int(p["expected_delay_days"] * (1 - r)))
        risk = max(0, int(p["risk_score"] * (1 - r * 0.7)))
    return {"project_id": project_id, "original_delay": p["expected_delay_days"], "simulated_delay": delay,
            "delay_reduction": p["expected_delay_days"] - delay, "original_risk": p["risk_score"],
            "simulated_risk": risk, "disclaimer": "Model simulation — not a guaranteed outcome."}

@app.post("/projects/{project_id}/intervention")
def create_intervention(project_id: str, body: dict):
    p = next((p for p in PROJECTS if p["project_id"] == project_id), None)
    if not p: raise HTTPException(404)
    entry = {"id": f"AUD-{len(AUDIT_LOG)+1:04d}", "action": "intervention_created",
             "project_id": project_id, "intervention": body.get("intervention_id", ""),
             "assigned_to": body.get("assigned_to", ""), "notes": body.get("notes", ""),
             "timestamp": datetime.utcnow().isoformat(), "status": "pending"}
    AUDIT_LOG.append(entry)
    return {"success": True, "audit_entry": entry}

@app.get("/projects/{project_id}/map")
def get_map_data(project_id: str):
    p = next((p for p in PROJECTS if p["project_id"] == project_id), None)
    if not p: raise HTTPException(404)
    return {"project_id": project_id, "center": [p["latitude"], p["longitude"]],
            "villages": p["villages"], "risk_score": p["risk_score"]}

# ── Alerts ──
@app.get("/alerts")
def list_alerts(severity: Optional[str] = None, status: Optional[str] = None, limit: int = 50):
    filtered = ALERTS
    if severity: filtered = [a for a in filtered if a["severity"] == severity]
    if status: filtered = [a for a in filtered if a["status"] == status]
    return {"total": len(filtered), "alerts": filtered[:limit]}

@app.post("/alerts/{alert_id}/acknowledge")
def ack_alert(alert_id: str):
    a = next((a for a in ALERTS if a["id"] == alert_id), None)
    if not a: raise HTTPException(404)
    a["status"] = "acknowledged"
    return {"success": True, "alert": a}

# ── Analytics ──
@app.get("/analytics/national")
def national_analytics():
    total = len(PROJECTS)
    delayed = sum(1 for p in PROJECTS if p["status"] == "delayed")
    critical = sum(1 for p in PROJECTS if p["risk_score"] >= 76)
    high_risk = sum(1 for p in PROJECTS if 51 <= p["risk_score"] <= 75)
    avg_delay = sum(p["expected_delay_days"] for p in PROJECTS) / max(total, 1)
    states = {}
    for p in PROJECTS:
        s = p["state"]
        if s not in states:
            states[s] = {"total": 0, "delayed": 0, "critical": 0, "avg_risk": 0, "risk_sum": 0,
                         "lat": p["latitude"], "lon": p["longitude"]}
        states[s]["total"] += 1
        states[s]["risk_sum"] += p["risk_score"]
        if p["status"] == "delayed": states[s]["delayed"] += 1
        if p["risk_score"] >= 76: states[s]["critical"] += 1
    for s in states:
        states[s]["avg_risk"] = round(states[s]["risk_sum"] / states[s]["total"], 1)
        del states[s]["risk_sum"]
    return {"total_projects": total, "delayed_projects": delayed, "critical_projects": critical,
            "high_risk_projects": high_risk, "avg_delay_days": round(avg_delay, 1),
            "avg_risk": round(sum(p["risk_score"] for p in PROJECTS)/max(total,1), 1),
            "compensation_pending_total": round(sum(p["compensation_pending_lakhs"] for p in PROJECTS), 2),
            "legal_cases_total": sum(p["legal_disputes"] for p in PROJECTS),
            "states": states}

@app.get("/analytics/states/{state}")
def state_analytics(state: str):
    sp = [p for p in PROJECTS if p["state"] == state]
    if not sp: raise HTTPException(404)
    districts = {}
    for p in sp:
        d = p["district"]
        if d not in districts:
            districts[d] = {"total": 0, "delayed": 0, "critical": 0, "risk_sum": 0, "delay_sum": 0}
        districts[d]["total"] += 1
        districts[d]["risk_sum"] += p["risk_score"]
        districts[d]["delay_sum"] += p["expected_delay_days"]
        if p["status"] == "delayed": districts[d]["delayed"] += 1
        if p["risk_score"] >= 76: districts[d]["critical"] += 1
    for d in districts:
        districts[d]["avg_risk"] = round(districts[d]["risk_sum"]/districts[d]["total"], 1)
        districts[d]["avg_delay"] = round(districts[d]["delay_sum"]/districts[d]["total"], 1)
        del districts[d]["risk_sum"]; del districts[d]["delay_sum"]
    return {"state": state, "total_projects": len(sp),
            "delayed": sum(1 for p in sp if p["status"]=="delayed"),
            "critical": sum(1 for p in sp if p["risk_score"]>=76),
            "avg_risk": round(sum(p["risk_score"] for p in sp)/len(sp), 1),
            "avg_delay": round(sum(p["expected_delay_days"] for p in sp)/len(sp), 1),
            "districts": districts}

@app.get("/analytics/districts/{state}/{district}")
def district_analytics(state: str, district: str):
    dp = [p for p in PROJECTS if p["state"]==state and p["district"]==district]
    if not dp: raise HTTPException(404)
    return {"state": state, "district": district, "total_projects": len(dp),
            "projects": sorted(dp, key=lambda x: -x["risk_score"])[:20],
            "avg_risk": round(sum(p["risk_score"] for p in dp)/len(dp), 1)}

# ── Model Metrics ──
@app.get("/model/metrics")
def model_metrics():
    if not MODEL_META:
        return {"status": "no_model", "message": "Model not yet trained."}
    return {**MODEL_META, "disclaimer": "Prototype demonstration using synthetic operational data."}

# ── Audit Log ──
@app.get("/audit")
def get_audit():
    return {"entries": AUDIT_LOG}

# ── Live Demo Simulator ──
@app.post("/demo/simulate-update")
def simulate_live_update():
    """Simulate incoming project updates for live demo."""
    import random
    if not PROJECTS: return {"error": "No projects loaded"}
    p = next((p for p in PROJECTS if p["project_id"] == "LA-MH-0001"), random.choice(PROJECTS))
    changes = []
    # Random updates
    if random.random() > 0.5:
        old = p["stage_completion"]["compensation"]
        p["stage_completion"]["compensation"] = round(min(1.0, old + random.uniform(0.03, 0.12)), 2)
        changes.append(f"Compensation progress: {old*100:.0f}% → {p['stage_completion']['compensation']*100:.0f}%")
    if random.random() > 0.6:
        old = p["legal_disputes"]
        p["legal_disputes"] = max(0, old + random.choice([-3, -2, -1, 1, 2]))
        changes.append(f"Legal disputes: {old} → {p['legal_disputes']}")
    if random.random() > 0.5:
        old = p["stage_completion"]["verification"]
        p["stage_completion"]["verification"] = round(min(1.0, old + random.uniform(0.02, 0.08)), 2)
        changes.append(f"Verification progress: {old*100:.0f}% → {p['stage_completion']['verification']*100:.0f}%")
    # Recalculate risk
    sc = p["stage_completion"]
    oc = sum(sc.values()) / 8
    p["overall_completion_pct"] = round(oc, 2)
    disp_factor = p["legal_disputes"] / max(p["total_parcels"], 1)
    new_risk = min(100, max(0, int(
        (1-oc)*30 + disp_factor*25 + (1-sc["compensation"])*20 +
        p["approval_delay_days"]*0.3 + p["avg_stakeholder_response_days"]*0.8
    )))
    old_risk = p["risk_score"]
    p["risk_score"] = new_risk
    p["delay_probability"] = round(min(0.99, max(0.05, new_risk/100)), 2)
    new_delay = max(0, int((1-sc["compensation"])*30 + disp_factor*80 + (1-sc["verification"])*25 +
                           p["approval_delay_days"]*0.5 + p["avg_stakeholder_response_days"]*1.2 + (1-sc["rr"])*15))
    old_delay = p["expected_delay_days"]
    p["expected_delay_days"] = new_delay
    changes.append(f"Risk: {old_risk} → {new_risk}")
    changes.append(f"Expected delay: {old_delay} → {new_delay} days")
    return {"project_id": p["project_id"], "changes": changes, "new_risk": new_risk,
            "new_delay": new_delay, "timestamp": datetime.utcnow().isoformat()}

@app.get("/health")
def health():
    return {"status": "ok", "projects_loaded": len(PROJECTS), "demo_mode": True}
