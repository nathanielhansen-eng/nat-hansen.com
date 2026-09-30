#!/usr/bin/env python3
"""Regenerate public/teaching/experiments/wcs-atlas.json, the aggregated naming
and best-example data behind /teaching/experiments/berlin-kay/atlas.

Source data: the World Color Survey archive
(https://linguistics.berkeley.edu/wcs/data.html): term.txt, foci.txt, lang.txt,
dict.txt, chip.txt, and the digitised Berlin & Kay (1969) Appendix 1 files
BK-term.txt, BK-foci.txt, BK-dict.txt. Download them into one directory.

Output, per language: name, place, speaker count n, and
  terms: [abbr, transcription, total uses, chips won (modal), swatch cnum]
  grid:  331 entries indexed by WCS chip number (index 0 unused); each is a
         flat [termIndex, count, termIndex, count, ...] list, most votes first
  foci:  per term, [cnum, weight] best-example picks (a pick spanning k chips
         gives each 1/k)
A term's swatch is its modal best-example chip; if nobody picked one, the chip
where the term had its largest share. Chip colours are NOT in this file: the
atlas reads them from chips.ts, the same colorimetry the experiment uses.

Usage: python3 scripts/generate-wcs-atlas.py path/to/wcs-data-dir
"""

import collections
import json
import os
import re
import sys

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "teaching", "experiments", "wcs-atlas.json")


def p(name):
    return os.path.join(SRC, name)


def dec(s):
    # lang.txt writes Mac Roman bytes as {\xNN} escapes
    return re.sub(r"\{\\x([0-9A-Fa-f]{2})\}", lambda m: bytes([int(m.group(1), 16)]).decode("mac_roman"), s)


pos = {}
for line in open(p("chip.txt")):
    c, r, col, _ = line.rstrip("\n").split("\t")
    pos[(r, int(col))] = int(c)
chroma = {}
for line in open(p("cnum-vhcm-lab-new.txt")):
    if line.startswith("#"):
        continue
    f = line.split("\t")
    chroma[int(f[0])] = abs(float(f[7])) + abs(float(f[8]))


def parse_foci(s):
    """'F1,2G1,2' -> F1 F2 G1 G2; 'D9..12' -> D9..D12; drops cells with no chip."""
    out = []
    for m in re.finditer(r"([A-J])([0-9.,]+)", s):
        r = m.group(1)
        for part in m.group(2).strip(",").split(","):
            if not part:
                continue
            if ".." in part:
                a, b = part.split("..")
                cols = range(int(a), int(b) + 1)
            else:
                cols = [int(part)]
            out += [pos[(r, c)] for c in cols if (r, c) in pos]
    return out


def build(meta, termfile, focifile, dictrows, bk=False):
    naming = collections.defaultdict(lambda: collections.defaultdict(collections.Counter))
    speakers = collections.defaultdict(set)
    for line in open(p(termfile)):
        f = line.rstrip("\n").split("\t")
        if len(f) < 4 or f[3].strip() in ("*", ""):
            continue
        L, S, C, T = int(f[0]), int(f[1]), int(f[2]), f[3].strip()
        naming[L][C][T] += 1
        speakers[L].add(S)
    foci = collections.defaultdict(lambda: collections.defaultdict(collections.Counter))
    for line in open(p(focifile)):
        f = line.rstrip("\n").split("\t")
        if bk:  # BK-foci keys terms by number, not abbreviation
            L, tn, code = int(f[0]), f[2].strip(), f[3]
            T = dictrows.get((L, tn), {}).get("abbr")
        else:
            L, T, code = int(f[0]), f[3].strip(), f[4]
        if not T or T == "*":
            continue
        cs = parse_foci(code)
        for c in cs:
            foci[L][T][c] += 1 / len(cs)
    gloss = {(L, d["abbr"]): d["tran"] for (L, _), d in dictrows.items()}
    langs = []
    for L in sorted(naming):
        nm = naming[L]
        uses = collections.Counter()
        for c in nm:
            uses.update(nm[c])
        tlist = [t for t, _ in uses.most_common()]
        ti = {t: i for i, t in enumerate(tlist)}
        won = collections.Counter(nm[c].most_common(1)[0][0] for c in nm)
        terms = []
        for t in tlist:
            fc = foci[L].get(t)
            if fc:
                sw = max(fc, key=lambda c: (fc[c], chroma[c]))
            else:
                sw = max(nm, key=lambda c: (nm[c][t] / sum(nm[c].values()), nm[c][t]))
            terms.append([t, gloss.get((L, t), ""), uses[t], won[t], sw])
        grid = [[]] + [
            [v for t, n in sorted(nm.get(c, {}).items(), key=lambda x: -x[1]) for v in (ti[t], n)]
            for c in range(1, 331)
        ]
        fo = [[[c, round(w, 2)] for c, w in foci[L][t].items()] for t in tlist]
        langs.append(dict(id=L, name=meta[L][0], place=meta[L][1], n=len(speakers[L]), terms=terms, grid=grid, foci=fo))
    return langs


PLACE_FIX = {"*": "", "CHAD": "Chad", "PHILIPPINES": "Philippines", "Papua N. Guinea": "Papua New Guinea", "U S A": "USA"}
wmeta = {}
for line in open(p("lang.txt"), encoding="utf-8"):
    f = line.rstrip("\n").split("\t")
    wmeta[int(f[0])] = (dec(f[1]), PLACE_FIX.get(f[2], dec(f[2])))
wdict = {}
for line in open(p("dict.txt"), encoding="utf-8"):
    f = line.rstrip("\n").split("\t")
    if line.startswith("#") or len(f) < 4:
        continue
    wdict[(int(f[0]), f[1].strip())] = dict(abbr=f[3].strip(), tran=f[2].strip())
bdict = {}
for line in open(p("BK-dict.txt"), encoding="utf-8"):
    f = line.rstrip("\n").split("\t")
    if line.startswith("#") or len(f) < 4:
        continue
    bdict[(int(f[0]), f[2].strip())] = dict(abbr=f[1].strip(), tran=f[3].strip())
# Order of Appendix 1 in Basic Color Terms (BK-term-README.txt)
BK_NAMES = ["Arabic", "Bahasa Indonesia", "Bulgarian", "Cantonese", "Catalan", "English (American)", "Hebrew",
            "Hungarian", "Ibibio", "Japanese", "Korean", "Mandarin", "Mexican Spanish", "Pomo", "Swahili",
            "Tagalog", "Thai", "Tzeltal", "Urdu", "Vietnamese"]
bmeta = {i + 1: (n, "") for i, n in enumerate(BK_NAMES)}

data = dict(wcs=build(wmeta, "term.txt", "foci.txt", wdict), bk=build(bmeta, "BK-term.txt", "BK-foci.txt", bdict, bk=True))
with open(OUT, "w") as fh:
    json.dump(data, fh, separators=(",", ":"), ensure_ascii=False)
print(f"{len(data['wcs'])} WCS + {len(data['bk'])} B&K languages -> {os.path.normpath(OUT)}")
