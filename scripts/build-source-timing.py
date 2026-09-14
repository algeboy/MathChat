"""Build publication-date comparisons without inventing precise dates.

Uses the ledger's publication date/range, narrowed by a dated URL only when
consistent with that range. URL-derived dates remain explicitly labeled.
"""
import calendar
import json
import csv
import re
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CUTOFFS = json.loads((ROOT/'data/source-timing-cutoffs.json').read_text())
SUMMER = date.fromisoformat(CUTOFFS['summer_start'])
ANNOUNCEMENT = date.fromisoformat(CUTOFFS['announcement_date'])

def bounds(value):
    if re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        d = date.fromisoformat(value)
        return d, d
    if re.fullmatch(r'\d{4}-\d{2}', value):
        y, m = map(int, value.split('-'))
        return date(y, m, 1), date(y, m, calendar.monthrange(y, m)[1])
    if re.fullmatch(r'\d{4}', value):
        return date(int(value), 1, 1), date(int(value), 12, 31)
    if re.fullmatch(r'\d{4}-\d{4}', value):
        a, b = map(int, value.split('-'))
        return date(a, 1, 1), date(b, 12, 31)
    raise ValueError('Unrecognized publication date: ' + value)

def classify(lo, hi, cutoff):
    if hi < cutoff:
        return 'before'
    if lo >= cutoff:
        return 'on_or_after'
    return 'uncertain'

def timing(row):
    published = row['published']
    lo, hi = bounds(published)
    display, basis = published, 'Source ledger publication field'
    # Do not narrow a collection spanning multiple years from an archive URL.
    if len(published) == 4:
        path = urlparse(row['url']).path
        pattern = r'(?<!\d)(20\d{2})(?:[-/](\d{2})(?:[-/](\d{2}))?|(\d{2})(\d{2}))(?!\d)'
        match = re.search(pattern, path)
        if match:
            y, m, d, compact_m, compact_d = match.groups()
            candidate = f'{y}-{m or compact_m}' + (f'-{d or compact_d}' if d or compact_d else '')
            try:
                start, end = bounds(candidate)
                if lo <= start <= end <= hi:
                    lo, hi, display, basis = start, end, candidate, 'Date inferred from source URL path; not independently verified'
            except ValueError:
                pass
    return dict(id=row['id'], published=published, date_display=display,
                earliest=lo.isoformat(), latest=hi.isoformat(),
                before_summer=classify(lo, hi, SUMMER),
                before_announcement=classify(lo, hi, ANNOUNCEMENT),
                date_basis=basis, source_url=row['url'])

def main():
    with (ROOT/'data/source-ledger.csv').open() as f:
        rows = [timing(row) for row in csv.DictReader(f)]
    with (ROOT/'data/source-timing.csv').open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader(); writer.writerows(rows)
    for key in ('before_summer', 'before_announcement'):
        print(key, {status: sum(r[key] == status for r in rows) for status in ('before', 'on_or_after', 'uncertain')})

if __name__ == '__main__':
    main()
