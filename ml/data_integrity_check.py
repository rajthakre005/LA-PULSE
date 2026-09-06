"""
Data Integrity Checks for LA-PULSE ML Pipeline
Validates strict 817/200 train/test separation.
"""

import pandas as pd
import json

TRAINING_DATA_PATH = "d:/LA-PULSE/data/training_data.csv"
TEST_DATA_PATH = "d:/LA-PULSE/data/test_data.csv"
PROJECTS_JSON_PATH = "d:/LA-PULSE/data/projects.json"

EXPECTED_TRAINING_SAMPLES = 817
EXPECTED_TEST_SAMPLES = 200
EXPECTED_TOTAL = 1017

FEATURE_COLS = [
    "land_area", "affected_families", "num_parcels", "num_villages",
    "notification_pct", "survey_pct", "verification_pct", "objection_pct",
    "award_pct", "compensation_pct", "rr_pct", "possession_pct",
    "overall_completion", "legal_disputes", "comp_total", "comp_paid",
    "comp_pending", "avg_response_days", "approval_delay",
    "docs_total", "docs_pending", "doc_anomalies", "velocity_change",
    "project_value",
]


def check_data_integrity():
    """Run all data integrity checks."""
    print("=== LA-PULSE Data Integrity Checks ===\n")
    
    all_passed = True
    
    # Load data
    train_df = pd.read_csv(TRAINING_DATA_PATH)
    test_df = pd.read_csv(TEST_DATA_PATH)
    
    with open(PROJECTS_JSON_PATH, 'r') as f:
        projects = json.load(f)
    
    # Check 1: Training count
    train_count = len(train_df)
    if train_count == EXPECTED_TRAINING_SAMPLES:
        print(f"✓ Training count: {train_count} (expected {EXPECTED_TRAINING_SAMPLES})")
    else:
        print(f"✗ Training count: {train_count} (expected {EXPECTED_TRAINING_SAMPLES})")
        all_passed = False
    
    # Check 2: Test count
    test_count = len(test_df)
    if test_count == EXPECTED_TEST_SAMPLES:
        print(f"✓ Test count: {test_count} (expected {EXPECTED_TEST_SAMPLES})")
    else:
        print(f"✗ Test count: {test_count} (expected {EXPECTED_TEST_SAMPLES})")
        all_passed = False
    
    # Check 3: Total count
    total = train_count + test_count
    if total == EXPECTED_TOTAL:
        print(f"✓ Total count: {total} (expected {EXPECTED_TOTAL})")
    else:
        print(f"✗ Total count: {total} (expected {EXPECTED_TOTAL})")
        all_passed = False
    
    # Check 4: No duplicate project IDs across train/test
    train_ids = set(train_df['project_id'])
    test_ids = set(test_df['project_id'])
    overlap = train_ids & test_ids
    if len(overlap) == 0:
        print(f"✓ No ID overlap between train and test")
    else:
        print(f"✗ ID overlap found: {len(overlap)} projects")
        print(f"  Overlapping IDs: {list(overlap)[:5]}")
        all_passed = False
    
    # Check 5: Test IDs start with TEST-
    test_prefix_ok = all(str(id).startswith('TEST-') for id in test_ids)
    if test_prefix_ok:
        print(f"✓ All test IDs start with TEST-")
    else:
        print(f"✗ Some test IDs don't start with TEST-")
        all_passed = False
    
    # Check 6: Training IDs start with LA-
    train_prefix_ok = all(str(id).startswith('LA-') for id in train_ids)
    if train_prefix_ok:
        print(f"✓ All training IDs start with LA-")
    else:
        print(f"✗ Some training IDs don't start with LA-")
        all_passed = False
    
    # Check 7: All FEATURE_COLS exist in training data
    missing_train_features = set(FEATURE_COLS) - set(train_df.columns)
    if len(missing_train_features) == 0:
        print(f"✓ All {len(FEATURE_COLS)} feature columns exist in training data")
    else:
        print(f"✗ Missing features in training data: {missing_train_features}")
        all_passed = False
    
    # Check 8: All FEATURE_COLS exist in test data
    missing_test_features = set(FEATURE_COLS) - set(test_df.columns)
    if len(missing_test_features) == 0:
        print(f"✓ All {len(FEATURE_COLS)} feature columns exist in test data")
    else:
        print(f"✗ Missing features in test data: {missing_test_features}")
        all_passed = False
    
    # Check 9: projects.json count
    projects_count = len(projects)
    if projects_count == EXPECTED_TOTAL:
        print(f"✓ projects.json count: {projects_count} (expected {EXPECTED_TOTAL})")
    else:
        print(f"✗ projects.json count: {projects_count} (expected {EXPECTED_TOTAL})")
        all_passed = False
    
    # Check 10: No target columns used as features
    target_cols = ['is_delayed', 'delay_days', 'risk_score', 'delay_probability']
    target_in_features = set(FEATURE_COLS) & set(target_cols)
    if len(target_in_features) == 0:
        print(f"✓ No target columns used as features")
    else:
        print(f"✗ Target columns found in features: {target_in_features}")
        all_passed = False
    
    print(f"\n{'='*50}")
    if all_passed:
        print("✓ ALL DATA INTEGRITY CHECKS PASSED")
    else:
        print("✗ SOME DATA INTEGRITY CHECKS FAILED")
    print(f"{'='*50}")
    
    return all_passed


if __name__ == "__main__":
    check_data_integrity()
