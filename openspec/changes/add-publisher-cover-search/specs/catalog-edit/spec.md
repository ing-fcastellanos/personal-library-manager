## ADDED Requirements

### Requirement: Publisher-scoped cover search on the edit form

The Editorial field on the book edit screen SHALL offer the same inline, automatic
publisher-scoped cover search available on the shelf-capture review's auto rows: editing the
field debounces briefly and then searches automatically, a single confident match replaces the
form's cover with a visible confirmation, multiple matches are offered as a pickable list, and
no match leaves the existing cover untouched. Applying a searched cover this way SHALL behave
like any other unsaved form edit — it is only persisted when the reader saves the book, and
follows the same `coverSource` handling as other cover changes made through the form.

#### Scenario: Editing the Editorial field searches automatically

- **WHEN** a reader changes the Editorial field on the edit screen
- **THEN** a cover search scoped to the new publisher starts automatically after a short pause,
  with no separate search button

#### Scenario: A picked or auto-applied cover is only saved on save

- **WHEN** a reader applies a searched cover and then leaves the edit screen without saving
- **THEN** the book's persisted cover is unchanged

#### Scenario: No match leaves the current cover untouched

- **WHEN** the publisher-scoped search returns no candidates
- **THEN** the form's cover field keeps its current value
