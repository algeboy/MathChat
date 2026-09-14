"""Accept a source submission from a GitHub issue, in one command.

    python3 scripts/accept-submission.py 2

Fetches the issue, parses it, asks for the few fields a submission cannot carry,
writes the source into every ledger file, rebuilds the charts and syncs the site.
It says plainly at the end whether the source was added, and it stops on the
first problem rather than letting a later step report success.

Answer the prompts, or supply them and skip the prompting:

    python3 scripts/accept-submission.py 2 --published 2026 --category Educator \\
        --openness 35 --map-category governance

Nothing is pushed. Commit both repositories when you are happy with the result.
"""
import argparse
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import mathchat


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), HERE / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def fail(message):
    sys.stdout.flush()          # keep the reason under the context it refers to
    print(f'\nNOT ADDED: {message}', file=sys.stderr)
    sys.stderr.flush()
    raise SystemExit(1)


def ask(prompt, default='', allowed=None):
    """Prompt, showing what is allowed. Refuses an answer outside the list."""
    while True:
        suffix = f' [{default}]' if default else ''
        try:
            answer = input(f'  {prompt}{suffix}: ').strip()
        except EOFError:
            fail('no answer given, and this is not an interactive terminal. '
                 'Pass the values as options instead; see --help.')
        answer = answer or default
        if not answer:
            print('    This one is required.')
            continue
        if allowed and answer not in allowed:
            print(f'    Must be one of: {", ".join(allowed)}')
            continue
        return answer


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('issue', help='issue number, or a file holding the issue body')
    ap.add_argument('--repo', default='algeboy/MathChat')
    ap.add_argument('--published'); ap.add_argument('--category'); ap.add_argument('--openness')
    ap.add_argument('--map-category'); ap.add_argument('--author'); ap.add_argument('--short-label')
    ap.add_argument('--id'); ap.add_argument('--outlook'); ap.add_argument('--evidence'); ap.add_argument('--reliability')
    ap.add_argument('--scope', default='')
    ap.add_argument('--dry-run', action='store_true', help='show what would be written, change nothing')
    args = ap.parse_args()

    # 1. Get the issue body.
    if Path(args.issue).exists():
        body = Path(args.issue).read_text()
        where = args.issue
    else:
        got = subprocess.run(['gh', 'issue', 'view', args.issue, '--repo', args.repo, '--json', 'body', '-q', '.body'],
                             capture_output=True, text=True)
        if got.returncode != 0:
            fail(f'could not read issue {args.issue} from {args.repo}: {got.stderr.strip()}')
        body, where = got.stdout, f'{args.repo}#{args.issue}'
    print(f'Reading {where}')

    # 2. Parse it.
    parser = load('issue-to-source')
    try:
        record = parser.parse(body)
    except SystemExit as e:
        fail(f'this issue is not a submission from the scoring tool ({e})')

    print(f'\n  Title   {record["title"]}')
    print(f'  URL     {record["url"]}')
    print(f'  Scores  outlook {record["outlook"]}, evidence {record["evidence"]}, reliability {record["reliability"]}')
    print('          These are heuristic. Against the reviewed sources they typically land')
    print('          17 points from the reviewed outlook, 16 from evidence, 11 from reliability.')

    existing = set(mathchat.ids())
    if record['id'] in existing:
        record['id'] = mathchat.unique_id(record['id'], existing)

    # 3. Fill what the submission cannot carry.
    supplied = dict(published=args.published, category=args.category, openness=args.openness,
                    map_category=args.map_category, author_or_source=args.author,
                    short_label=args.short_label, id=args.id, outlook=args.outlook,
                    evidence=args.evidence, reliability=args.reliability)
    for key, value in supplied.items():
        if value:
            record[key] = value
    if args.scope:
        record['scope'] = args.scope

    interactive = sys.stdin.isatty()
    needed = [k for k in ('published', 'category', 'openness', 'map_category') if not str(record.get(k, '')).strip()]
    if needed and not interactive:
        fail('these still need a value: ' + ', '.join(needed) + '.\n'
             '  Re-run with them as options, for example:\n'
             f'    python3 scripts/accept-submission.py {args.issue} --published 2026 '
             '--category Educator --openness 50 --map-category research')
    if needed:
        print('\nA few things a submission cannot know. Press Enter to accept a default.')
        if 'published' in needed:
            record['published'] = ask('published (2026, 2026-05, or 2026-05-14)')
        if 'category' in needed:
            record['category'] = ask('category', allowed=mathchat.CATEGORIES)
        if 'openness' in needed:
            record['openness'] = ask('openness to AI use, 0 rejects and 100 embraces')
        if 'map_category' in needed:
            record['map_category'] = ask('colour group on the map', allowed=list(mathchat.MAP_CATEGORIES))
        record['author_or_source'] = ask('author or source shown on the map', record['author_or_source'])
        record['short_label'] = ask('short label beside the marker', record['short_label'])
        record['id'] = ask('id used in the data files', record['id'])
        record['scope'] = ask('scope', record.get('scope') or 'research mathematics')

    taken = {r['short_label'] for r in mathchat.read('source-ledger.csv') if r['id'] != record['id']}
    if record['short_label'] in taken:
        fail(f'the short label {record["short_label"]!r} is already used by another source. '
             'Re-run with a different --short-label.')

    if args.dry_run:
        print('\n--dry-run, nothing written. The record would be:\n')
        print(json.dumps(record, indent=2))
        return 0

    # 4. Write, rebuild and sync, stopping at the first problem.
    before = len(mathchat.ids())
    adder = load('add-source')
    try:
        adder.apply(record, replace=False)
    except SystemExit as e:
        fail(str(e))
    after = len(mathchat.ids())
    if after != before + 1:
        fail(f'the ledger went from {before} to {after} sources, which is not what adding one looks like')

    if sync_site_run() != 0:
        fail('the source was written to data/, but syncing the site failed. '
             'Fix that and re-run: python3 scripts/sync-site.py')

    print(f'\nADDED: {record["id"]} — the map now has {after} sources.')
    print('Not published yet. Commit and push both repositories:')
    print(f'    git -C {mathchat.ROOT} add -A && git -C {mathchat.ROOT} commit -m "Add {record["id"]} from submission" && git -C {mathchat.ROOT} push')
    site = mathchat.ROOT.parent / 'algeboy.github.io'
    print(f'    git -C {site} add -A && git -C {site} commit -m "Add {record["id"]} to the map" && git -C {site} push')
    print(f'\nThen close the issue:  gh issue close {args.issue} --repo {args.repo}')
    return 0


def sync_site_run():
    """Run the sync exactly as the command line would, and return its exit code."""
    result = subprocess.run([sys.executable, str(HERE / 'sync-site.py')], text=True)
    return result.returncode


if __name__ == '__main__':
    raise SystemExit(main())
