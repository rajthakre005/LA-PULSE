"""
LA-PULSE ML Training Pipeline
Trains XGBoost models for delay prediction with SHAP explainability.
"""

import json
import os
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    mean_absolute_error, mean_squared_error, r2_score,
    classification_report, confusion_matrix
)
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier, XGBRegressor
import shap
import warnings
warnings.filterwarnings("ignore")

SEED = 42
np.random.seed(SEED)

FEATURE_COLS = [
    "land_area", "affected_families", "num_parcels", "num_villages",
    "notification_pct", "survey_pct", "verification_pct", "objection_pct",
    "award_pct", "compensation_pct", "rr_pct", "possession_pct",
    "overall_completion", "legal_disputes", "comp_total", "comp_paid",
    "comp_pending", "avg_response_days", "approval_delay",
    "docs_total", "docs_pending", "doc_anomalies", "velocity_change",
    "project_value",
]


def load_data():
    df = pd.read_csv("../data/training_data.csv")
    print(f"Loaded {len(df)} records")
    return df


def train_classifier(df):
    """Train delay classification model (delayed vs on-track)."""
    X = df[FEATURE_COLS].values
    y = df["is_delayed"].values
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)

    model = XGBClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.1,
        subsample=0.8, colsample_bytree=0.8, random_state=SEED,
        eval_metric="logloss", use_label_encoder=False,
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_test, y_pred, zero_division=0), 4),
        "f1": round(f1_score(y_test, y_pred, zero_division=0), 4),
    }
    print("\n=== Delay Classifier ===")
    for k, v in metrics.items():
        print(f"  {k}: {v}")

    return model, metrics


def train_regressor(df):
    """Train delay-days regression model."""
    X = df[FEATURE_COLS].values
    y = df["delay_days"].values
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)

    model = XGBRegressor(
        n_estimators=200, max_depth=6, learning_rate=0.1,
        subsample=0.8, colsample_bytree=0.8, random_state=SEED,
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    y_pred = model.predict(X_test)

    metrics = {
        "mae": round(mean_absolute_error(y_test, y_pred), 2),
        "rmse": round(np.sqrt(mean_squared_error(y_test, y_pred)), 2),
        "r2": round(r2_score(y_test, y_pred), 4),
    }
    print("\n=== Delay Regressor ===")
    for k, v in metrics.items():
        print(f"  {k}: {v}")

    return model, metrics


def train_risk_regressor(df):
    """Train risk score regression model."""
    X = df[FEATURE_COLS].values
    y = df["risk_score"].values
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)

    model = XGBRegressor(
        n_estimators=150, max_depth=5, learning_rate=0.1,
        subsample=0.8, colsample_bytree=0.8, random_state=SEED,
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    y_pred = model.predict(X_test)
    metrics = {
        "mae": round(mean_absolute_error(y_test, y_pred), 2),
        "rmse": round(np.sqrt(mean_squared_error(y_test, y_pred)), 2),
        "r2": round(r2_score(y_test, y_pred), 4),
    }
    print("\n=== Risk Regressor ===")
    for k, v in metrics.items():
        print(f"  {k}: {v}")

    return model, metrics


def compute_shap(model, df, name):
    """Compute SHAP values for explainability."""
    X = df[FEATURE_COLS].values
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X[:100])  # sample for speed
    feature_importance = dict(zip(
        FEATURE_COLS,
        [round(float(v), 4) for v in np.abs(shap_values).mean(axis=0)]
    ))
    sorted_importance = dict(sorted(feature_importance.items(), key=lambda x: -x[1]))
    print(f"\n=== SHAP Feature Importance ({name}) ===")
    for k, v in list(sorted_importance.items())[:10]:
        print(f"  {k}: {v}")
    return sorted_importance


def main():
    os.makedirs("../data/models", exist_ok=True)
    df = load_data()

    clf, clf_metrics = train_classifier(df)
    reg, reg_metrics = train_regressor(df)
    risk_reg, risk_metrics = train_risk_regressor(df)

    clf_shap = compute_shap(clf, df, "Classifier")
    reg_shap = compute_shap(reg, df, "Regressor")

    # Save models
    with open("../data/models/delay_classifier.pkl", "wb") as f:
        pickle.dump(clf, f)
    with open("../data/models/delay_regressor.pkl", "wb") as f:
        pickle.dump(reg, f)
    with open("../data/models/risk_regressor.pkl", "wb") as f:
        pickle.dump(risk_reg, f)

    # Save metadata
    metadata = {
        "model_version": "1.0.0",
        "trained_at": pd.Timestamp.now().isoformat(),
        "features": FEATURE_COLS,
        "classifier_metrics": clf_metrics,
        "regressor_metrics": reg_metrics,
        "risk_metrics": risk_metrics,
        "classifier_shap": clf_shap,
        "regressor_shap": reg_shap,
        "training_samples": len(df),
        "known_limitations": [
            "Trained on synthetic data - not validated on real government data.",
            "Feature distributions may not match actual acquisition projects.",
            "Model should be retrained with real operational data before deployment.",
        ],
    }
    with open("../data/models/model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print("\n[OK] Models saved to ../data/models/")
    print("[OK] Metadata saved to ../data/models/model_metadata.json")


if __name__ == "__main__":
    main()
