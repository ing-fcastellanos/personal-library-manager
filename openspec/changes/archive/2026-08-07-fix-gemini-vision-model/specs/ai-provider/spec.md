## ADDED Requirements

### Requirement: Gemini model selection avoids retired snapshots

The Gemini engine's default vision model SHALL be a currently-available model — a
rolling alias Google maintains (e.g. a `-latest` name) rather than a dated snapshot
that Google can retire — so a future model retirement does not silently break
identification until someone notices the failure in logs. An operator MAY override the
default via environment configuration to pin a specific model when reproducibility is
required.

#### Scenario: Default model resolves to a currently-available model

- **WHEN** the Gemini engine is used with no model override configured
- **THEN** the model it requests is currently available (not a retired snapshot)

#### Scenario: Environment override pins a specific model

- **WHEN** an operator sets a model override in the server environment
- **THEN** the Gemini engine uses that model instead of the default alias
