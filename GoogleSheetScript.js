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

/**
 * Smart Dynamic Parser — Auto detects Phone, Name, Email, Plot Size, Budget, City
 */
function parseRowData(rowData, headers) {
  var name = "", phone = "", email = "", plotSize = "", budget = "", city = "", extraNotes = "";

  // 1. Direct Column C Mapping for Customer Full Name
  if (rowData.length > 2) {
    var rawName = String(rowData[2] || "").trim();
    if (rawName && rawName.indexOf("full_name") === -1 && rawName.indexOf("Ad -") === -1 && rawName.indexOf("Ad Set") === -1) {
      name = rawName;
    }
  }

  for (var j = 0; j < rowData.length; j++) {
    var val = String(rowData[j] || "").trim();
    if (!val) continue;

    var header = headers && headers[j] ? String(headers[j]).toLowerCase() : "";

    // Skip header labels
    if (val.indexOf("phone_number") !== -1 || val.indexOf("full_name") !== -1 || val === "email" || val === "city") {
      continue;
    }

    var digits = val.replace(/\D/g, "");

    // 2. Phone Number Detection (p:+91 or 10-12 digits, skipping Campaign names)
    if (!phone && (val.indexOf("p:") === 0 || val.indexOf("+91") === 0 || (digits.length >= 10 && digits.length <= 13)) && val.indexOf("Ad -") === -1 && val.indexOf("Ad Set") === -1 && header.indexOf("campaign") === -1) {
      phone = digits.length >= 10 ? digits.slice(-10) : digits;
    }
    // 3. Email Detection
    else if (!email && val.indexOf("@") !== -1) {
      email = val;
    }
    // 4. Fallback Name Detection if Col C was empty
    else if (!name && (header.indexOf("full_name") !== -1 || header.indexOf("name") !== -1) && val.indexOf("Ad -") === -1 && val.indexOf("Ad Set") === -1) {
      name = val;
    }
    // 5. Plot Size Detection
    else if (!plotSize && (j === 0 || header.indexOf("plot") !== -1 || val.indexOf("sq") !== -1 || val.indexOf("feet") !== -1)) {
      plotSize = val;
    }
    // 6. Budget Detection
    else if (!budget && (j === 1 || header.indexOf("budget") !== -1 || val.indexOf("lac") !== -1 || val.indexOf("lakh") !== -1 || val.indexOf("L") !== -1)) {
      budget = val;
    }
    // 7. City Detection
    else if (!city && (header.indexOf("city") !== -1 || val.toLowerCase().indexOf("patna") !== -1)) {
      city = val;
    }
    else if (val.indexOf("Ad -") !== -1 || val.indexOf("Ad Set") !== -1) {
      extraNotes += (extraNotes ? " | " : "") + "Campaign: " + val;
    }
    else {
      extraNotes += (extraNotes ? " | " : "") + val;
    }
  }

  return {
    name: name || "Meta Lead",
    phone: phone,
    email: email,
    plotSize: plotSize,
    budget: budget,
    city: city,
    notes: extraNotes
  };
}

function sendLeadToCRM(leadData) {
  if (!leadData.phone || leadData.phone.length < 7) {
    Logger.log("Skipping invalid lead without phone: " + JSON.stringify(leadData));
    return;
  }

  const payload = {
    name: leadData.name,
    phone: leadData.phone,
    email: leadData.email,
    plot_size: leadData.plotSize,
    budget: leadData.budget,
    city: leadData.city,
    notes: leadData.notes,
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
    Logger.log("CRM Response for " + leadData.name + " (" + leadData.phone + "): " + response.getContentText());
  } catch (error) {
    Logger.log("Error sending lead to CRM: " + error.toString());
  }
}

/**
 * Triggered automatically when a new row is added
 */
function onFormSubmitOrEdit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowData = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];

  var leadData = parseRowData(rowData, headers);
  sendLeadToCRM(leadData);
}

/**
 * Run this function once (Click ▶ Run) to sync all existing leads!
 */
function syncAllSheetLeads() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  Logger.log("Syncing " + rows.length + " rows...");

  for (var i = 0; i < rows.length; i++) {
    var leadData = parseRowData(rows[i], headers);
    if (leadData.phone) {
      sendLeadToCRM(leadData);
      Utilities.sleep(300);
    }
  }

  Logger.log("Sync completed successfully!");
}
