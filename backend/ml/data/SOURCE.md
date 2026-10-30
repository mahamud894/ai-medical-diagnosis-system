# Dataset source

Files: `Training.csv`, `Testing.csv`, `symptom_Description.csv`

- Original dataset: **Disease Prediction Using Machine Learning** — Kaggle, by kaushil268
  (https://www.kaggle.com/datasets/kaushil268/disease-prediction-using-machine-learning).
  4,920 training rows, 41 conditions, 132 binary symptom columns.
- `symptom_Description.csv` comes from the companion **Disease Symptom Prediction** dataset (Kaggle, itachi9604).
- Copies used here were taken from the public GitHub repository `yash-naikk/HEALTH-CARE-CHATBOT`.

The files are kept unchanged. Typos in symptom and condition names (e.g. "Peptic ulcer diseae",
"spotting_ urination") are cleaned in `ml/train.js`, not in the CSVs.

## Limitations (mention these in the project report / viva)
- The data is small and very regular (every condition has 120 near-identical rows), so accuracy on
  complete symptom lists is unrealistically high. Real patients report fewer, noisier symptoms.
- It covers only 41 conditions. Anything else will be mapped to the "closest" of these 41.
- No age, sex, duration, severity or test results are used.
- **Not clinically validated. Educational use only.**
