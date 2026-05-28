## MODIFIED Requirements

### Requirement: Generator HTML escaping SHALL be consistent across all helpers
All HTML escaping functions in the generator SHALL escape the same 5 entities: `&`, `<`, `>`, `"`, `'`.

#### Scenario: escHtml escapes single quotes
- **WHEN** `escHtml()` is called with a string containing `'`
- **THEN** it SHALL be replaced with `&#x27;`

#### Scenario: av escapes single quotes
- **WHEN** `av()` is called with a string containing `'`
- **THEN** it SHALL be replaced with `&#x27;`

#### Scenario: All 5 entities escaped by escHtml
- **WHEN** `escHtml()` is called with `&<>"'`
- **THEN** the output SHALL be `&amp;&lt;&gt;&quot;&#x27;`

#### Scenario: All 5 entities escaped by av
- **WHEN** `av()` is called with `&<>"'`
- **THEN** the output SHALL be `&amp;&lt;&gt;&quot;&#x27;`

### Requirement: Generator SHALL block embed code copy when no valid reports exist
The generator SHALL disable the Copy button and show a warning when the reports array is empty (all rows incomplete).

#### Scenario: No complete report rows disables Copy
- **WHEN** all report rows have missing labels or missing URLs (getReports() returns empty array)
- **THEN** the Copy button SHALL be disabled and an inline warning SHALL display: "Add at least one area with a label and RPR report URL."

#### Scenario: Valid report rows enable Copy
- **WHEN** at least one report row has both a label and a URL
- **THEN** the Copy button SHALL be enabled and the warning SHALL be hidden

#### Scenario: Copy button re-enables dynamically
- **WHEN** the user adds a complete report row after previously having none
- **THEN** the Copy button SHALL re-enable without requiring a page refresh
