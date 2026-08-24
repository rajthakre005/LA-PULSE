"""
LA-PULSE Synthetic Data Generator
Generates 1000+ realistic land acquisition projects with correlated features.
Seed is fixed for reproducible demos.
"""

import json
import random
import math
import os
from datetime import datetime, timedelta

SEED = 42
random.seed(SEED)

# ── Reference Data ──────────────────────────────────────────────────────────

STATES = {
    "Maharashtra": {
        "capital": [19.076, 72.8777],
        "districts": ["Pune", "Nagpur", "Nashik", "Aurangabad", "Thane", "Solapur", "Kolhapur", "Amravati"],
    },
    "Uttar Pradesh": {
        "capital": [26.8467, 80.9462],
        "districts": ["Lucknow", "Agra", "Varanasi", "Kanpur", "Prayagraj", "Meerut", "Ghaziabad", "Bareilly"],
    },
    "Tamil Nadu": {
        "capital": [13.0827, 80.2707],
        "districts": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli", "Tirunelveli", "Erode", "Vellore"],
    },
    "Karnataka": {
        "capital": [12.9716, 77.5946],
        "districts": ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi", "Davanagere", "Ballari", "Tumakuru"],
    },
    "Rajasthan": {
        "capital": [26.9124, 75.7873],
        "districts": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Alwar", "Bhilwara"],
    },
    "Gujarat": {
        "capital": [23.0225, 72.5714],
        "districts": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar"],
    },
    "Madhya Pradesh": {
        "capital": [23.2599, 77.4126],
        "districts": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Rewa", "Satna"],
    },
    "West Bengal": {
        "capital": [22.5726, 88.3639],
        "districts": ["Kolkata", "Howrah", "Darjeeling", "Siliguri", "Durgapur", "Asansol", "Bardhaman", "Malda"],
    },
    "Telangana": {
        "capital": [17.385, 78.4867],
        "districts": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Mahbubnagar", "Nalgonda", "Adilabad"],
    },
    "Andhra Pradesh": {
        "capital": [16.5062, 80.648],
        "districts": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati", "Kakinada", "Rajahmundry"],
    },
}

PROJECT_TYPES = [
    "National Highway", "State Highway", "Railway", "Industrial Corridor",
    "Smart City", "Airport", "Canal/Irrigation", "Power Transmission",
    "SEZ", "Defence", "Metro Rail", "Expressway",
]

VILLAGE_NAMES = [
    "Rampur", "Sultanpur", "Chandpur", "Govindpur", "Laxmipur",
    "Shivaji Nagar", "Nehru Colony", "Ambedkar Nagar", "Gandhi Gram", "Patel Nagar",
    "Rajiv Nagar", "Indira Colony", "Subhash Nagar", "Bose Nagar", "Tilak Nagar",
    "Saraswati Vihar", "Lakshmi Nagar", "Durga Colony", "Kali Nagar", "Hanuman Nagar",
    "Shanti Nagar", "Pragati Vihar", "Naya Gaon", "Purana Gaon", "Jheel Mohalla",
    "Bagh Mohalla", "Masjid Road", "Mandir Mohalla", "Gurudwara Road", "Station Road",
    "Kheda", "Talav", "Tekdi", "Wadi", "Peth",
    "Gaothan", "Mala", "Nagar", "Pada", "Tanda",
]

STAGES = [
    "notification", "survey", "verification", "objection",
    "award", "compensation", "rr", "possession",
]

STAGE_LABELS = {
    "notification": "Notification (Section 11)",
    "survey": "Survey & Measurement",
    "verification": "Ownership Verification",
    "objection": "Objection Hearing",
    "award": "Award Declaration",
    "compensation": "Compensation Disbursement",
    "rr": "R&R Implementation",
    "possession": "Possession & Handover",
}

DEPARTMENTS = [
    "Land Acquisition Office", "Revenue Department", "Legal Cell",
    "R&R Office", "Survey Department", "District Administration",
    "Compensation Authority", "Environmental Clearance",
]


def jitter(base_lat, base_lon, radius=1.5):
    return (
        base_lat + random.uniform(-radius, radius),
        base_lon + random.uniform(-radius, radius),
    )


def generate_villages(n, base_lat, base_lon):
    villages = []
    for i in range(n):
        name = random.choice(VILLAGE_NAMES) + f" {random.randint(1,99)}"
        lat, lon = jitter(base_lat, base_lon, 0.3)
        parcels = random.randint(10, 200)
        families = int(parcels * random.uniform(0.5, 1.5))
        villages.append({
            "village_id": f"VLG-{random.randint(10000,99999)}",
            "name": name,
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            "total_parcels": parcels,
            "affected_families": families,
            "verification_pct": round(random.uniform(0.1, 1.0), 2),
            "compensation_pct": round(random.uniform(0.0, 1.0), 2),
            "disputes": random.randint(0, int(parcels * 0.3)),
            "rr_progress_pct": round(random.uniform(0.0, 1.0), 2),
            "doc_completion_pct": round(random.uniform(0.3, 1.0), 2),
        })
    return villages


def generate_parcels(villages):
    parcels = []
    for v in villages:
        for j in range(min(v["total_parcels"], 8)):  # cap for dataset size
            has_dispute = random.random() < 0.2
            parcels.append({
                "parcel_id": f"P-{random.randint(10000,99999)}",
                "village_id": v["village_id"],
                "area_hectares": round(random.uniform(0.1, 12.0), 2),
                "ownership_verified": random.random() < v["verification_pct"],
                "dispute_status": random.choice(["none", "pending", "resolved", "court"]) if has_dispute else "none",
                "compensation_status": random.choice(["pending", "partial", "completed"]),
                "documentation_complete": random.random() < v["doc_completion_pct"],
                "rr_status": random.choice(["not_started", "in_progress", "completed"]),
                "risk_score": random.randint(10, 100),
            })
    return parcels


def generate_project(idx, state, district, base_lat, base_lon):
    ptype = random.choice(PROJECT_TYPES)
    state_code = "".join([w[0] for w in state.split()]).upper()[:2]
    project_id = f"LA-{state_code}-{idx:04d}"

    num_villages = random.randint(3, 18)
    villages = generate_villages(num_villages, base_lat, base_lon)
    total_parcels = sum(v["total_parcels"] for v in villages)
    total_families = sum(v["affected_families"] for v in villages)
    land_area = round(total_parcels * random.uniform(0.3, 2.0), 2)

    # ── Dates ───────────────────────────────────────────────────────────────
    start_date = datetime(2024, 1, 1) + timedelta(days=random.randint(0, 500))
    planned_months = random.randint(12, 36)
    planned_end = start_date + timedelta(days=planned_months * 30)

    # ── Stage completion (correlated) ───────────────────────────────────────
    base_progress = random.uniform(0.3, 0.95)
    notification_pct = min(1.0, base_progress + random.uniform(0.0, 0.3))
    survey_pct = min(notification_pct, base_progress + random.uniform(-0.05, 0.2))
    verification_pct = min(survey_pct, base_progress + random.uniform(-0.15, 0.1))
    objection_pct = min(verification_pct, base_progress + random.uniform(-0.2, 0.05))
    award_pct = min(objection_pct, base_progress + random.uniform(-0.25, 0.0))
    compensation_pct = min(award_pct, base_progress + random.uniform(-0.3, -0.05))
    rr_pct = min(compensation_pct, base_progress + random.uniform(-0.35, -0.1))
    possession_pct = min(rr_pct, base_progress + random.uniform(-0.4, -0.15))

    stage_pcts = {
        "notification": round(max(0, notification_pct), 2),
        "survey": round(max(0, survey_pct), 2),
        "verification": round(max(0, verification_pct), 2),
        "objection": round(max(0, objection_pct), 2),
        "award": round(max(0, award_pct), 2),
        "compensation": round(max(0, compensation_pct), 2),
        "rr": round(max(0, rr_pct), 2),
        "possession": round(max(0, possession_pct), 2),
    }

    overall_completion = round(sum(stage_pcts.values()) / 8, 2)

    # ── Correlated risk features ────────────────────────────────────────────
    legal_disputes = random.randint(0, int(total_parcels * 0.15))
    dispute_factor = legal_disputes / max(total_parcels, 1)

    comp_total = round(total_families * random.uniform(5, 25), 2)  # lakhs
    comp_paid_ratio = compensation_pct * random.uniform(0.7, 1.0)
    comp_paid = round(comp_total * comp_paid_ratio, 2)
    comp_pending = round(comp_total - comp_paid, 2)

    avg_response_days = round(random.uniform(2, 25), 1)
    approval_delay_days = random.randint(0, 60)

    # ── Delay calculation (realistic correlation) ───────────────────────────
    delay_drivers = (
        (1 - compensation_pct) * 30
        + dispute_factor * 80
        + (1 - verification_pct) * 25
        + approval_delay_days * 0.5
        + avg_response_days * 1.2
        + (1 - rr_pct) * 15
        + random.uniform(-10, 20)
    )
    actual_delay = max(0, int(delay_drivers))

    risk_score = min(100, max(0, int(
        (1 - overall_completion) * 30
        + dispute_factor * 25
        + (1 - compensation_pct) * 20
        + approval_delay_days * 0.3
        + avg_response_days * 0.8
        + random.uniform(-5, 15)
    )))

    delay_prob = min(0.99, max(0.05, risk_score / 100 + random.uniform(-0.08, 0.08)))

    actual_end = planned_end + timedelta(days=actual_delay) if actual_delay > 0 else None
    status = "completed" if overall_completion >= 0.95 else ("delayed" if risk_score > 60 else "on_track")

    # ── Velocity ────────────────────────────────────────────────────────────
    prev_week_velocity = random.randint(15, 60)
    curr_week_velocity = max(1, prev_week_velocity + random.randint(-30, 10))
    velocity_change = round((curr_week_velocity - prev_week_velocity) / max(prev_week_velocity, 1) * 100, 1)

    # ── Stage health ────────────────────────────────────────────────────────
    stage_health = {}
    for s, pct in stage_pcts.items():
        health = min(100, max(10, int(pct * 80 + random.uniform(-10, 20))))
        stage_health[s] = health

    # ── Stakeholder responsiveness ──────────────────────────────────────────
    stakeholders = {}
    for dept in random.sample(DEPARTMENTS, min(5, len(DEPARTMENTS))):
        stakeholders[dept] = {
            "avg_response_days": round(random.uniform(1, 30), 1),
            "overdue_actions": random.randint(0, 15),
            "pending_approvals": random.randint(0, 8),
            "responsiveness_index": random.randint(20, 95),
        }

    # ── Documents ───────────────────────────────────────────────────────────
    total_docs = random.randint(50, 300)
    docs_complete = int(total_docs * random.uniform(0.4, 0.95))
    docs_pending = total_docs - docs_complete
    doc_anomalies = random.randint(0, int(docs_pending * 0.3))

    # ── Risk contribution breakdown ─────────────────────────────────────────
    raw = {
        "compensation_backlog": random.uniform(10, 35),
        "legal_disputes": random.uniform(8, 30),
        "documentation_gaps": random.uniform(5, 25),
        "approval_delay": random.uniform(5, 20),
        "stakeholder_response": random.uniform(3, 15),
        "rr_progress": random.uniform(3, 15),
    }
    total_raw = sum(raw.values())
    risk_contribution = {k: round(v / total_raw * 100, 1) for k, v in raw.items()}

    # ── Priority / impact ───────────────────────────────────────────────────
    project_value_crore = round(random.uniform(50, 5000), 2)
    strategic_importance = random.choice(["low", "medium", "high", "critical"])
    impact_score = min(100, int(
        (project_value_crore / 5000) * 30
        + {"low": 5, "medium": 15, "high": 25, "critical": 35}[strategic_importance]
        + (total_families / 1000) * 20
        + random.uniform(0, 15)
    ))

    data_confidence = min(100, max(30, int(overall_completion * 60 + random.uniform(10, 40))))

    lat, lon = jitter(base_lat, base_lon, 0.8)

    return {
        "project_id": project_id,
        "project_name": f"{ptype} — {district} Package {idx % 20 + 1:02d}",
        "project_type": ptype,
        "state": state,
        "district": district,
        "latitude": round(lat, 6),
        "longitude": round(lon, 6),
        "land_area_hectares": land_area,
        "num_villages": num_villages,
        "total_parcels": total_parcels,
        "affected_families": total_families,
        "project_value_crore": project_value_crore,
        "strategic_importance": strategic_importance,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "planned_completion": planned_end.strftime("%Y-%m-%d"),
        "predicted_completion": (planned_end + timedelta(days=actual_delay)).strftime("%Y-%m-%d") if actual_delay > 0 else planned_end.strftime("%Y-%m-%d"),
        "actual_completion": actual_end.strftime("%Y-%m-%d") if actual_end and status == "completed" else None,
        "expected_delay_days": actual_delay,
        "status": status,
        "overall_completion_pct": overall_completion,
        "stage_completion": stage_pcts,
        "stage_health": stage_health,
        "risk_score": risk_score,
        "delay_probability": round(delay_prob, 2),
        "data_confidence": data_confidence,
        "legal_disputes": legal_disputes,
        "compensation_total_lakhs": comp_total,
        "compensation_paid_lakhs": comp_paid,
        "compensation_pending_lakhs": comp_pending,
        "avg_stakeholder_response_days": avg_response_days,
        "approval_delay_days": approval_delay_days,
        "total_documents": total_docs,
        "documents_complete": docs_complete,
        "documents_pending": docs_pending,
        "document_anomalies": doc_anomalies,
        "risk_contribution": risk_contribution,
        "impact_score": impact_score,
        "velocity_prev_week": prev_week_velocity,
        "velocity_curr_week": curr_week_velocity,
        "velocity_change_pct": velocity_change,
        "stakeholders": stakeholders,
        "villages": villages,
        "priority_rank": 0,  # computed after sorting
    }


def generate_demo_project():
    """Generate the flagship demo project (Samruddhi Connectivity Package)."""
    villages = generate_villages(12, 19.876, 73.812)

    # Make 4 villages critical
    for i in range(4):
        villages[i]["disputes"] = random.randint(8, 25)
        villages[i]["verification_pct"] = round(random.uniform(0.2, 0.45), 2)
        villages[i]["compensation_pct"] = round(random.uniform(0.15, 0.40), 2)
        villages[i]["doc_completion_pct"] = round(random.uniform(0.3, 0.55), 2)

    total_parcels = sum(v["total_parcels"] for v in villages)
    total_families = sum(v["affected_families"] for v in villages)

    return {
        "project_id": "LA-MH-0001",
        "project_name": "Samruddhi Connectivity Package — Demo",
        "project_type": "Expressway",
        "state": "Maharashtra",
        "district": "Nashik",
        "latitude": 19.9975,
        "longitude": 73.7898,
        "land_area_hectares": 842.5,
        "num_villages": 12,
        "total_parcels": total_parcels,
        "affected_families": total_families,
        "project_value_crore": 3200.0,
        "strategic_importance": "critical",
        "start_date": "2025-01-15",
        "planned_completion": "2027-03-15",
        "predicted_completion": "2027-06-18",
        "actual_completion": None,
        "expected_delay_days": 92,
        "status": "delayed",
        "overall_completion_pct": 0.68,
        "stage_completion": {
            "notification": 0.98, "survey": 0.92, "verification": 0.71,
            "objection": 0.65, "award": 0.58, "compensation": 0.52,
            "rr": 0.41, "possession": 0.34,
        },
        "stage_health": {
            "notification": 95, "survey": 88, "verification": 54,
            "objection": 61, "award": 56, "compensation": 42,
            "rr": 38, "possession": 31,
        },
        "risk_score": 84,
        "delay_probability": 0.84,
        "data_confidence": 91,
        "legal_disputes": 23,
        "compensation_total_lakhs": 18400.0,
        "compensation_paid_lakhs": 9568.0,
        "compensation_pending_lakhs": 8832.0,
        "avg_stakeholder_response_days": 14.2,
        "approval_delay_days": 28,
        "total_documents": 248,
        "documents_complete": 131,
        "documents_pending": 117,
        "document_anomalies": 14,
        "risk_contribution": {
            "compensation_backlog": 28.0, "legal_disputes": 23.0,
            "documentation_gaps": 18.0, "approval_delay": 14.0,
            "stakeholder_response": 9.0, "rr_progress": 8.0,
        },
        "impact_score": 92,
        "velocity_prev_week": 42,
        "velocity_curr_week": 19,
        "velocity_change_pct": -54.8,
        "stakeholders": {
            "Land Acquisition Office": {"avg_response_days": 4.2, "overdue_actions": 3, "pending_approvals": 2, "responsiveness_index": 84},
            "Revenue Department": {"avg_response_days": 9.8, "overdue_actions": 7, "pending_approvals": 4, "responsiveness_index": 61},
            "Legal Cell": {"avg_response_days": 18.5, "overdue_actions": 12, "pending_approvals": 6, "responsiveness_index": 43},
            "R&R Office": {"avg_response_days": 6.1, "overdue_actions": 4, "pending_approvals": 3, "responsiveness_index": 72},
            "Survey Department": {"avg_response_days": 3.5, "overdue_actions": 1, "pending_approvals": 1, "responsiveness_index": 88},
        },
        "villages": villages,
        "priority_rank": 1,
    }


def main():
    projects = [generate_demo_project()]
    idx = 2

    for state, info in STATES.items():
        lat, lon = info["capital"]
        for district in info["districts"]:
            n = random.randint(5, 15)
            for _ in range(n):
                dlat, dlon = jitter(lat, lon, 1.0)
                projects.append(generate_project(idx, state, district, dlat, dlon))
                idx += 1

    # Sort by risk and assign priority rank
    projects.sort(key=lambda p: (-p["risk_score"], -p["expected_delay_days"]))
    for rank, p in enumerate(projects, 1):
        p["priority_rank"] = rank

    os.makedirs("../data", exist_ok=True)
    with open("../data/projects.json", "w") as f:
        json.dump(projects, f, indent=2)

    # Generate flat CSV for ML training
    rows = []
    for p in projects:
        rows.append({
            "project_id": p["project_id"],
            "project_type": p["project_type"],
            "state": p["state"],
            "district": p["district"],
            "land_area": p["land_area_hectares"],
            "affected_families": p["affected_families"],
            "num_parcels": p["total_parcels"],
            "num_villages": p["num_villages"],
            "notification_pct": p["stage_completion"]["notification"],
            "survey_pct": p["stage_completion"]["survey"],
            "verification_pct": p["stage_completion"]["verification"],
            "objection_pct": p["stage_completion"]["objection"],
            "award_pct": p["stage_completion"]["award"],
            "compensation_pct": p["stage_completion"]["compensation"],
            "rr_pct": p["stage_completion"]["rr"],
            "possession_pct": p["stage_completion"]["possession"],
            "overall_completion": p["overall_completion_pct"],
            "legal_disputes": p["legal_disputes"],
            "comp_total": p["compensation_total_lakhs"],
            "comp_paid": p["compensation_paid_lakhs"],
            "comp_pending": p["compensation_pending_lakhs"],
            "avg_response_days": p["avg_stakeholder_response_days"],
            "approval_delay": p["approval_delay_days"],
            "docs_total": p["total_documents"],
            "docs_pending": p["documents_pending"],
            "doc_anomalies": p["document_anomalies"],
            "velocity_change": p["velocity_change_pct"],
            "project_value": p["project_value_crore"],
            "delay_days": p["expected_delay_days"],
            "risk_score": p["risk_score"],
            "delay_probability": p["delay_probability"],
            "is_delayed": 1 if p["status"] == "delayed" else 0,
        })

    import csv
    with open("../data/training_data.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    print(f"Generated {len(projects)} projects")
    print(f"  Delayed: {sum(1 for p in projects if p['status'] == 'delayed')}")
    print(f"  On track: {sum(1 for p in projects if p['status'] == 'on_track')}")
    print(f"  Completed: {sum(1 for p in projects if p['status'] == 'completed')}")
    print(f"  States: {len(set(p['state'] for p in projects))}")
    print(f"  Districts: {len(set(p['district'] for p in projects))}")
    print(f"Saved to ../data/projects.json and ../data/training_data.csv")


if __name__ == "__main__":
    main()
