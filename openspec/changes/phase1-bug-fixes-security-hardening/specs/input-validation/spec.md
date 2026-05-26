## ADDED Requirements

### Requirement: Form fields SHALL enforce maxlength constraints
All text input fields in the widget form SHALL have `maxlength` attributes to prevent oversized webhook payloads.

#### Scenario: Name fields capped at 100 characters
- **WHEN** the widget renders first_name or last_name fields
- **THEN** the input elements SHALL have `maxlength="100"`

#### Scenario: Email field capped at 254 characters
- **WHEN** the widget renders the email field
- **THEN** the input element SHALL have `maxlength="254"`

#### Scenario: Phone field capped at 20 characters
- **WHEN** the widget renders the phone field
- **THEN** the input element SHALL have `maxlength="20"`

### Requirement: Phone number SHALL be validated when non-empty
When the phone field contains a value on form submission, the widget SHALL validate it against a permissive international pattern.

#### Scenario: Valid phone numbers accepted
- **WHEN** the user enters a phone number matching `^\+?[\d\s\-().]{7,20}$` (digits, spaces, hyphens, parens, optional leading +)
- **THEN** validation SHALL pass

#### Scenario: Invalid phone numbers rejected
- **WHEN** the user enters a phone value that does not match the pattern (e.g., "abc", "12")
- **THEN** the widget SHALL show an error message "Please enter a valid phone number" below the phone field

#### Scenario: Empty phone field is valid
- **WHEN** the phone field is empty on submission
- **THEN** phone validation SHALL pass (phone is optional)
