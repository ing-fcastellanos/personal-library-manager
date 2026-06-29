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

## shelf-02.jpg / shelf-03.jpg — _(add 1–2 more)_

Add a second and ideally a third real shelf (different lighting / density) with
their expected reads, so the before/after isn't tuned to a single photo.
