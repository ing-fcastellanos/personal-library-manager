## ADDED Requirements

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
