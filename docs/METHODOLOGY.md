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

## Education-facing map

The companion education-facing map uses two additional provisional dimensions, recorded in [education-openness.csv](../data/education-openness.csv):

- **Openness to AI use:** rejection (0) to active embrace (100). This captures the use advocated by the source, not an estimate of technical capability.
- **Educational outlook:** harmful (0) to beneficial (100). This captures the source's anticipated net effect on mathematics learning and educational practice. Sources not primarily about education are scored only for their stated or reasonably direct implications and should be read with extra caution.

These are interpretive scores, not outcome measurements. In particular, an educational-outlook score above 50 does not establish learning benefit; it records the source's own expected direction of effect.

## Review protocol

For each proposed source, reviewers should record: the central claim; scope; source type; supporting evidence; notable limits; candidate scores; and a short rationale. Score changes should be documented in a pull request or issue.
