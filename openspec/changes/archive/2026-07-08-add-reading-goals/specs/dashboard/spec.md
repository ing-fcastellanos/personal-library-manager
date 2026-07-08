## ADDED Requirements

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
