"""Measure the automatic scorer against the reviewed scores, and emit its offsets.

The scorer and the review are two different instruments. Before calibration the
scorer sat about 26 points below the review on evidence and reliability, so a
newly submitted source looked far more speculative and far less reliable than
comparable reviewed sources purely because of the scale.

data/auto-scores.csv holds what the tool produces TODAY, calibration included,
because scripts/score-sources.js runs the shipped formula. This compares it with
data/assessments.csv and prints any REMAINING offset, which should be near zero
while the tool is calibrated. Add a reported offset to the existing CALIBRATION
constant rather than replacing it.

    node scripts/score-sources.js
    python3 scripts/calibrate.py
"""
import csv
import statistics as st
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mathchat

AXES = [('outlook', 'auto_outlook', 'outlook_0_anxious_100_hopeful'),
        ('evidence', 'auto_evidence', 'evidence_0_speculative_100_data_supported'),
        ('reliability', 'auto_reliability', 'reliability_0_lower_100_higher')]


def correlation(a, b):
    if st.pstdev(a) == 0 or st.pstdev(b) == 0:
        return 0.0
    ma, mb = st.mean(a), st.mean(b)
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (len(a) * st.pstdev(a) * st.pstdev(b))


def main():
    auto_path = mathchat.DATA / 'auto-scores.csv'
    if not auto_path.exists():
        raise SystemExit('data/auto-scores.csv is missing. Run: node scripts/score-sources.js')
    auto = {r['id']: r for r in csv.DictReader(auto_path.open())}
    reviewed = {r['id']: r for r in mathchat.read('assessments.csv')}
    shared = [i for i in auto if i in reviewed]
    print(f'{len(shared)} sources scored both automatically and by review\n')

    clamp = lambda v: max(0, min(100, round(v)))
    print(f"{'axis':13}{'offset':>8}{'r':>7}{'MAE raw':>9}{'MAE cal':>9}{'reviewed sd':>13}{'scorer sd':>11}")
    offsets = {}
    for name, auto_key, review_key in AXES:
        a = [int(auto[i][auto_key]) for i in shared]
        h = [int(reviewed[i][review_key]) for i in shared]
        offset = st.mean(h) - st.mean(a)
        offsets[name] = round(offset)
        calibrated = [clamp(x + offset) for x in a]
        mae = lambda p: st.mean(abs(x - y) for x, y in zip(p, h))
        print(f'{name:13}{offset:+8.1f}{correlation(a, h):+7.2f}{mae(a):9.1f}{mae(calibrated):9.1f}'
              f'{st.pstdev(h):13.1f}{st.pstdev(a):11.1f}')

    drifted = [k for k, v in offsets.items() if abs(v) >= 3]
    if drifted:
        print('\nAdd these to the existing CALIBRATION constants in the source tool:')
        print('  outlook %+d, evidence %+d, reliability %+d'
              % (offsets['outlook'], offsets['evidence'], offsets['reliability']))
        print(f'  (drifted: {", ".join(drifted)})')
    else:
        print('\nThe tool is on the reviewed baseline; no change to CALIBRATION is needed.')
    print('\nTypical gap from a reviewed score, after calibration:')
    for name, auto_key, review_key in AXES:
        a = [int(auto[i][auto_key]) for i in shared]
        h = [int(reviewed[i][review_key]) for i in shared]
        cal = [clamp(x + offsets[name]) for x in a]
        print(f'  {name:13} {st.mean(abs(x - y) for x, y in zip(cal, h)):.0f} points')
    print('\nCalibration aligns the baseline. It does not make the two instruments agree:\n'
          'the correlations above are near zero, so an automatic score is a starting\n'
          'point for review, never a substitute for one.')


if __name__ == '__main__':
    main()
