## ADDED Requirements

### Requirement: Reader email

Each `Reader` SHALL carry a unique `email`. The email is used to map a magic-link login to its reader (ADR-0012) and SHALL be editable from the profile-management view. No two readers SHALL share the same email.

#### Scenario: Email is set on a reader
- **WHEN** an editor sets a reader's email to a valid address
- **THEN** the email is persisted on the reader

#### Scenario: Email uniqueness enforced
- **WHEN** an email already used by one reader is assigned to another reader
- **THEN** the assignment is rejected to keep emails unique

#### Scenario: Login maps email to reader
- **WHEN** a reader authenticates with the email registered on their profile
- **THEN** the system resolves that login to the matching reader
