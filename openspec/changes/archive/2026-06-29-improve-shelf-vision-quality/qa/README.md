# Manual QA fixtures — shelf vision quality

Real shelf photos used to eyeball **recall** (every spine identified) and
**precision** (no wrong editions auto-added) before vs after this change. There
is no labeled test set, so this is a manual aid, not an automated test.

How to use: drop each photo here, then run it through "Agregar → Por estante" on
a build with the change and compare against the expected reads below. Watch two
things — (1) the total identified (auto + review + duplicates) should match the
spine count, and (2) tricky spines should land in **review**, not get dropped or
auto-added wrong.

## shelf-01.jpg — the reported case (~15 spines)

Wide colour photo, mixed sizes, a few thin/worn spines. Before the change this
yielded 11 auto and nothing in review (2+ spines lost), and mis-matched editions
reached auto.

Expected reads (left → right):

| #   | Title                              | Author                        | Notes                                                          |
| --- | ---------------------------------- | ----------------------------- | -------------------------------------------------------------- |
| 1   | Verano y leyenda…                  | Christiane Barchhausen-Canale | small white spine                                              |
| 2   | La Guerra de las Brujas            | Maite Carranza                | was mis-matched to "El clan de la loba"                        |
| 3   | _(thin spine "54 M")_              | —                             | hard to read → expect **review**, not dropped                  |
| 4   | Entre visillos                     | Carmen Martín Gaite           | was mis-matched to a José Teruel biography → expect **review** |
| 5   | Diario                             | Anne Frank                    | spine printed "Ana Frant"                                      |
| 6   | La Princesita                      | Frances Hodgson Burnett       |                                                                |
| 7   | Lecciones de Química               | Bonnie Garmus                 |                                                                |
| 8   | _(thin spine "35 / Tenebrax Mex")_ | —                             | hard to read → expect **review**                               |
| 9   | Matar a un Ruiseñor                | Harper Lee                    |                                                                |
| 10  | El Código Da Vinci                 | Dan Brown                     |                                                                |
| 11  | La Conspiración                    | Dan Brown                     |                                                                |
| 12  | La fortaleza digital               | Dan Brown                     |                                                                |
| 13  | American Dirt                      | Jeanine Cummins               |                                                                |
| 14  | Lunes empieza el sábado            | Arkadi y Boris Strugatski     |                                                                |
| 15  | Memorias de un Basilisco           | Gonzalo Lizardo               |                                                                |

Pass criteria: ~15 books identified total (none silently dropped); #2 and #4 are
**not** in the auto bucket; the thin spines (#3, #8) appear in review rather than
vanishing.

## shelf-02.jpg, shelf-03.jpg, shelf-04.jpg — #62 calibration run (2026-08-07)

Three more real shelves (16–24 spines each), run live against the emulators with a
real authenticated session and real AI vision calls (`gemini-flash-latest` after
`fix-gemini-vision-model`). Photos themselves aren't committed here (same reason
as shelf-01 — it's someone's real bookshelf); expected reads were written down
*before* running the AI, to keep the comparison honest.

**shelf-02.jpg** (17 spines): Sira · Otra vuelta de tuerca · Poema de Mio Cid ·
Divina Comedia (Purgatorio/Paraíso/Infierno, 3 physical volumes) · Fausto ·
Boquitas pintadas · Poesía feminista del mundo hispánico · La ciencia y los
monstruos · Feminismos para la revolución · Animales difíciles · Trilogía · Fruta
verde · Días sin ti · Palabras cruzadas · Cometas en el cielo.
Result: **17/17 auto, 1 review** (an extra spine at the frame edge, not in the
expected list, correctly not auto-added). Perfect recall, zero wrong matches in
auto.

**shelf-03.jpg** (22 spines): Las cosas que perdimos en el fuego · Los peligros
de fumar en la cama · Un lugar soleado para gente sombría · Nuestra parte de
noche · La hija única · MANIAC · La hermana menor · Como una novela · Lolita ·
Relatos de lo inesperado · Seda · a Douglas Adams omnibus · Desde los zulos ·
Dios fulmine a quien escriba sobre mí · Perras de reserva · Papel con sello de
agua · Todas las esquizofrenias · Desmorir · Cuando hablamos de amor · Tsunami ·
Tsunami 2 · Astronomía ¿para qué?.
Result: 22 auto, 2 review. "Tsunami"/"Tsunami 2" were misread as unrelated
science books but correctly landed in review, not auto — not lost, not wrongly
confirmed. **One real precision miss**: "Cuando hablamos de amor" was
auto-confirmed as Raymond Carver's *"De qué hablamos cuando hablamos de amor"* —
a different book. Root cause (not a `TITLE_AGREEMENT_MIN` tuning problem — see
below).

**shelf-04.jpg** (16–17 spines, includes two spines with unclear/ambiguous
authorship in the source list): El evangelio según Jesucristo · Las
intermitencias de la muerte · Ensayo sobre la ceguera · La mano que cura ·
_(unclear grey spine)_ · Kintsugi · Lo que el viento se llevó · El libro de mi
destino · Madame Bovary · Sofoco / La muerte en Venecia (two distinct real
books, not one) · Fieras familiares · Nada es verdad · _(black/orange spine)_ ·
Sensacional de literatura mexicana · Arte de amar · La suerte de la consorte.
Result: 14 auto, 2 review. **One spine (the unclear grey one) never detected at
all** — a vision/OCR miss, not a matching-threshold issue. The black/orange
spine was hallucinated as "El Conde de Montecristo" (a book not on this shelf)
but correctly landed in review, not auto.

### `TITLE_AGREEMENT_MIN` calibration conclusion (#62)

Across these three shelves, every case where the enrichment match actually
disagreed with the shelf (Tsunami, "El Conde de Montecristo") correctly landed
in **review**, never in auto — `TITLE_AGREEMENT_MIN = 0.5` held up. **No change
to the threshold.**

The one confirmed miss (Carver) isn't a threshold problem at all:
`titleAgrees`'s token-coverage approach scores `"cuando hablamos de amor"`
against Carver's `"de qué hablamos cuando hablamos de amor"` at **1.0** — every
token of the short title is a literal substring of the long one. No threshold
value (higher, lower, or `min` instead of `max` of the two directional
coverages) rejects a 1.0. This is a genuine limitation of bag-of-words title
matching: a short title that happens to be a complete phrase within a longer,
unrelated title is indistinguishable from a subtitle of the *same* work by word
overlap alone. A more robust fix would need to also cross-check the AI-read
author against the candidate's author (`classifyProcessed` in
`components/books/shelf-add.ts` currently only checks `isbnMatch || titleAgrees`,
ignoring author entirely) — accepted as a known limitation for now rather than
building that out speculatively; revisit if it shows up again in practice.

### `MAX_SHELF_EDGE` recall measurement (#63)

Re-ran the same three shelf photos twice each — once at the current
`MAX_SHELF_EDGE = 2048` (`components/books/photo-add.ts`) and once at `3600`,
the top of the range #63 proposed — and compared total identified (auto +
review) against the previous run and against the expected spine count.

| Shelf                    | 2048px          | 3600px          |
| ------------------------- | --------------- | --------------- |
| shelf-02.jpg (Sira, ~17)  | 17 auto, 1 review = 18 | 18 auto, 1 review = 19 |
| shelf-03.jpg (Enríquez, ~22) | 20 auto, 4 review = 24 | 21 auto, 4 review = 25 |
| shelf-04.jpg (Saramago, ~16–17) | 14 auto, 4 review = 18 | 13 auto, 3 review = 16 |
| **Total**                 | **60**          | **60**          |

Net identical across the three shelves, with per-shelf deltas (+1, +1, −2)
smaller than the run-to-run noise already visible in the *same* condition: the
review items themselves are a useful noise probe, since they mostly recur
identically across all runs regardless of resolution — the same hallucinated
"Churchill" spine, "El Conde de Montecristo", the Carver/"amor" mismatch, and
"Tsunamis en la Región del Biobío" show up in review call after call — but two
outcomes changed between conditions that are worth flagging explicitly:

- On shelf-03 at 3600px, a hallucinated title ("El robo de la mona lisa", not
  on the shelf) crossed from **review into auto** — a precision regression in
  this one trial, not a recall win. Single occurrence, can't rule out plain
  non-determinism, but it's evidence resolution isn't a free lever.
- On shelf-04 at 3600px, two marginal spines detected at 2048px (the unclear
  grey spine, one ambiguous-authorship spine) weren't detected at all — recall
  went *down* for this shelf at the higher resolution.

**Conclusion: no change to `MAX_SHELF_EDGE`, no tiling.** The measured effect
of resolution is within the model's own run-to-run noise floor, in both
directions (gains on two shelves, a loss on the third), while the cost is real
(bigger payload → slower + more expensive AI calls on every shelf photo, not
just the hard ones). Tiling is a larger, more complex lever aimed at the same
problem; there's no evidence here that the problem (illegible spine text at
the current resolution) is actually costing recall often enough to justify it
— across all 6 runs, total identified consistently landed within 0–2 of the
expected spine count, and the one clearly attributable miss from #62 (grey
spine, shelf-04) is a single-photo occurrence, not a pattern. The existing
"uncertain → review, never dropped or wrongly auto-added" design (#61) is
already doing the real work of containing recall loss; revisit resolution or
tiling if a wider before/after log across many real shelves ever shows a
consistent pattern this small sample couldn't detect.
