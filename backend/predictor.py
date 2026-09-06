"""
LA-PULSE ML Predictor Module
Provides runtime prediction using trained ML models.
Uses the same FEATURE_COLS and feature ordering as training.
"""

import json
import pickle
import numpy as np
from typing import Dict, Any

FEATURE_COLS = [
    "land_area", "affected_families", "num_parcels", "num_villages",
    "notification_pct", "survey_pct", "verification_pct", "objection_pct",
    "award_pct", "compensation_pct", "rr_pct", "possession_pct",
    "overall_completion", "legal_disputes", "comp_total", "comp_paid",
    "comp_pending", "avg_response_days", "approval_delay",
    "docs_total", "docs_pending", "doc_anomalies", "velocity_change",
    "project_value",
]

MODELS_DIR = "d:/LA-PULSE/data/models"


class MLPredictor:
    """ML predictor for delay and risk prediction."""
    
    def __init__(self):
        """Load trained models."""
        with open(f"{MODELS_DIR}/delay_classifier.pkl", "rb") as f:
            self.classifier = pickle.load(f)
        with open(f"{MODELS_DIR}/delay_regressor.pkl", "rb") as f:
            self.delay_regressor = pickle.load(f)
        with open(f"{MODELS_DIR}/risk_regressor.pkl", "rb") as f:
            self.risk_regressor = pickle.load(f)
        with open(f"{MODELS_DIR}/model_metadata.json", "r") as f:
            self.metadata = json.load(f)
    
    def get_risk_category(self, risk_score: float) -> str:
        """Get risk category based on risk score."""
        if risk_score >= 76:
            return "critical"
        elif risk_score >= 51:
            return "high"
        elif risk_score >= 26:
            return "moderate"
        else:
            return "low"
    
    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make prediction for a new project.
        
        Args:
            features: Dictionary containing all feature values
            
        Returns:
            Dictionary with delay_probability, predicted_delay_days, risk_score, risk_category
        """
        # Validate features
        missing_features = set(FEATURE_COLS) - set(features.keys())
        if missing_features:
            raise ValueError(f"Missing required features: {missing_features}")
        
        # Extract features in correct order
        X = np.array([[features[col] for col in FEATURE_COLS]])
        
        # Make predictions
        delay_prob = float(self.classifier.predict_proba(X)[0, 1])
        predicted_delay = float(self.delay_regressor.predict(X)[0])
        risk_score = float(self.risk_regressor.predict(X)[0])
        
        # Ensure non-negative values
        predicted_delay = max(0, predicted_delay)
        risk_score = np.clip(risk_score, 0, 100)
        
        return {
            "delay_probability": round(delay_prob, 4),
            "predicted_delay_days": round(predicted_delay, 2),
            "risk_score": round(risk_score, 2),
            "risk_category": self.get_risk_category(risk_score),
            "model_version": self.metadata.get("model_version", "unknown"),
        }
    
    def predict_with_shap(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make prediction with SHAP explanation.
        
        Args:
            features: Dictionary containing all feature values
            
        Returns:
            Dictionary with predictions and SHAP feature contributions
        """
        import shap
        
        # Get base prediction
        prediction = self.predict(features)
        
        # Compute SHAP values for this specific prediction
        X = np.array([[features[col] for col in FEATURE_COLS]])
        explainer = shap.TreeExplainer(self.classifier)
        shap_values = explainer.shap_values(X)[0]
        
        # Get top contributing features
        feature_contributions = []
        for i, (col, val) in enumerate(zip(FEATURE_COLS, shap_values)):
            feature_contributions.append({
                "feature": col,
                "contribution": round(float(val), 4),
                "value": round(float(features[col]), 4)
            })
        
        # Sort by absolute contribution
        feature_contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)
        
        prediction["shap_explanation"] = feature_contributions[:10]  # Top 10 features
        
        return prediction


# Global predictor instance
_predictor = None


def get_predictor() -> MLPredictor:
    """Get or create global predictor instance."""
    global _predictor
    if _predictor is None:
        _predictor = MLPredictor()
    return _predictor
