# Contributing

Thank you for helping keep this map fair, current, and useful.

## Propose a source

Use the **[MathChat scoring tool](https://pleasedistribute.org/MathChat/#source-tool)** on the site. It is the only way to propose a source. Paste or link the source, and the tool reads its text, scores it provisionally, and prepares the submission for you.

The tool shows three steps and says which are done. The third step happens on
GitHub: a submission is not sent until you open it there and press **Submit new
issue**. Until then it is saved only in your own browser, and the
[appendix](https://pleasedistribute.org/MathChat/appendix/) shows it as not sent.

Please do not open a source suggestion by hand. Submissions from the tool carry
the source text length, the scored input, and the cue rates behind the scores,
which a hand-written issue cannot provide.

## Challenge a score

Open an issue that names the row in `data/assessments.csv`, proposes replacement
score(s), and gives evidence using the rubric in `docs/METHODOLOGY.md`.
"I disagree" is welcome as a starting point, but it is not enough to change a
score without a reasoned alternative.

## For maintainers: accepting a submission

```sh
gh issue view 42 --json body -q .body > issue.txt
python3 scripts/issue-to-source.py issue.txt > new.json
# Fill in published, category, openness and map_category, and review the scores.
python3 scripts/add-source.py --json new.json
python3 scripts/sync-site.py
```

Then commit and push both repositories. See [scripts/README.md](scripts/README.md)
for the full workflow. Scores from the tool are heuristic starting points and
should be reviewed before they go on the map.

## Standards

- Keep submissions tidy, polite, and apolitical.
- Separate evidence from opinion or prediction.
- Prefer primary research, official transcripts, original essays, and identifiable talks.
- State whether a claim concerns research mathematics, undergraduate teaching, graduate training, or K–12 education.
- Do not score an author from reputation alone.
- Treat all scores as provisional and revisable.
