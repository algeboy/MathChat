"""Turn a submission issue from the site's scoring tool into a source record.

The tool opens a GitHub issue with a fixed layout. This reads that body and
writes the JSON that scripts/add-source.py accepts, so an approved submission
does not have to be retyped:

    gh issue view 42 --json body -q .body | python3 scripts/issue-to-source.py > new.json
    python3 scripts/add-source.py --json new.json   # review the JSON first
    python3 scripts/sync-site.py

Scores in the issue come from the site's language-cue heuristic. They are a
starting point for review, never a final assessment, so review_status stays
provisional and the reviewer is expected to edit the JSON before applying it.
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mathchat


def field(body, label):
    m = re.search(rf'^{re.escape(label)}:\s*(.+)$', body, re.MULTILINE)
    return m.group(1).strip() if m else ''


def parse(body):
    scores = re.search(r'Scores:\s*outlook\s*(\d+),\s*evidence\s*(\d+),\s*reliability\s*(\d+)', body)
    if not scores:
        raise SystemExit('No "Scores: outlook N, evidence N, reliability N" line found in the issue body.')
    title = field(body, 'Title') or 'Untitled source'
    url = field(body, 'arXiv') or field(body, 'YouTube') or field(body, 'Source URL')
    if not url:
        raise SystemExit('No source URL found (expected an arXiv, YouTube, or Source URL line).')

    authors = field(body, 'Authors')
    submitter = field(body, 'Submitter')
    channel = field(body, 'Channel')
    author = next((a for a in [authors.split(';')[0].strip(), channel, submitter] if a and a != 'not listed'), 'Unknown')
    author = re.sub(r'\s*\(.*?\)\s*$', '', author).strip()

    excerpt = ''
    m = re.search(r'^Excerpt:\s*\n(.+)\Z', body, re.MULTILINE | re.DOTALL)
    if m:
        excerpt = ' '.join(m.group(1).split())[:280]

    record = {
        'author_or_source': author,
        'title': title,
        'url': url,
        # The tool does not collect a publication date; a reviewer must set it.
        'published': field(body, 'Published') or '',
        'scope': '',
        'source_type': 'arXiv paper' if 'arxiv.org' in url else 'video' if 'youtube' in url else 'website',
        'notes': f'Submitted through the site scoring tool by {submitter or "an anonymous submitter"}. '
                 f'Scores are provisional heuristic estimates pending review.',
        'outlook': int(scores.group(1)),
        'evidence': int(scores.group(2)),
        'reliability': int(scores.group(3)),
        'rationale': excerpt or 'Pending review.',
        # A reviewer must choose these; the tool cannot know them.
        'category': '',
        'openness': '',
        'map_category': '',
        'short_label': author.split()[-1] if author != 'Unknown' else '',
        'classification_note': 'Pending review.',
        'coverage_basis': 'Not yet coded in the current review.',
        'review_basis': 'Not yet coded in the current review.',
    }
    record['id'] = mathchat.unique_id(mathchat.slug(author if author != 'Unknown' else title), set(mathchat.ids()))
    return record


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('body', nargs='?', type=Path, help='file holding the issue body (default: stdin)')
    args = ap.parse_args()
    body = args.body.read_text() if args.body else sys.stdin.read()
    record = parse(body)
    print(json.dumps(record, indent=2))
    blank = [k for k in ('published', 'category', 'openness', 'map_category') if not record[k]]
    if blank:
        print(f'\nReviewer must fill in before applying: {", ".join(blank)}', file=sys.stderr)
        print(f'Allowed category: {mathchat.CATEGORIES}', file=sys.stderr)
        print(f'Allowed map_category: {list(mathchat.MAP_CATEGORIES)}', file=sys.stderr)


if __name__ == '__main__':
    main()
