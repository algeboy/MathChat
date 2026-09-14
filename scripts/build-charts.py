"""Generate the two hand-placed MathChat charts from the ledger data.

The viewpoint map and the category chart used to be hand-written SVG, so adding
one source meant recomputing circle coordinates and nudging labels by hand. Both
are now produced from data/, which is what makes a new source a data-only edit.

Writes Jekyll includes into the site repository:
  _includes/mathchat-viewpoint-map.html
  _includes/mathchat-category-chart.html
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mathchat

# Plot geometry, matching the original hand-drawn chart.
LEFT, RIGHT, TOP, BOTTOM = 105, 840, 40, 440
CAT_LEFT, CAT_RIGHT = 185, 840
ROW_Y = {'Educator': 80, 'Journalist': 160, 'AI industry': 240}


def escape(text):
    return (text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                .replace('"', '&quot;'))


def radius(reliability):
    """Marker size, 8-13px across the 0-100 reliability range."""
    return round(8 + reliability / 100 * 5)


def place_labels(points, markers):
    """Offset each label so it clears every label already placed and every marker.

    Tries a ring of candidate offsets around the point and keeps the first that
    is clear, which is what the hand-tuned chart achieved by eye. Labels are
    placed largest-marker first, since those have the least room to move.
    """
    # Measured from the rendered chart: the theme's chalk face runs up to about
    # 7.3px per character at 14.5px line height. Estimating smaller let labels
    # overlap once the chart filled up, so allow a little more than measured, and
    # step candidates by more than a line height so a rejected offset clears.
    CANDIDATES = [(side, dy) for dy in (4, -12, 20, -28, 36, -44, 52, -60, 68, -76)
                  for side in (1, -1)]
    CHAR_W, LINE_H = 7.5, 16
    placed = []
    overlaps = lambda a, b: a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]
    for x, y, r, text in points:
        chosen = None
        for dx, dy in CANDIDATES:
            anchor = 'start' if dx >= 0 else 'end'
            lx = x + r + 6 if dx >= 0 else x - r - 6
            ly = y + dy
            width = len(text) * CHAR_W
            left = lx if anchor == 'start' else lx - width
            box = (left, ly - LINE_H + 3, left + width, ly + 3)
            if any(overlaps(box, q) for q in placed):
                continue
            if box[0] < 100 or box[2] > 915 or box[1] < 30 or box[3] > 455:
                continue
            chosen = (box, lx, ly, anchor)
            break
        if chosen is None:
            lx, ly, anchor = x + r + 6, y + 4, 'start'
            width = len(text) * CHAR_W
            chosen = ((lx, ly - LINE_H + 3, lx + width, ly + 3), lx, ly, anchor)
        placed.append(chosen[0])
        yield chosen[1], chosen[2], chosen[3], text


def viewpoint_map():
    ledger = {r['id']: r for r in mathchat.read('source-ledger.csv')}
    scores = mathchat.read('assessments.csv')
    by_category = {}
    for row in scores:
        source = ledger[row['id']]
        outlook = int(row['outlook_0_anxious_100_hopeful'])
        evidence = int(row['evidence_0_speculative_100_data_supported'])
        reliability = int(row['reliability_0_lower_100_higher'])
        x = round(LEFT + evidence / 100 * (RIGHT - LEFT))
        y = round(BOTTOM - outlook / 100 * (BOTTOM - TOP))
        by_category.setdefault(source['map_category'], []).append(
            dict(x=x, y=y, r=radius(reliability), label=source['short_label'],
                 name=source['author_or_source'], outlook=outlook,
                 evidence=evidence, reliability=reliability))

    out = []
    total = sum(len(v) for v in by_category.values())
    out.append(f'<svg id="viewpoint-map" class="mathchat-plot" data-source-count="{total}" viewBox="0 0 920 560" role="img" aria-labelledby="plot-title plot-desc">')
    out.append('  <title id="plot-title">AI and mathematics viewpoints</title>')
    out.append('  <desc id="plot-desc">A scatter plot. The horizontal axis is evidence basis from speculative to data-supported. '
               'The vertical axis is outlook from anxious to hopeful. Circle size represents provisional source reliability.</desc>')
    out.append(f'  <rect class="frame" x="{LEFT}" y="{TOP}" width="{RIGHT-LEFT}" height="{BOTTOM-TOP}" />')
    verticals = ''.join(f'<line x1="{round(LEFT+(RIGHT-LEFT)*p/100)}" y1="{TOP}" x2="{round(LEFT+(RIGHT-LEFT)*p/100)}" y2="{BOTTOM}" />' for p in (0, 25, 50, 75, 100))
    horizontals = ''.join(f'<line x1="{LEFT}" y1="{round(BOTTOM-(BOTTOM-TOP)*p/100)}" x2="{RIGHT}" y2="{round(BOTTOM-(BOTTOM-TOP)*p/100)}" />' for p in (0, 25, 50, 75, 100))
    out.append(f'  <g class="grid">{verticals}{horizontals}</g>')
    ticks_x = ''.join(f'<text x="{round(LEFT+(RIGHT-LEFT)*p/100)}" y="465">{p}</text>' for p in (0, 25, 50, 75, 100))
    ticks_y = ''.join(f'<text x="{LEFT-13}" y="{round(BOTTOM-(BOTTOM-TOP)*p/100)+4}">{p}</text>' for p in (0, 25, 50, 75, 100))
    out.append(f'  <g class="tick" text-anchor="middle">{ticks_x}</g>')
    out.append(f'  <g class="tick" text-anchor="end">{ticks_y}</g>')
    out.append('  <text class="axis-label" x="472" y="520" text-anchor="middle">Evidence basis: speculative (0) → data-supported (100)</text>')
    out.append('  <text class="axis-label" x="25" y="240" text-anchor="middle" transform="rotate(-90 25 240)">Outlook: anxious (0) → hopeful (100)</text>')

    label_points = []
    for key, (_, colour) in mathchat.MAP_CATEGORIES.items():
        points = by_category.get(key, [])
        if not points:
            continue
        markers = ''.join(
            f'<circle class="point" cx="{p["x"]}" cy="{p["y"]}" r="{p["r"]}">'
            f'<title>{escape(p["name"])} — outlook {p["outlook"]}, evidence {p["evidence"]}, reliability {p["reliability"]}</title></circle>'
            for p in points)
        out.append(f'  <g data-category="{key}" fill="{colour}">{markers}</g>')
        label_points.extend((p['x'], p['y'], p['r'], p['label']) for p in points)

    # Place the largest markers first; they are hardest to move around.
    ordered = sorted(label_points, key=lambda p: -p[2])
    markers = [(x, y, r) for x, y, r, _ in label_points]
    labels = ''.join(
        f'<text x="{round(lx)}" y="{round(ly)}"{"" if anchor == "start" else f" text-anchor={chr(34)}{anchor}{chr(34)}"}>{escape(text)}</text>'
        for lx, ly, anchor, text in place_labels(ordered, markers))
    out.append(f'  <g class="point-label">{labels}</g>')
    out.append('</svg>')
    return '\n'.join(out) + '\n'


def category_chart():
    """Openness by category. Rows come from the data, so a category that is new
    to the ledger gets its own row instead of silently vanishing from the chart."""
    ledger = {r['id']: r for r in mathchat.read('source-ledger.csv')}
    reliability = {r['id']: int(r['reliability_0_lower_100_higher'])
                   for r in mathchat.read('assessments.csv')}
    rows = mathchat.read('openness-by-category.csv')

    present = [c for c in mathchat.CATEGORIES if any(r['category'] == c for r in rows)]
    present += sorted({r['category'] for r in rows} - set(present))
    top, bottom = 40, 40 + 80 * len(present)
    band = (bottom - top) / len(present)
    row_y = {name: round(top + band * (i + 0.5)) for i, name in enumerate(present)}
    palette = ['#f3bb4d', 'var(--chalk-white)', '#9b8fe7', '#d981b2', '#66c5b9']
    colours = {name: palette[i % len(palette)] for i, name in enumerate(present)}

    by_row = {}
    for row in rows:
        openness = int(row['openness_to_ai_use_0_reject_100_embrace'])
        by_row.setdefault(row['category'], []).append(dict(
            x=round(CAT_LEFT + openness / 100 * (CAT_RIGHT - CAT_LEFT)),
            name=ledger[row['id']]['author_or_source'], openness=openness,
            r=max(6, radius(reliability[row['id']]) - 2)))

    height = bottom + 110
    out = [f'<svg class="mathchat-plot" data-source-count="{len(rows)}" viewBox="0 0 920 {height}" role="img" aria-labelledby="category-plot-title category-plot-desc">',
           '  <title id="category-plot-title">AI openness by source category</title>',
           f'  <desc id="category-plot-desc">Sources are grouped into {len(present)} rows by their primary public role '
           f'({", ".join(present)}), and positioned horizontally by openness to AI use.</desc>',
           f'  <rect class="frame" x="{CAT_LEFT}" y="{top}" width="{CAT_RIGHT-CAT_LEFT}" height="{bottom-top}" />']
    grid = ''.join(f'<line x1="{round(CAT_LEFT+(CAT_RIGHT-CAT_LEFT)*p/100)}" y1="{top}" x2="{round(CAT_LEFT+(CAT_RIGHT-CAT_LEFT)*p/100)}" y2="{bottom}" />' for p in (0, 25, 50, 75, 100))
    grid += ''.join(f'<line x1="{CAT_LEFT}" y1="{round(top+band*i)}" x2="{CAT_RIGHT}" y2="{round(top+band*i)}" />' for i in range(1, len(present)))
    out.append(f'  <g class="grid">{grid}</g>')
    ticks = ''.join(f'<text x="{round(CAT_LEFT+(CAT_RIGHT-CAT_LEFT)*p/100)}" y="{bottom+25}">{p}</text>' for p in (0, 25, 50, 75, 100))
    out.append(f'  <g class="tick" text-anchor="middle">{ticks}</g>')
    labels = ''.join(f'<text x="{CAT_LEFT-15}" y="{y+5}">{escape(name)}</text>' for name, y in row_y.items())
    out.append(f'  <g class="axis-label" text-anchor="end">{labels}</g>')
    out.append(f'  <text class="axis-label" x="{round((CAT_LEFT+CAT_RIGHT)/2)}" y="{bottom+75}" text-anchor="middle">Openness to AI use: reject (0) → actively embrace (100)</text>')
    for name in present:
        points = sorted(by_row.get(name, []), key=lambda p: p['x'])
        markers = ''
        for i, point in enumerate(points):
            # Stagger within the row so equal or close scores stay readable.
            cy = row_y[name] - 10 + (i % 2) * 20
            markers += (f'<circle class="point" cx="{point["x"]}" cy="{cy}" r="{point["r"]}">'
                        f'<title>{escape(point["name"])} — {point["openness"]}</title></circle>')
        out.append(f'  <g fill="{colours[name]}">{markers}</g>')
    out.append('</svg>')
    return '\n'.join(out) + '\n'


def main(site_root):
    """Write both chart includes. Returns the ones whose content actually changed,
    so a caller can report what moved rather than only that it ran."""
    includes = Path(site_root) / '_includes'
    includes.mkdir(parents=True, exist_ok=True)
    changed = []
    for name, build in (('mathchat-viewpoint-map.html', viewpoint_map),
                        ('mathchat-category-chart.html', category_chart)):
        target = includes / name
        content = build()
        if not target.exists() or target.read_text() != content:
            changed.append(name)
        target.write_text(content)
    for name in changed:
        print(f'rebuilt {name}')
    return changed


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else mathchat.ROOT.parent / 'algeboy.github.io')
