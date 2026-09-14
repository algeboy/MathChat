# Updating the MathChat data

The six CSVs in `data/` are the single source of truth. The site reads copies of
them, and both charts are generated from them, so **adding a source is a
data-only edit**. Nothing in the site repository should be edited by hand.

## Adding a source

```sh
python3 scripts/add-source.py \
  --author "Jane Doe" --title "Proof assistants in the classroom" \
  --url https://example.org/essay --published 2026-05 \
  --outlook 60 --evidence 70 --reliability 75 \
  --category Educator --openness 55 --map-category education
python3 scripts/sync-site.py
```

`add-source.py` writes the new row into all five hand-maintained CSVs at once
and refuses anything that would leave them inconsistent. `sync-site.py`
rebuilds the derived data and charts, then copies everything the site needs.
Commit both repositories afterwards to publish.

## How a submission reaches you

The site's scoring tool is the only way to propose a source. It opens a prefilled
GitHub issue labelled `submission`, so blank issues must stay enabled in
`.github/ISSUE_TEMPLATE/config.yml` for that link to keep working.

When the issue is opened, `.github/workflows/submission.yml` parses it and
comments with the parsed record, the fields still needing a reviewer's choice,
and the commands to accept it. That comment is what lands in your notification
email, so the notification carries everything needed to act.

If email is not arriving, check that you are watching this repository for issues:
**Watch → Custom → Issues** on the repository page, and that
[notification settings](https://github.com/settings/notifications) send issue
email. A repository owner is watching by default, but that can be turned off.

Nothing is applied automatically. The workflow only reads the issue and comments.

## Applying a submission from the site

The scoring tool opens a GitHub issue in a fixed layout. To apply an approved
one without retyping it:

```sh
gh issue view 42 --json body -q .body > issue.txt
python3 scripts/issue-to-source.py issue.txt > new.json
# Fill in published, category, openness and map_category, and review the scores.
python3 scripts/add-source.py --json new.json
python3 scripts/sync-site.py
```

The scores in a submission come from the site's language-cue heuristic. They are
a starting point for review, never a finished assessment, so `review_status`
stays `provisional` until a reviewer edits them.

## What each script does

| Script | Purpose |
| --- | --- |
| `mathchat.py` | Shared readers, writers, and the consistency check. |
| `add-source.py` | Add or update one source across every CSV. |
| `issue-to-source.py` | Turn a submission issue into a record for `add-source.py`. |
| `build-source-timing.py` | Rebuild `source-timing.csv` from the ledger. |
| `build-charts.py` | Generate the viewpoint map and category chart SVGs. |
| `sync-site.py` | Rebuild everything and copy it into the site repository. |

`source-timing.csv` and both chart includes are generated. Edit the ledger
instead and re-run `sync-site.py`.

## Checking without changing anything

```sh
python3 scripts/sync-site.py --check   # is the site up to date?
python3 -m unittest discover -s tests  # date logic
```

## Fields a reviewer must choose

- `category`: `Educator`, `Journalist`, `AI industry`, `Governance`, `Broad-AI baseline`.
  Used by the openness chart.
- `map_category`: `research`, `education`, `governance`, `baseline`, `media`.
  Sets the colour and legend group on the viewpoint map.
- `short_label`: the name printed beside the marker. Must be unique, and short
  enough to read on the chart.
