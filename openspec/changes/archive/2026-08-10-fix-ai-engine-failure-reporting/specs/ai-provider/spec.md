## MODIFIED Requirements

### Requirement: Automatic fallback to the secondary engine

The system SHALL automatically retry the same request with the secondary engine when
fallback is enabled and the default engine fails through an error, a timeout, or
reporting itself not configured. The system SHALL record on the result which engine
ultimately answered. When fallback is disabled, a default-engine failure SHALL surface
the error without trying the secondary.

The system SHALL log every engine failure at the moment it occurs, identifying the engine,
before attempting the next one — including a failure that a later engine goes on to cover.

When every attempted engine has failed, the system SHALL raise the typed "no engine
available" error, and that error SHALL carry the underlying per-engine failures so the
concrete cause remains available for diagnosis.

#### Scenario: Default fails, secondary answers

- **WHEN** the default engine throws or times out and `fallbackEnabled` is true
- **THEN** the system completes the identification with the secondary engine and the result
  records `sourceProvider` as the secondary engine

#### Scenario: Provider that answered is recorded

- **WHEN** an identification completes via any engine
- **THEN** the result records `sourceProvider` identifying which engine produced it

#### Scenario: Fallback disabled surfaces the primary error

- **WHEN** the default engine fails and `fallbackEnabled` is false
- **THEN** the system surfaces the error and does not call the secondary engine

#### Scenario: No engine available raises a typed error

- **WHEN** the default engine fails (or is not configured) and the secondary is also not
  configured or also fails
- **THEN** the system raises a typed "no engine available" error rather than returning an
  empty success

#### Scenario: The typed error carries the per-engine causes

- **WHEN** every attempted engine fails and the typed "no engine available" error is raised
- **THEN** each failing engine's underlying error is reachable from the raised error,
  rather than replaced by it

#### Scenario: A covered failure is still logged

- **WHEN** the default engine fails and the secondary answers successfully
- **THEN** the default engine's failure is logged, identifying that engine, even though the
  request as a whole succeeds

#### Scenario: Every failure in an exhausted chain is logged

- **WHEN** two engines are attempted and both fail
- **THEN** both failures are logged, each identifying its engine — not only the last one
