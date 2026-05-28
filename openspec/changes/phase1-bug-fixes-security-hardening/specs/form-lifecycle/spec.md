## MODIFIED Requirements

### Requirement: Back button SHALL reset form to resubmittable state
When the user clicks Back from step 2, the widget SHALL fully reset the form state so the user can modify their input and resubmit.

#### Scenario: Back button enables resubmission
- **WHEN** the user clicks the Back button on step 2
- **THEN** the widget SHALL call `_rprReset()`, which sets `_rprSubmitted = false`, re-enables the submit button, clears all field values and error messages, and shows step 1

#### Scenario: User can resubmit after clicking Back
- **WHEN** the user fills in the form and clicks submit after clicking Back
- **THEN** the webhook SHALL fire normally with the new form data

### Requirement: Escape key SHALL only close open overlays
The Escape key handler SHALL only trigger overlay close when the overlay is actually open. It SHALL NOT reset hidden form state when no overlay is visible.

#### Scenario: Escape closes open floating overlay
- **WHEN** the floating overlay has class `open` and the user presses Escape
- **THEN** the widget SHALL call `closeOverlay()` which removes the `open` class and resets the form

#### Scenario: Escape closes open modal overlay
- **WHEN** the modal overlay has class `open` and the user presses Escape
- **THEN** the widget SHALL call `closeOverlay()` which removes the `open` class and resets the form

#### Scenario: Escape ignored when overlay is closed
- **WHEN** the overlay does NOT have class `open` and the user presses Escape
- **THEN** the widget SHALL NOT call `closeOverlay()` or `_rprReset()`

#### Scenario: Multiple widgets do not duplicate Escape behavior
- **WHEN** two widget instances exist on the same page, both in floating mode
- **THEN** each widget's Escape handler SHALL only close its own overlay if open
