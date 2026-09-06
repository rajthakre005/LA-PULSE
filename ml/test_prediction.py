"""
Test script to demonstrate live prediction endpoint.
"""

import requests
import json

# Example project features
test_features = {
    "land_area": 500,
    "affected_families": 100,
    "num_parcels": 150,
    "num_villages": 5,
    "notification_pct": 0.5,
    "survey_pct": 0.4,
    "verification_pct": 0.3,
    "objection_pct": 0.2,
    "award_pct": 0.15,
    "compensation_pct": 0.1,
    "rr_pct": 0.05,
    "possession_pct": 0.02,
    "overall_completion": 0.2,
    "legal_disputes": 5,
    "comp_total": 1000,
    "comp_paid": 200,
    "comp_pending": 800,
    "avg_response_days": 15,
    "approval_delay": 30,
    "docs_total": 50,
    "docs_pending": 20,
    "doc_anomalies": 3,
    "velocity_change": -5,
    "project_value": 5000
}

print("=== Testing Live Prediction Endpoint ===\n")
print("Request features:")
for key, value in test_features.items():
    print(f"  {key}: {value}")

try:
    response = requests.post(
        "http://localhost:8000/predict",
        json=test_features,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        result = response.json()
        print("\n=== Prediction Results ===")
        print(f"Delay Probability: {result['delay_probability']:.2%}")
        print(f"Predicted Delay Days: {result['predicted_delay_days']:.1f}")
        print(f"Risk Score: {result['risk_score']:.1f}")
        print(f"Risk Category: {result['risk_category']}")
        print(f"Model Version: {result['model_version']}")
    else:
        print(f"\nError: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"\nError: {e}")
    print("Make sure the backend is running on http://localhost:8000")
