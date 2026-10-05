/**
 * iPEC — Google Sheets sync endpoint
 * ---------------------------------------------------------------
 * This turns a Google Sheet into a live results collector.
 * Every quiz submission from the app is appended as a new row.
 *
 * SETUP (5 minutes, free):
 * 1. Create a new Google Sheet. Note its name.
 * 2. Extensions > Apps Script. Delete any code, paste THIS file.
 * 3. Click Deploy > New deployment > type "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the Web app URL it gives you.
 * 5. Put that URL in the app's .env as VITE_SHEETS_WEBHOOK=...
 *    (and in Vercel/Netlify environment variables for production).
 *
 * The first row (headers) is created automatically.
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Results')
             || SpreadsheetApp.getActiveSpreadsheet().insertSheet('Results');

    // add header row once
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Name', 'Batch', 'Day', 'Score', 'Total', 'Percentage', 'Focus Areas']);
    }

    var d = JSON.parse(e.postData.contents);
    sheet.appendRow([
      d.completedAt || new Date().toISOString(),
      d.name || '',
      d.batch || '',
      d.day,
      d.score,
      d.total,
      d.percentage,
      d.weak || ''
    ]);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('iPEC Sheets sync is live.');
}
