## MODIFIED Requirements

### Requirement: Auto bucket added after a preview

Books classified `auto` SHALL be presented as a summary and added only after the reader
confirms, never blindly. Confirming SHALL create each `auto` book via the existing intake,
using its enrichment metadata and cover — or, when the reader corrected that book's publisher
and a replacement cover was applied (single confident match or an explicit pick from multiple
results), the corrected publisher and cover instead — assigned to the batch shelf.

#### Scenario: Preview then add the confident books

- **WHEN** the batch has confident books and the reader confirms "add the N books"
- **THEN** each is saved via intake with its enrichment metadata and cover, on the chosen
  shelf

#### Scenario: Nothing is auto-saved before confirmation

- **WHEN** processing finishes
- **THEN** no book has been persisted until the reader confirms the auto summary or
  reviews an item

#### Scenario: A corrected publisher and cover are used at intake

- **WHEN** a reader corrects an auto book's publisher and a replacement cover is applied
  (auto-applied or picked), then confirms the batch add
- **THEN** that book is saved via intake with the corrected publisher and cover rather than the
  original AI/enrichment values

## ADDED Requirements

### Requirement: Inline publisher correction and cover search on auto rows

Each row in the auto bucket SHALL offer a way to correct that book's publisher inline, without
leaving the batch or opening a modal. Only one row SHALL be expanded for editing at a time.
Editing the publisher field SHALL, after a short pause in typing, automatically search for a
cover scoped to that publisher (no explicit search action required): a single confident match
SHALL replace the row's cover with a visible confirmation; multiple matches SHALL be offered as
a pickable list for the reader to choose from; no match SHALL leave the existing cover
untouched. The correction SHALL never delete or block adding the book — only the cover/publisher
fields are affected.

#### Scenario: Editing the publisher triggers a search automatically

- **WHEN** a reader opens a row's inline editor and changes the publisher field
- **THEN** a cover search scoped to the new publisher starts automatically after the reader
  pauses typing, with no separate search button pressed

#### Scenario: A single match replaces the cover

- **WHEN** the publisher-scoped search resolves to exactly one confident match
- **THEN** the row's cover is replaced and a visible confirmation is shown, with no further
  action required from the reader

#### Scenario: Multiple matches are offered as a choice

- **WHEN** the publisher-scoped search returns more than one candidate
- **THEN** the reader is shown the candidates to pick from, and the row's cover only changes
  once one is picked

#### Scenario: No match leaves the cover untouched

- **WHEN** the publisher-scoped search returns no candidates
- **THEN** the row keeps its original cover and the reader can still add the book unchanged

#### Scenario: Only one row edits at a time

- **WHEN** a reader opens the inline editor on a second row while another row's editor is open
- **THEN** the first row's editor closes as the second one opens
