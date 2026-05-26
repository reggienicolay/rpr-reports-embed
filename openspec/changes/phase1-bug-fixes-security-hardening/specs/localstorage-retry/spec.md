## ADDED Requirements

### Requirement: Widget SHALL queue failed webhook submissions for retry
When a webhook submission fails due to network error or HTTP 5xx, the widget SHALL store the payload in localStorage for automatic retry on the next widget load. HTTP 4xx failures SHALL NOT be queued (non-retriable).

#### Scenario: Network error triggers retry queue
- **WHEN** a webhook POST throws a network error (fetch rejects)
- **THEN** the widget SHALL store the payload in `localStorage` under key `rpr_retry_queue` with the webhook URL, payload, timestamp, and attempt count of 0

#### Scenario: HTTP 5xx triggers retry queue
- **WHEN** a webhook POST returns HTTP 500, 502, 503, or 504
- **THEN** the widget SHALL enqueue the payload for retry, same as network error

#### Scenario: HTTP 4xx does not trigger retry queue
- **WHEN** a webhook POST returns HTTP 400, 401, 403, or 404
- **THEN** the widget SHALL NOT enqueue the payload (non-retriable configuration error)

#### Scenario: Queue processes on widget init
- **WHEN** the widget initializes and `rpr_retry_queue` contains pending entries
- **THEN** the widget SHALL process each entry silently in the background, using exponential backoff (1s after 1st failure, 5s after 2nd, 30s after 3rd)

#### Scenario: Entry discarded after 3 attempts
- **WHEN** a retry entry has been attempted 3 times and still fails
- **THEN** the widget SHALL remove it from the queue permanently

#### Scenario: Queue capped at 10 items
- **WHEN** a new retry entry would exceed 10 items in the queue
- **THEN** the widget SHALL discard the oldest entry to make room

#### Scenario: Stale entries cleaned up
- **WHEN** a retry entry is older than 24 hours
- **THEN** the widget SHALL discard it regardless of attempt count

#### Scenario: localStorage unavailable
- **WHEN** localStorage is not available (private browsing, quota exceeded, SecurityError)
- **THEN** the widget SHALL silently skip retry queueing without breaking the submission flow
