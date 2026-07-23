/**
 * Google Apps Script for Auto-Assigning Meta Leads to Sales Executives in WishPro CRM
 * 
 * Column Mapping (Based on Meta Ads Lead Form):
 * Column A (0): Plot Size (what_size_of_plot_are_you_looking?)
 * Column B (1): Budget (what_is_your_budget?)
 * Column C (2): Full Name (full_name)
 * Column D (3): Phone Number (phone_number)
 * Column E (4): Email (email)
 * Column F (5): City (city)
 */

const WEBHOOK_URL = "https://strong-tapir-797.convex.site/api/webhook/meta-lead";

function sendLeadToCRM(name, phone, email, plotSize, budget, city) {
  if (!phone) {
    Logger.log("Skipping: Phone number missing");
    return;
  }

  // Clean phone number (removes p:+91 prefix or non-digit characters)
  var cleanPhone = String(phone).replace(/\D/g, "").slice(-10);

  const payload = {
    name: name || "Meta Lead",
    phone: cleanPhone,
    email: email || "",
    plot_size: plotSize || "",
    budget: budget || "",
    city: city || "",
    project_name: "Vrinda Green City",
    source: "Meta"
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

  // Column Index Mapping:
  var plotSize = rowData[0]; // Col A: Plot Size
  var budget   = rowData[1]; // Col B: Budget
  var name     = rowData[2]; // Col C: Full Name
  var phone    = rowData[3]; // Col D: Phone Number (e.g. p:+919308964802)
  var email    = rowData[4]; // Col E: Email
  var city     = rowData[5]; // Col F: City

  sendLeadToCRM(name, phone, email, plotSize, budget, city);
}

/**
 * Run this function once in Apps Script Editor (Click Run ▶)
 * to sync & auto-assign all existing sheet rows to CRM!
 */
function syncAllSheetLeads() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    Logger.log("No data rows found in sheet.");
    return;
  }

  // Fetch all data rows (starting from Row 2)
  var range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  var rows = range.getValues();

  Logger.log("Starting sync for " + rows.length + " rows...");

  for (var i = 0; i < rows.length; i++) {
    var rowData = rows[i];
    var plotSize = rowData[0];
    var budget   = rowData[1];
    var name     = rowData[2];
    var phone    = rowData[3];
    var email    = rowData[4];
    var city     = rowData[5];

    if (phone) {
      sendLeadToCRM(name, phone, email, plotSize, budget, city);
      Utilities.sleep(300); // 300ms pause between requests
    }
  }

  Logger.log("Sync completed successfully!");
}

