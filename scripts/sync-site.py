"""Publish the MathChat data to the Jekyll site in one step.

Adding a source used to mean editing CSVs, recomputing chart coordinates by
hand, and copying four files into the site repository. This does all of it:

    python3 scripts/sync-site.py            # regenerate and copy
    python3 scripts/sync-site.py --check    # verify only, change nothing

Run it after scripts/add-source.py, then commit both repositories.
"""
import argparse
import importlib.util
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import mathchat

DEFAULT_SITE = mathchat.ROOT.parent / 'algeboy.github.io'

# Canonical data file -> where the site reads it from.
COPIES = {
    'source-ledger.csv': ['_data/mathchat_sources.csv'],
    'source-topics.csv': ['_data/mathchat_source_topics.csv', 'assets/data/mathchat-source-topics.csv'],
    'source-timing.csv': ['_data/mathchat_source_timing.csv', 'assets/data/mathchat-source-timing.csv'],
    'source-timing-cutoffs.json': ['_data/mathchat_timing_cutoffs.json'],
}


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), HERE / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--site', type=Path, default=DEFAULT_SITE, help='path to the Jekyll site repository')
    ap.add_argument('--check', action='store_true', help='report what is out of date without writing')
    args = ap.parse_args()

    problems = mathchat.check()
    if problems:
        print('Data is inconsistent:', file=sys.stderr)
        for p in problems:
            print('  -', p, file=sys.stderr)
        return 1
    print(f'data: {len(mathchat.ids())} sources, consistent')

    if not args.site.is_dir():
        print(f'site repository not found: {args.site}', file=sys.stderr)
        return 1

    if args.check:
        stale = []
        for source, targets in COPIES.items():
            for target in targets:
                dest = args.site / target
                if not dest.exists() or dest.read_bytes() != (mathchat.DATA / source).read_bytes():
                    stale.append(target)
        print('out of date:' if stale else 'site data is up to date')
        for s in stale:
            print('  -', s)
        return 1 if stale else 0

    # Timing is derived from the ledger, so rebuild it before copying.
    load('build-source-timing').main()
    load('build-charts').main(args.site)

    for source, targets in COPIES.items():
        for target in targets:
            dest = args.site / target
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(mathchat.DATA / source, dest)
            print(f'copied {source} -> {target}')

    print('\nSite data and charts are up to date. Commit both repositories to publish.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
