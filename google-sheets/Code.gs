/**
 * Dr Soma Traoré — réception des demandes de rendez-vous dans Google Sheets.
 *
 * Installation : voir GUIDE-MISE-EN-LIGNE.md (étape 1).
 * Ce script reçoit le formulaire du site, le contrôle, puis ajoute une ligne au tableau.
 */

// Adresse qui reçoit un email à chaque demande. Laisser vide pour ne pas envoyer d'email.
var NOTIFY_EMAIL = "traorenoumoutene684@gmail.com";

var SHEET_NAME = "Demandes";
var HEADERS = ["Reçue le", "Statut", "Nom", "Téléphone", "Lieu", "Motif", "Jour souhaité", "Moment", "Message"];
var LIEUX = ["Clinique Cinquantenaire", "Cabinet Mamy Keïta"];
var MOTIFS = ["Médecine générale", "Accouchement", "Petite chirurgie", "Échographie de la femme enceinte", "Analyses de sang", "Autre demande"];
var MAX_PAR_NUMERO_PAR_HEURE = 3;
var MAX_TOTAL_PAR_HEURE = 60;

/** À exécuter une fois : crée l'onglet, les titres et la mise en forme. */
function installer() {
  var sheet = getSheet_();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#0b1e28").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, HEADERS.length, 150);
    sheet.setColumnWidth(9, 320);
  }
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Nouveau", "Rappelé", "Confirmé", "Annulé", "Terminé"], true).build();
  sheet.getRange("B2:B2000").setDataValidation(rule);
}

function doGet() {
  return json_({ ok: true, service: "demandes-rdv" });
}

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : "";
    if (raw.length > 5000) return json_({ ok: false });
    var d = JSON.parse(raw);

    // Piège à robots : le champ caché est rempli, ou le formulaire a été envoyé trop vite.
    // On répond « ok » pour ne pas donner d'indice au robot, mais on n'enregistre rien.
    if (d.site || Number(d.elapsed) < 2500) return json_({ ok: true });

    var nom = clean_(d.nom, 80);
    var tel = clean_(d.tel, 20);
    var lieu = clean_(d.lieu, 60);
    var motif = clean_(d.motif, 60);
    var jour = clean_(d.date, 10);
    var moment = clean_(d.creneau, 30);
    var message = clean_(d.message, 400);

    var chiffres = tel.replace(/\D/g, "");
    if (nom.length < 2 || chiffres.length < 8 || !/^[+\d\s().-]+$/.test(tel)) return json_({ ok: false });
    if (LIEUX.indexOf(lieu) === -1 || MOTIFS.indexOf(motif) === -1) return json_({ ok: false });
    if (jour && !/^\d{2}\/\d{2}\/\d{4}$/.test(jour)) return json_({ ok: false });
    if (["", "Le matin", "L'après-midi"].indexOf(moment) === -1) return json_({ ok: false });

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (limite_("tel_" + chiffres.slice(-8), MAX_PAR_NUMERO_PAR_HEURE) || limite_("total", MAX_TOTAL_PAR_HEURE)) {
        return json_({ ok: false, raison: "limite" });
      }
      var sheet = getSheet_();
      sheet.appendRow([new Date(), "Nouveau", safe_(nom), safe_(tel), lieu, motif, safe_(jour), moment, safe_(message)]);
    } finally {
      lock.releaseLock();
    }

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: "Nouvelle demande de rendez-vous : " + nom,
        body: "Nom : " + nom + "\nTéléphone : " + tel + "\nLieu : " + lieu + "\nMotif : " + motif +
              "\nJour souhaité : " + (jour || "non précisé") + "\nMoment : " + (moment || "peu importe") +
              (message ? "\nMessage : " + message : "") + "\n\nÀ rappeler pour confirmer."
      });
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false });
  }
}

/* ---------- Outils ---------- */

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

// Compte les envois par heure. Retourne true si la limite est dépassée.
function limite_(cle, max) {
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get(cle) || 0);
  if (n >= max) return true;
  cache.put(cle, String(n + 1), 3600);
  return false;
}

// Retire les caractères de contrôle, les espaces en trop, et tronque.
function clean_(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

// Empêche l'injection de formules dans Google Sheets (=, +, -, @ en début de cellule).
function safe_(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
