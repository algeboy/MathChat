"""Shared helpers for the MathChat data files.

The six CSVs under data/ are keyed by the same `id`. Every source must appear in
all of them, so they are read and written together rather than one at a time.
"""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'

# Each ledger file, with the columns it must carry for every source.
FILES = {
    'source-ledger.csv': ['id', 'author_or_source', 'title', 'url', 'published', 'scope', 'source_type', 'notes', 'map_category', 'short_label', 'main_contribution'],
    'assessments.csv': ['id', 'outlook_0_anxious_100_hopeful', 'evidence_0_speculative_100_data_supported',
                        'reliability_0_lower_100_higher', 'rationale', 'review_status'],
    'openness-by-category.csv': ['id', 'category', 'openness_to_ai_use_0_reject_100_embrace',
                                 'classification_note', 'review_status'],
    'concern-coverage.csv': ['id', 'education', 'research_mathematics', 'jobs_in_mathematics', 'coverage_basis'],
    'source-topics.csv': ['id', 'call_to_action', 'action_summary', 'jobs_careers', 'career_summary',
                          'basis_url', 'review_basis'],
}
# Rebuilt by scripts/build-source-timing.py, so it is never edited by hand.
GENERATED = {'source-timing.csv'}

CATEGORIES = ['Educator', 'Journalist', 'AI industry', 'Governance', 'Broad-AI baseline']
# Colour groups on the viewpoint map, in legend order.
MAP_CATEGORIES = {
    'research': ('Research mathematics', '#66c5b9'),
    'education': ('Mathematics education', '#f3bb4d'),
    'governance': ('Governance', '#d981b2'),
    'baseline': ('Broad-AI baseline', '#9b8fe7'),
    'media': ('Math/science journalism &amp; podcasts', 'var(--chalk-white)'),
}
SCORE_FIELDS = {
    'assessments.csv': ['outlook_0_anxious_100_hopeful', 'evidence_0_speculative_100_data_supported',
                        'reliability_0_lower_100_higher'],
    'openness-by-category.csv': ['openness_to_ai_use_0_reject_100_embrace'],
}


def read(name):
    with (DATA / name).open(newline='') as handle:
        return list(csv.DictReader(handle))


def write(name, rows):
    """Write rows in the file's declared column order, sorted by id."""
    fields = FILES[name] if name in FILES else list(rows[0].keys())
    path = DATA / name
    with path.open('w', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in sorted(rows, key=lambda r: r['id']):
            writer.writerow({f: row.get(f, '') for f in fields})


def ids(name='source-ledger.csv'):
    return [row['id'] for row in read(name)]


def slug(value):
    """A short, stable id from an author or title."""
    text = re.sub(r'[^a-z0-9]+', '', (value or '').lower())
    return text[:20] or 'source'


def unique_id(base, taken):
    if base not in taken:
        return base
    n = 2
    while f'{base}{n}' in taken:
        n += 1
    return f'{base}{n}'


def check():
    """Report every inconsistency across the ledger files."""
    problems = []
    ledger = {row['id'] for row in read('source-ledger.csv')}
    if not ledger:
        problems.append('source-ledger.csv is empty')
    for name in FILES:
        rows = read(name)
        seen = [r['id'] for r in rows]
        for duplicate in {i for i in seen if seen.count(i) > 1}:
            problems.append(f'{name}: duplicate id {duplicate}')
        here = set(seen)
        for missing in sorted(ledger - here):
            problems.append(f'{name}: missing id {missing}')
        for extra in sorted(here - ledger):
            problems.append(f'{name}: id {extra} is not in source-ledger.csv')
        for field in SCORE_FIELDS.get(name, []):
            for row in rows:
                value = (row.get(field) or '').strip()
                if not value.isdigit() or not 0 <= int(value) <= 100:
                    problems.append(f"{name}: {row['id']}.{field} is {value!r}, expected 0-100")
    for row in read('source-ledger.csv'):
        if not re.match(r'^https?://', row.get('url', '')):
            problems.append(f"source-ledger.csv: {row['id']} has no http(s) url")
        if not re.fullmatch(r'\d{4}(-\d{2}(-\d{2})?|-\d{4})?', row.get('published', '')):
            problems.append(f"source-ledger.csv: {row['id']} published {row.get('published')!r} is not a known date shape")
    for row in read('openness-by-category.csv'):
        if row.get('category') not in CATEGORIES:
            problems.append(f"openness-by-category.csv: {row['id']} category {row.get('category')!r} not in {CATEGORIES}")
    return problems


def cutoffs():
    return json.loads((DATA / 'source-timing-cutoffs.json').read_text())
