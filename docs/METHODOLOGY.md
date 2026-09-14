# Methodology and limits

## Unit of analysis

The unit is a **specific source**, not a person. A mathematician may hold different views in different essays, talks, or interviews. A source may be added only when its connection to mathematics or mathematics education is explicit.

## Scoring rubric

### Outlook: anxious (0) to hopeful (100)

This describes the source's expected net effect of AI on the relevant domain. Scores near 50 indicate conditional or mixed views. It does not measure emotional tone alone.

### Evidence basis: speculative (0) to data-supported (100)

Assess the support for the source's central claims:

- 0–25: assertion, philosophy, anecdote, or untestable forecast
- 26–50: some examples or references, but primarily interpretive or normative
- 51–75: substantial evidence with material limitations
- 76–100: direct, transparent, and testable support; methods and limitations are available

Consider empirical data, primary sources, research design, causal caution, reproducibility, uncertainty disclosure, and match between evidence and claim.

### Source reliability: lower (0) to higher (100)

This is not a prestige score. It combines:

1. relevant expertise;
2. transparent methods, provenance, and uncertainty;
3. quality and primacy of supporting sources;
4. relevance to the claimed domain; and
5. opportunities for independent checking.

It cannot establish that a source is true. It estimates how responsibly the source supports a claim at the time of review.

## Important cautions

- A high evidence score can coexist with an anxious outlook, and vice versa.
- News reports are usually secondary evidence even when they accurately report a study.
- A source about AI generally may be included as a clearly labeled baseline but should not be treated as mathematics-specific.
- Recent preprints, benchmarks, and vendor claims require particular caution because peer review, replication, disclosure of compute, and test-set contamination may be unresolved.
- Scores are aids to comparative discussion, not measurements with statistical precision.

## AI openness by source category

The companion categorical map groups sources as **AI industry**, **Journalist**, or **Educator**, and positions each on one additional provisional dimension recorded in [openness-by-category.csv](../data/openness-by-category.csv):

- **Openness to AI use:** rejection (0) to active embrace (100). This captures the use advocated by the source, not an estimate of technical capability.
- **Category:** the source's primary public role in this review. “AI industry” records a material company role; “Journalist” includes public-facing reporting and interview-led science communication; “Educator” includes academic and instructional mathematics sources. It does not measure motive, independence, or the quality of an argument.

The categories and scores are descriptive, provisional review aids. They are not claims about motive, bias, or educational quality.

## Review protocol

For each proposed source, reviewers should record: the central claim; scope; source type; supporting evidence; notable limits; candidate scores; and a short rationale. Score changes should be documented in a pull request or issue.

## Calls to action and jobs/careers

[`source-topics.csv`](../data/source-topics.csv) records two additional source-level classifications used by the separate chart pages:

- **Call to action:** an explicit recommendation for people or institutions to act.
- **Jobs/careers:** an explicit judgment about employment, hiring, promotion, professional roles, or career training. Research-method claims alone do not qualify.

`recorded` means the review captures such a position. `not_recorded` means it has not been established by the current review, not that the source takes no position. Each recorded position has a paraphrase, source URL, and review basis. The initial coding combines existing review notes with targeted source checks for Bessis, Tao, Weinreich, Conrad Wolfram, Stephen Wolfram, and Tsimerman; it is not an exhaustive rereview of all sources. Bessis, Tao, and Tsimerman concern academic rewards or career pathways, not general labor-market forecasts.

This classification is distinct from `concern-coverage.csv`, which counts only explicitly declared scope and therefore cannot establish whether the full source discusses employment. The GitHub Pages site uses copies of the topic CSV in `_data/mathchat_source_topics.csv` and `assets/data/mathchat-source-topics.csv`; refresh both when the review changes.
