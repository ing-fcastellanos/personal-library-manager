# dashboard Specification

## Purpose

TBD - created by archiving change add-dashboard-kpis. Update Purpose after archive.

## Requirements

### Requirement: Library KPI overview

The dashboard at `/` SHALL show the real state of the library as a set of KPI
cards: total books, total copies, books read vs pending, and unique authors and
publishers. Counts are derived from existing data and formatted for es-AR.

#### Scenario: Showing the KPIs

- **WHEN** the reader opens the dashboard with a non-empty library
- **THEN** it shows the total books, total copies, read and pending counts, and
  unique author and publisher counts, each with its real value

#### Scenario: Read vs pending

- **WHEN** computing read and pending
- **THEN** a book counts as **read** if it has at least one `finished` reading event
  and **pending** otherwise, and read + pending equals the total book count

### Requirement: Per-reader reading counts

The dashboard SHALL show, per reader, how many books that reader has finished.

#### Scenario: Per-reader breakdown

- **WHEN** the dashboard renders
- **THEN** each reader appears with their count of finished books

#### Scenario: Reader with no readings

- **WHEN** a reader has no finished readings
- **THEN** they appear with a count of zero (not omitted)

### Requirement: Loading and empty states

The dashboard SHALL show a loading state while data is being fetched and a clear
empty state when the library has no books yet, without errors.

#### Scenario: Loading

- **WHEN** the dashboard is fetching its data
- **THEN** it shows a loading state (skeletons) rather than empty or zeroed cards

#### Scenario: Empty library

- **WHEN** there are no books
- **THEN** the dashboard shows an empty state inviting the reader to add books,
  instead of a grid of zeros

### Requirement: Resilient data loading

The dashboard SHALL degrade gracefully if a data source fails, showing the KPIs it
can compute rather than crashing.

#### Scenario: A source fails

- **WHEN** one of the underlying requests returns a non-ok response
- **THEN** the dashboard still renders, treating the missing source as empty

### Requirement: Book distribution charts

The dashboard SHALL show distribution charts for the collection by **category**,
**author**, and **publisher**, each as a horizontal bar chart with a real text
label and count per bar (not color-only). Distributions are computed from the
already-loaded book data.

#### Scenario: Viewing book distributions

- **WHEN** the dashboard has loaded and the library is non-empty
- **THEN** it shows three charts — books by category, by author, and by publisher
  — each bar labelled with the name and its book count

#### Scenario: Empty library

- **WHEN** there are no books
- **THEN** the distribution charts are not shown (the dashboard's existing empty
  state covers this)

### Requirement: Readings-by-category chart

The dashboard SHALL show a distribution of **finished readings** by category,
derived by joining each `finished` reading event to its book's categories.

#### Scenario: Viewing readings by category

- **WHEN** there is at least one finished reading
- **THEN** a chart shows the count of finished readings per category

#### Scenario: No finished readings yet

- **WHEN** there are books but no finished readings
- **THEN** the readings-by-category chart shows an empty/zero state instead of
  an empty bar list

### Requirement: Top-N with an "Otros" bucket

Each distribution SHALL show at most the top 6 entries by count; any remaining
entries are collapsed into a single "Otros" bucket showing their combined count.

#### Scenario: Fewer than 6 distinct entries

- **WHEN** a distribution has 6 or fewer distinct entries
- **THEN** all of them are shown and there is no "Otros" bucket

#### Scenario: More than 6 distinct entries

- **WHEN** a distribution has more than 6 distinct entries
- **THEN** the top 6 by count are shown individually and the rest are combined
  into "Otros" with the sum of their counts

### Requirement: Accessible SVG bar chart

The bar chart SHALL be a custom SVG component using the design system's tokens,
with each bar's label and value exposed as real text (readable by assistive
tech and visible without relying on color alone).

#### Scenario: Screen reader access

- **WHEN** a screen reader reaches a bar chart
- **THEN** each bar's category/author/publisher name and its count are available
  as text content, not solely as a visual bar length or color

### Requirement: Recent reads widget

The dashboard SHALL show the 5 most recently finished readings across both
readers, newest-first, each rendered as a compact reading-event card with a
link to the full reading history.

#### Scenario: Showing recent reads

- **WHEN** there is at least one finished reading
- **THEN** the widget shows up to the 5 most recent finished readings,
  newest-first, with a link to the full history

#### Scenario: No finished readings yet

- **WHEN** there are no finished readings
- **THEN** the widget shows an empty state instead of an empty list

### Requirement: Per-reader monthly pace

The dashboard SHALL show, per reader, the average number of finished books per
active month (a month in which the reader finished at least one book),
computed over their entire reading history.

#### Scenario: Reader with readings across several months

- **WHEN** a reader has finished readings spread across active months
- **THEN** their pace shows total finished books divided by the count of active
  months

#### Scenario: Reader with no finished readings

- **WHEN** a reader has no finished readings
- **THEN** their pace is shown as unavailable (not a division-by-zero value)

### Requirement: Per-reader streaks

The dashboard SHALL show, per reader, their **current streak** (consecutive
months up to and including the current month with ≥1 finished reading) and
**longest streak** (the longest such run in their history).

#### Scenario: Active streak

- **WHEN** a reader finished at least one book in each of the last N consecutive
  months including the current month
- **THEN** their current streak shows N months

#### Scenario: Broken streak

- **WHEN** a reader has no finished reading in the current month
- **THEN** their current streak is 0, regardless of past streaks

#### Scenario: Longest streak differs from current

- **WHEN** a reader's longest historical streak is longer than their current one
- **THEN** both are shown distinctly

### Requirement: Per-reader reading pace ("ritmo")

The dashboard SHALL show, per reader, the average number of days between their
consecutive finished readings, ordered by finish date.

#### Scenario: Multiple finished readings

- **WHEN** a reader has 2 or more finished readings
- **THEN** their pace shows the average number of days between consecutive
  finish dates

#### Scenario: Fewer than two finished readings

- **WHEN** a reader has 0 or 1 finished readings
- **THEN** their pace is shown as unavailable (not computable with fewer than
  two data points)

### Requirement: Reader comparison

The dashboard SHALL present both readers' pace, streaks, and monthly average
side by side so they can be compared at a glance.

#### Scenario: Two readers with different activity

- **WHEN** both readers have reading history
- **THEN** their stats are shown together in a way that makes it easy to compare
  them directly

#### Scenario: One reader with no activity

- **WHEN** one reader has no finished readings and the other does
- **THEN** the inactive reader still appears in the comparison with
  zero/unavailable stats, not omitted

### Requirement: Set an annual reading goal

The active (signed-in) reader SHALL be able to set and edit a target number of
books for the current calendar year. The goal is stored on the reader's
`preferences` under a year-keyed map, without discarding any other preference
data already stored.

#### Scenario: Setting a goal for the first time

- **WHEN** the active reader has no goal set for the current year and enters a
  target
- **THEN** the goal is saved for the current year, and other existing
  preference keys (if any) are preserved

#### Scenario: Editing an existing goal

- **WHEN** the active reader changes an already-set goal for the current year
- **THEN** the updated value replaces the previous one for that year only

### Requirement: Only the active reader edits their own goal

The system SHALL let a reader edit only their own annual goal from the dashboard
widget; another reader's goal is shown but not editable there.

#### Scenario: Viewing another reader's goal

- **WHEN** the dashboard shows a reader who is not the active reader
- **THEN** their goal/progress is displayed without an edit affordance

#### Scenario: No active reader

- **WHEN** there is no signed-in reader
- **THEN** no goal can be set from the widget (readers' existing goals, if any,
  still display read-only)

### Requirement: Progress toward the goal

The dashboard SHALL show, per reader with a goal set, how many books they have
finished so far in the current calendar year against their goal.

#### Scenario: Some progress made

- **WHEN** a reader has a goal and has finished some books this year
- **THEN** their progress shows the finished count against the goal

#### Scenario: Goal met or exceeded

- **WHEN** a reader's finished-this-year count is greater than or equal to their
  goal
- **THEN** the widget shows a distinct "cumplida" (met) state rather than a
  regular in-progress state

### Requirement: Year-end projection

The dashboard SHALL show, per reader with a goal set and at least one finished
reading this year, a projected year-end total based on their pace so far:
finished-this-year divided by calendar months elapsed in the year, multiplied by 12.

#### Scenario: Projection reflects elapsed calendar months

- **WHEN** a reader has finished books in some but not all months of the year so
  far
- **THEN** the projection is computed using the number of calendar months elapsed
  (not just months in which they read), so idle months lower the projection

#### Scenario: No finished readings yet this year

- **WHEN** a reader has a goal but has finished nothing this year
- **THEN** no projection is shown (not a misleading zero or divide-by-zero value)

### Requirement: No-goal state

The dashboard SHALL show a distinct state for a reader with no goal set for the
current year: an inviting call-to-action for the active reader, and a plain
"sin meta" indication for any other reader.

#### Scenario: Active reader with no goal

- **WHEN** the active reader has not set a goal for the current year
- **THEN** their card shows a call-to-action to set one

#### Scenario: Another reader with no goal

- **WHEN** a reader other than the active one has not set a goal for the
  current year
- **THEN** their card shows a plain "sin meta" indication without an edit
  affordance
