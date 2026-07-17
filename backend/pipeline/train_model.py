import os
import pickle

import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

TRAINING_DATA_PATH = 'backend/data/training/training_data.csv'
MODEL_DIR = 'backend/model'
MODEL_PATH = os.path.join(MODEL_DIR, 'possession_model.pkl')
SCALER_PATH = os.path.join(MODEL_DIR, 'scaler.pkl')

# offensive_rating and offensive_usg_pct are deliberately excluded: they're
# highly collinear with offensive_pts (rating is itself partly built from pts/
# ts_pct/usg_pct), which let the model assign an unstable, sign-flipped
# coefficient to rating on the minority 3PT Make class.
FEATURE_COLUMNS = [
    'offensive_pts',
    'offensive_ts_pct',
    'shot_distance',
    'shot_quality_distance'
]
LABEL_COLUMN = 'outcome'


def main():
    print("=== Training Possession Outcome Model ===\n")

    data = pd.read_csv(TRAINING_DATA_PATH)
    print(f"Loaded {len(data)} rows\n")

    # Interaction term: lets the model learn that shooting efficiency's effect
    # on scoring changes with distance, instead of treating them as independent.
    data['shot_quality_distance'] = data['offensive_ts_pct'] * data['shot_distance']

    X = data[FEATURE_COLUMNS]
    y = data[LABEL_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # lbfgs is the default solver and already fits a multinomial (softmax) model
    # for multi-class problems; the multi_class param was removed in newer sklearn.
    # A partial class_weight boosts the minority 3PT Make class without fully
    # equalizing it like class_weight='balanced' does (which overcorrected and
    # made the model over-predict 3PT Make at the expense of Miss recall).
    model = LogisticRegression(max_iter=1000, class_weight={1: 1, 2: 1, 3: 2})
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)

    accuracy = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {accuracy:.4f}\n")

    print("Classification report:")
    print(classification_report(y_test, y_pred))

    os.makedirs(MODEL_DIR, exist_ok=True)

    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)

    with open(SCALER_PATH, 'wb') as f:
        pickle.dump(scaler, f)

    print(f"Saved model to {MODEL_PATH}")
    print(f"Saved scaler to {SCALER_PATH}")


if __name__ == '__main__':
    main()
