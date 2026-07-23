/**
 * Google Apps Script for Auto-Assigning Meta Leads to Sales Executives in WishPro CRM
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet where Meta leads are added.
 * 2. Click on "Extensions" (एक्सटेंशन) -> "Apps Script" (ऐप्स स्क्रिप्ट).
 * 3. Delete any code in Code.gs and paste this entire code below.
 * 4. Replace `WEBHOOK_URL` with your Convex deployment HTTP URL:
 *    Example: "https://your-convex-deployment.convex.site/api/webhook/meta-lead"
 * 5. Save the project (Ctrl + S or Cmd + S).
 * 6. Click on the Clock Icon (Triggers) on the left sidebar:
 *    - Click "+ Add Trigger"
 *    - Choose function to run: `onFormSubmitOrEdit`
 *    - Select event type: "On form submit" (or "On edit" / "Change")
 *    - Save.
 */

// Replace this URL with your Convex HTTP URL (found in Convex Dashboard or deployment site)
const WEBHOOK_URL = "https://<your-convex-app>.convex.site/api/webhook/meta-lead";

function sendLeadToCRM(name, phone, email, notes, source) {
  if (!phone) {
    Logger.log("Skipping: Phone number missing");
    return;
  }

  const payload = {
    name: name || "Meta Lead",
    phone: String(phone),
    email: email || "",
    notes: notes || "Lead received from Meta Ads Google Sheet",
    source: source || "Meta"
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log("CRM Response: " + response.getContentText());
  } catch (error) {
    Logger.log("Error sending lead to CRM: " + error.toString());
  }
}

/**
 * Triggered automatically when a new row is added or form is submitted
 */
function onFormSubmitOrEdit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  var rowData = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Adjust column indexes based on your Google Sheet columns (1st column = 0, 2nd = 1, etc.)
  // Example Assuming: Col 1 = Name, Col 2 = Phone, Col 3 = Email, Col 4 = Notes
  var name = rowData[0];
  var phone = rowData[1];
  var email = rowData[2];
  var notes = rowData[3];

  sendLeadToCRM(name, phone, email, notes, "Meta");
}
