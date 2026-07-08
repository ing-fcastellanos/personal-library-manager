## ADDED Requirements

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
