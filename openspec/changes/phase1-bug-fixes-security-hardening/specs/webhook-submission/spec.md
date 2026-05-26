## MODIFIED Requirements

### Requirement: Widget SHALL treat non-OK HTTP responses as submission failure
The widget SHALL treat webhook responses with HTTP status 4xx or 5xx as failures, not successes. The visitor SHALL NOT advance to step 2 when the webhook fails.

#### Scenario: HTTP 2xx shows success and advances to step 2
- **WHEN** the webhook POST returns HTTP 200, 201, or 202
- **THEN** the widget SHALL show step 2 with the report card and set `_rprSubmitted = true`

#### Scenario: HTTP 5xx shows retriable error and stays on step 1
- **WHEN** the webhook POST returns HTTP 500, 502, 503, or 504
- **THEN** the widget SHALL show "Something went wrong — please try again." in red, re-enable the submit button, and reset `_rprSubmitted` to false

#### Scenario: HTTP 4xx shows non-retriable error and stays on step 1
- **WHEN** the webhook POST returns HTTP 400, 401, 403, or 404
- **THEN** the widget SHALL show "Lead could not be delivered — please contact the site owner." in red, re-enable the submit button, and reset `_rprSubmitted` to false

#### Scenario: Network error shows retriable error and stays on step 1
- **WHEN** the webhook POST throws a network error (fetch rejects)
- **THEN** the widget SHALL show "Something went wrong — please try again." in red, re-enable the submit button, and reset `_rprSubmitted` to false

### Requirement: Widget SHALL prevent duplicate webhook submissions
The widget SHALL lock the form immediately on submit click, before the fetch call, to prevent race-condition double submissions.

#### Scenario: Submission lock set before fetch
- **WHEN** the user clicks the submit button and validation passes
- **THEN** the widget SHALL set `_rprSubmitted = true` and `btn.disabled = true` BEFORE initiating the fetch call

#### Scenario: Lock released on retriable failure
- **WHEN** the webhook returns 5xx or a network error occurs
- **THEN** the widget SHALL reset `_rprSubmitted = false` and `btn.disabled = false` to allow retry

#### Scenario: Lock released on non-retriable failure
- **WHEN** the webhook returns 4xx
- **THEN** the widget SHALL reset `_rprSubmitted = false` and `btn.disabled = false`

#### Scenario: Lock maintained on success
- **WHEN** the webhook returns 2xx
- **THEN** the widget SHALL keep `_rprSubmitted = true` and transition to step 2

#### Scenario: Double-click prevented
- **WHEN** the user clicks the submit button twice rapidly
- **THEN** only one webhook POST SHALL be sent (second click blocked by `_rprSubmitted` guard)
