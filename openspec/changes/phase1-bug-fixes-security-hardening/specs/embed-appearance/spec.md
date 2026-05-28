## MODIFIED Requirements

### Requirement: Card colors SHALL be validated before CSS injection
The `data-card-bg` and `data-card-text` attributes SHALL be validated with `isValidHex()` before being set as CSS custom properties, falling back to defaults on invalid input.

#### Scenario: Valid card background color applied
- **WHEN** `data-card-bg` contains a valid hex color (e.g., `#f0f0f0`)
- **THEN** the widget SHALL set `--rpr-r-card-bg` to that color

#### Scenario: Invalid card background falls back to white
- **WHEN** `data-card-bg` contains an invalid value (e.g., `red`, `not-a-color`, empty)
- **THEN** the widget SHALL set `CFG.cardBg` to `#ffffff` and log a console.warn

#### Scenario: Valid card text color applied
- **WHEN** `data-card-text` contains a valid hex color (e.g., `#111111`)
- **THEN** the widget SHALL set `--rpr-r-card-text` to that color

#### Scenario: Invalid card text falls back to dark gray
- **WHEN** `data-card-text` contains an invalid value
- **THEN** the widget SHALL set `CFG.cardText` to `#333333` and log a console.warn

### Requirement: Widget default brand color SHALL match generator
The widget's default brand color SHALL be `#0086E6` (RPR blue), matching the generator default.

#### Scenario: No data-color-brand attribute
- **WHEN** the embed code does not include `data-color-brand`
- **THEN** the widget SHALL use `#0086E6` as the brand color

#### Scenario: Invalid data-color-brand falls back to RPR blue
- **WHEN** `data-color-brand` contains an invalid hex value
- **THEN** the widget SHALL fall back to `#0086E6` (not `#1a1a2e`)
