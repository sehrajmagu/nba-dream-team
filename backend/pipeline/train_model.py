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

FEATURE_COLUMNS = ['offensive_rating', 'offensive_pts', 'offensive_ts_pct', 'offensive_usg_pct']
LABEL_COLUMN = 'outcome'


def main():
    print("=== Training Possession Outcome Model ===\n")

    data = pd.read_csv(TRAINING_DATA_PATH)
    print(f"Loaded {len(data)} rows\n")

    X = data[FEATURE_COLUMNS]
    y = data[LABEL_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # lbfgs is the default solver and already fits a multinomial (softmax) model
    # for multi-class problems; the multi_class param was removed in newer sklearn.
    model = LogisticRegression(max_iter=1000)
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
