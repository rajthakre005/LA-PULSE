"""
LA-PULSE Model Evaluation Script
Evaluates trained models on unseen test data and generates evaluation reports.
STRICT TRAIN/TEST SEPARATION: Uses ONLY test_data.csv (200 projects).
Training data is NEVER used during evaluation.
"""

import json
import pickle
import pandas as pd
import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    mean_absolute_error, mean_squared_error, r2_score,
    classification_report, confusion_matrix, roc_auc_score
)

FEATURE_COLS = [
    "land_area", "affected_families", "num_parcels", "num_villages",
    "notification_pct", "survey_pct", "verification_pct", "objection_pct",
    "award_pct", "compensation_pct", "rr_pct", "possession_pct",
    "overall_completion", "legal_disputes", "comp_total", "comp_paid",
    "comp_pending", "avg_response_days", "approval_delay",
    "docs_total", "docs_pending", "doc_anomalies", "velocity_change",
    "project_value",
]

TEST_DATA_PATH = "d:/LA-PULSE/data/test_data.csv"
MODELS_DIR = "d:/LA-PULSE/data/models"
EXPECTED_TEST_SAMPLES = 200


def load_test_data():
    """Load ONLY test data. Never load training data."""
    df = pd.read_csv(TEST_DATA_PATH)
    
    # Data integrity check
    assert len(df) == EXPECTED_TEST_SAMPLES, f"Expected {EXPECTED_TEST_SAMPLES} test samples, got {len(df)}"
    assert all(col in df.columns for col in FEATURE_COLS), "Missing required feature columns"
    
    print(f"Loaded {len(df)} test records from {TEST_DATA_PATH}")
    return df


def load_models():
    """Load trained models."""
    with open(f"{MODELS_DIR}/delay_classifier.pkl", "rb") as f:
        clf = pickle.load(f)
    with open(f"{MODELS_DIR}/delay_regressor.pkl", "rb") as f:
        reg = pickle.load(f)
    with open(f"{MODELS_DIR}/risk_regressor.pkl", "rb") as f:
        risk_reg = pickle.load(f)
    with open(f"{MODELS_DIR}/model_metadata.json", "r") as f:
        metadata = json.load(f)
    print("[OK] Models loaded successfully")
    return clf, reg, risk_reg, metadata


def test_classifier(model, test_df):
    """Test classifier on test data."""
    X = test_df[FEATURE_COLS].values
    y_true = test_df["is_delayed"].values
    
    y_pred = model.predict(X)
    y_prob = model.predict_proba(X)[:, 1]
    
    metrics = {
        "accuracy": round(accuracy_score(y_true, y_pred), 4),
        "precision": round(precision_score(y_true, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_true, y_pred, zero_division=0), 4),
        "f1": round(f1_score(y_true, y_pred, zero_division=0), 4),
        "auc": round(roc_auc_score(y_true, y_prob), 4),
    }
    
    cm = confusion_matrix(y_true, y_pred).tolist()
    
    print("\n=== Delay Classifier Test Results ===")
    for k, v in metrics.items():
        print(f"  {k}: {v}")
    print(f"Confusion Matrix:")
    print(f"  TN: {cm[0][0]}, FP: {cm[0][1]}")
    print(f"  FN: {cm[1][0]}, TP: {cm[1][1]}")
    
    return metrics, cm


def test_regressor(model, test_df):
    """Test regressor on test data."""
    X = test_df[FEATURE_COLS].values
    y_true = test_df["delay_days"].values
    
    y_pred = model.predict(X)
    
    metrics = {
        "mae": round(mean_absolute_error(y_true, y_pred), 2),
        "rmse": round(np.sqrt(mean_squared_error(y_true, y_pred)), 2),
        "r2": round(r2_score(y_true, y_pred), 4),
    }
    
    print("\n=== Delay Regressor Test Results ===")
    for k, v in metrics.items():
        print(f"  {k}: {v}")
    
    return metrics


def test_risk_regressor(model, test_df):
    """Test risk regressor on test data."""
    X = test_df[FEATURE_COLS].values
    y_true = test_df["risk_score"].values
    
    y_pred = model.predict(X)
    
    metrics = {
        "mae": round(mean_absolute_error(y_true, y_pred), 2),
        "rmse": round(np.sqrt(mean_squared_error(y_true, y_pred)), 2),
        "r2": round(r2_score(y_true, y_pred), 4),
    }
    
    print("\n=== Risk Regressor Test Results ===")
    for k, v in metrics.items():
        print(f"  {k}: {v}")
    
    return metrics


def generate_evaluation_report(clf_metrics, clf_cm, reg_metrics, risk_metrics, metadata, test_df):
    """Generate comprehensive evaluation report."""
    report = {
        "evaluation_timestamp": pd.Timestamp.now().isoformat(),
        "model_version": metadata.get("model_version", "unknown"),
        "test_samples": len(test_df),
        "test_results": {
            "classifier": clf_metrics,
            "classifier_confusion_matrix": clf_cm,
            "delay_regressor": reg_metrics,
            "risk_regressor": risk_metrics,
        },
        "training_metrics": {
            "classifier": metadata.get("classifier_metrics", {}),
            "delay_regressor": metadata.get("regressor_metrics", {}),
            "risk_regressor": metadata.get("risk_metrics", {}),
        },
        "performance_comparison": {
            "classifier_f1_diff": round(clf_metrics["f1"] - metadata.get("classifier_metrics", {}).get("f1", 0), 4),
            "classifier_accuracy_diff": round(clf_metrics["accuracy"] - metadata.get("classifier_metrics", {}).get("accuracy", 0), 4),
            "regressor_mae_diff": round(reg_metrics["mae"] - metadata.get("regressor_metrics", {}).get("mae", 0), 2),
            "risk_mae_diff": round(risk_metrics["mae"] - metadata.get("risk_metrics", {}).get("mae", 0), 2),
        },
        "data_split": {
            "training_samples": metadata.get("training_samples", 0),
            "test_samples": len(test_df),
            "total_samples": metadata.get("training_samples", 0) + len(test_df),
        }
    }
    
    return report


def main():
    print("=== LA-PULSE Model Evaluation on Test Data ===")
    print(f"STRICT TRAIN/TEST SEPARATION")
    print(f"Test data: {TEST_DATA_PATH}")
    print(f"Expected test samples: {EXPECTED_TEST_SAMPLES}")
    print(f"Training data is NEVER used during evaluation\n")
    
    # Load test data
    test_df = load_test_data()
    
    # Load trained models
    clf, reg, risk_reg, metadata = load_models()
    
    # Test all models
    clf_metrics, clf_cm = test_classifier(clf, test_df)
    reg_metrics = test_regressor(reg, test_df)
    risk_metrics = test_risk_regressor(risk_reg, test_df)
    
    # Generate evaluation report
    report = generate_evaluation_report(clf_metrics, clf_cm, reg_metrics, risk_metrics, metadata, test_df)
    
    # Save evaluation report
    with open(f"{MODELS_DIR}/evaluation_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n[OK] Evaluation report saved to {MODELS_DIR}/evaluation_report.json")
    
    # Print summary
    print("\n=== Performance Comparison (Test vs Training) ===")
    print(f"Classifier F1 Change: {report['performance_comparison']['classifier_f1_diff']:+.4f}")
    print(f"Classifier Accuracy Change: {report['performance_comparison']['classifier_accuracy_diff']:+.4f}")
    print(f"Regressor MAE Change: {report['performance_comparison']['regressor_mae_diff']:+.2f}")
    print(f"Risk MAE Change: {report['performance_comparison']['risk_mae_diff']:+.2f}")
    
    print("\n=== Data Split Summary ===")
    print(f"Training samples: {report['data_split']['training_samples']}")
    print(f"Test samples: {report['data_split']['test_samples']}")
    print(f"Total samples: {report['data_split']['total_samples']}")
    
    print(f"\n=== Evaluation Complete ===")
    print(f"Test predictions: {len(test_df)}")
    print(f"Test data was NEVER used during training")


if __name__ == "__main__":
    main()
