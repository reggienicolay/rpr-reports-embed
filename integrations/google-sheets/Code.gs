/**
 * RPR Market Reports — Google Sheets webhook receiver
 *
 * This Apps Script is bound to the master template Google Sheet.
 * When an agent makes a copy of the template (via the force-copy URL),
 * the script comes with it. The agent then deploys the script as a
 * Web App and pastes the resulting URL into the RPR embed generator
 * as their "Webhook URL".
 *
 * The widget POSTs lead data to this Web App URL. The script parses
 * the JSON body and appends a row to the Sheet.
 *
 * Tolerates both Content-Types we send:
 *   - application/json — used by live form submissions
 *   - text/plain       — used by the generator's "Send test" button
 *                        (no-cors mode forces text/plain to dodge
 *                        CORS preflight on Slack/Discord/etc.)
 *
 * The widget supports two form modes:
 *   - "minimal" → only email + selected_area; first/last/phone arrive empty
 *   - "full"    → first_name + last_name + email + phone + selected_area
 * Either way, every row written to the Sheet has all 7 columns.
 *
 * If you ever need to update this script:
 *   1. Edit it in the master template Sheet
 *   2. Click Deploy > Manage Deployments > pencil icon > New Version > Deploy
 *   3. Existing agents who copied the template before the update keep their
 *      old behavior (their copy of the script doesn't auto-update). Tell
 *      them to make a fresh copy if they want the new version.
 */

const COLUMNS = [
  'Timestamp',
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Area',
  'Report URL'
];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: 'No POST body received' });
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse({ ok: false, error: 'Body is not valid JSON' });
    }

    const sheet = getOrCreateLeadsSheet();

    sheet.appendRow([
      new Date(),
      String(data.first_name    || ''),
      String(data.last_name     || ''),
      String(data.email         || ''),
      String(data.phone         || ''),
      String(data.selected_area || ''),
      String(data.report_url    || '')
    ]);

    return jsonResponse({ ok: true });
  } catch (err) {
    /* Swallow and log — never throw out of doPost, or Google returns
       a 500 to the widget and the agent thinks the form is broken. */
    console.error('RPR webhook error:', err);
    return jsonResponse({ ok: false, error: String(err) });
  }
}

/**
 * Optional: lets agents test the deployment by visiting the Web App URL
 * in a browser. Returns a friendly status page.
 */
function doGet() {
  const html = HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><body style="font-family:system-ui;padding:40px;max-width:480px;margin:0 auto">' +
    '<h2 style="color:#0086E6">RPR webhook receiver — active</h2>' +
    '<p>This Web App is correctly deployed and listening for POSTs.</p>' +
    '<p>Paste this page&rsquo;s URL into the RPR embed generator as your <strong>Webhook URL</strong>.</p>' +
    '</body></html>'
  );
  return html;
}

/**
 * Returns the "Leads" sheet, creating it (with headers) if missing.
 * Falls back to the active sheet so the script still works in a Sheet
 * that was set up with a different first-tab name.
 */
function getOrCreateLeadsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Leads');

  if (!sheet) {
    /* If the workbook has only the default "Sheet1" with our headers,
       use that. Otherwise create a fresh "Leads" tab. */
    const active = ss.getActiveSheet();
    const firstRow = active.getRange(1, 1, 1, COLUMNS.length).getValues()[0];
    if (firstRow.join('|') === COLUMNS.join('|')) {
      sheet = active;
    } else {
      sheet = ss.insertSheet('Leads');
      sheet.appendRow(COLUMNS);
      sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }

  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
