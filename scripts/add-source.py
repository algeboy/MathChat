"""Add or update one source across every MathChat data file.

A source has to appear in five CSVs with the same id, so editing them by hand is
where mistakes creep in. This writes all of them at once and refuses input that
would leave the ledger inconsistent.

    python3 scripts/add-source.py --json submission.json
    python3 scripts/add-source.py --author "Jane Doe" --title "..." --url https://…
        --published 2026-05 --outlook 60 --evidence 70 --reliability 75
        --category Educator --openness 55 --map-category research

Accepts the JSON that scripts/issue-to-source.py produces from a submission
issue, so an approved submission can be applied without retyping it.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mathchat

FIELDS = ['id', 'author_or_source', 'title', 'url', 'published', 'scope', 'source_type',
          'notes', 'map_category', 'short_label', 'outlook', 'evidence', 'reliability',
          'rationale', 'category', 'openness', 'classification_note',
          'education', 'research_mathematics', 'jobs_in_mathematics', 'coverage_basis',
          'call_to_action', 'action_summary', 'jobs_careers', 'career_summary', 'review_basis']


def build(values):
    """Turn one flat record into the row each CSV expects."""
    sid = values['id']
    url = values['url']
    return {
        'source-ledger.csv': dict(
            id=sid, author_or_source=values['author_or_source'], title=values['title'], url=url,
            published=values['published'], scope=values.get('scope', ''),
            source_type=values.get('source_type', 'essay'), notes=values.get('notes', ''),
            map_category=values['map_category'], short_label=values['short_label']),
        'assessments.csv': dict(
            id=sid, outlook_0_anxious_100_hopeful=values['outlook'],
            evidence_0_speculative_100_data_supported=values['evidence'],
            reliability_0_lower_100_higher=values['reliability'],
            rationale=values.get('rationale', ''), review_status='provisional'),
        'openness-by-category.csv': dict(
            id=sid, category=values['category'],
            openness_to_ai_use_0_reject_100_embrace=values['openness'],
            classification_note=values.get('classification_note', ''), review_status='provisional'),
        'concern-coverage.csv': dict(
            id=sid, education=values.get('education', 0),
            research_mathematics=values.get('research_mathematics', 0),
            jobs_in_mathematics=values.get('jobs_in_mathematics', 0),
            coverage_basis=values.get('coverage_basis', 'Not yet coded in the current review.')),
        'source-topics.csv': dict(
            id=sid, call_to_action=values.get('call_to_action', 'not_recorded'),
            action_summary=values.get('action_summary', ''),
            jobs_careers=values.get('jobs_careers', 'not_recorded'),
            career_summary=values.get('career_summary', ''), basis_url=url,
            review_basis=values.get('review_basis', 'Not yet coded in the current review.')),
    }


def apply(values, replace=False):
    sid = values['id']
    existing = set(mathchat.ids())
    if sid in existing and not replace:
        raise SystemExit(f'id {sid!r} already exists; pass --replace to update it')
    rows_by_file = build(values)
    for name, row in rows_by_file.items():
        rows = [r for r in mathchat.read(name) if r['id'] != sid]
        rows.append(row)
        mathchat.write(name, rows)
    problems = mathchat.check()
    if problems:
        raise SystemExit('Refusing to leave the ledger inconsistent:\n  ' + '\n  '.join(problems))
    return sid


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--json', type=Path, help='record produced by issue-to-source.py')
    ap.add_argument('--replace', action='store_true', help='update a source that already exists')
    for field in FIELDS:
        ap.add_argument('--' + field.replace('_', '-'))
    args = ap.parse_args()

    values = json.loads(args.json.read_text()) if args.json else {}
    for field in FIELDS:
        supplied = getattr(args, field.replace('-', '_'), None)
        if supplied is not None:
            values[field] = supplied

    for required in ('author_or_source', 'title', 'url', 'published', 'outlook', 'evidence',
                     'reliability', 'category', 'openness'):
        if not str(values.get(required, '')).strip():
            raise SystemExit(f'missing required field: {required}')
    values.setdefault('map_category', 'research')
    if values['map_category'] not in mathchat.MAP_CATEGORIES:
        raise SystemExit(f"map_category must be one of {list(mathchat.MAP_CATEGORIES)}")
    if values['category'] not in mathchat.CATEGORIES:
        raise SystemExit(f"category must be one of {mathchat.CATEGORIES}")
    values.setdefault('short_label', values['author_or_source'].split()[-1])
    values.setdefault('id', mathchat.unique_id(mathchat.slug(values['author_or_source']), set(mathchat.ids())))

    taken = {r['short_label'] for r in mathchat.read('source-ledger.csv') if r['id'] != values['id']}
    if values['short_label'] in taken:
        raise SystemExit(f"short_label {values['short_label']!r} is already used; pass a different --short-label")

    sid = apply(values, replace=args.replace)
    print(f'{sid}: written to all ledger files')
    print('Next: python3 scripts/sync-site.py')


if __name__ == '__main__':
    main()
