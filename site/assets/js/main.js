/* Dr Soma Traoré — interactions. Aucune dépendance, aucun innerHTML. */
(function () {
  "use strict";

  var PHONE_WA = "22376131888"; // WhatsApp du cabinet (format international, sans +)
  // URL de déploiement du script Google Apps Script (voir GUIDE-MISE-EN-LIGNE.md).
  // Tant qu'elle est vide, le formulaire ouvre WhatsApp à la place.
  var SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbxj1NYtEbrQxlS2Rq7kaSAXz7T-Xy1eNTw3iXlEXKsIrTl3BcrvVtva0Itwe9K0DqgB/exec";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* Année du pied de page */
  var year = $("#annee");
  if (year) year.textContent = String(new Date().getFullYear());

  /* En-tête : fond au défilement */
  var header = $(".site-header");
  function onScroll() {
    if (header) header.classList.toggle("is-stuck", window.scrollY > 24);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Menu mobile */
  var toggle = $(".menu-toggle");
  var menu = $("#menu");
  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
    var label = $(".sr-only", toggle);
    if (label) label.textContent = open ? "Fermer le menu" : "Ouvrir le menu";
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { setMenu(false); toggle.focus(); }
    });
  }

  /* Portrait : si la photo est absente, on garde le monogramme */
  var img = $(".portrait-frame img");
  if (img) {
    var hide = function () { img.classList.add("is-missing"); };
    img.addEventListener("error", hide);
    if (img.complete && img.naturalWidth === 0) hide();
  }

  /* Onglets des lieux (clavier : flèches, Début, Fin) */
  var tabs = $$("[data-tabs] [role=tab]");
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { selectTab(tab, false); });
    tab.addEventListener("keydown", function (e) {
      var next = null;
      if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else if (e.key === "End") next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });
  });

  /* Formulaire */
  var form = $("#form-rdv");
  if (!form) return;

  var fLieu = $("#f-lieu"), fMotif = $("#f-motif"), fDate = $("#f-date");
  var note = $("#form-note"), btnSend = $("#btn-send"), btnWa = $("#btn-wa");
  var openedAt = Date.now();

  var HINTS = {
    "Clinique Cinquantenaire": "La clinique reçoit sur rendez-vous, souvent le dimanche. Le cabinet vous rappellera pour fixer le jour.",
    "Cabinet Mamy Keïta": "Le cabinet reçoit du lundi au vendredi, de 8 h à 16 h."
  };
  var DEFAULT_HINT = "La clinique reçoit sur rendez-vous. Le cabinet reçoit du lundi au vendredi, de 8 h à 16 h.";
  var hint = $("#lieu-hint");
  function updateHint() { if (hint) hint.textContent = HINTS[fLieu.value] || DEFAULT_HINT; }
  fLieu.addEventListener("change", function () { updateHint(); setError("f-date", ""); });

  // Les liens « prendre rendez-vous » pré-remplissent le formulaire
  $$("[data-lieu]").forEach(function (a) {
    a.addEventListener("click", function () { fLieu.value = a.getAttribute("data-lieu"); updateHint(); });
  });
  $$("[data-motif]").forEach(function (a) {
    a.addEventListener("click", function () { fMotif.value = a.getAttribute("data-motif"); });
  });

  // Date minimale : aujourd'hui (heure locale)
  var d = new Date();
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  fDate.min = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

  function clean(value, max) {
    return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  }
  function setError(id, message) {
    var box = $('[data-error-for="' + id + '"]');
    var input = document.getElementById(id);
    if (box) box.textContent = message || "";
    if (input) {
      input.setAttribute("aria-invalid", message ? "true" : "false");
      if (message && box) { box.id = box.id || id + "-err"; input.setAttribute("aria-describedby", box.id); }
      input.closest(".field").classList.toggle("has-error", !!message);
    }
    return !message;
  }
  function frDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? m[3] + "/" + m[2] + "/" + m[1] : "";
  }
  function setNote(text, kind) {
    if (!note) return;
    note.textContent = text;
    note.classList.toggle("is-ok", kind === "ok");
    note.classList.toggle("is-error", kind === "error");
  }

  // Lit et valide le formulaire. Retourne null si une erreur est affichée.
  function collect() {
    var data = {
      nom: clean($("#f-nom").value, 80),
      tel: clean($("#f-tel").value, 20),
      lieu: clean(fLieu.value, 60),
      motif: clean(fMotif.value, 60),
      date: fDate.value,
      creneau: clean($("#f-creneau").value, 30),
      message: clean($("#f-msg").value, 400)
    };
    var digits = data.tel.replace(/\D/g, "");
    var ok = true;
    ok = setError("f-nom", data.nom.length < 2 ? "Indiquez votre nom." : "") && ok;
    ok = setError("f-tel", digits.length < 8 || !/^[+\d\s().-]+$/.test(data.tel) ? "Indiquez un numéro valide, par exemple 70 00 00 00." : "") && ok;
    ok = setError("f-lieu", !data.lieu ? "Choisissez la clinique ou le cabinet." : "") && ok;
    ok = setError("f-motif", !data.motif ? "Choisissez un motif." : "") && ok;

    var dateMsg = "";
    if (data.date) {
      var parts = data.date.split("-");
      var picked = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      var today = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      var dow = picked.getDay(); // 0 = dimanche, 6 = samedi
      if (isNaN(picked.getTime()) || picked < today) dateMsg = "Choisissez une date à partir d'aujourd'hui.";
      else if (data.lieu === "Cabinet Mamy Keïta" && (dow === 0 || dow === 6)) dateMsg = "Le cabinet reçoit du lundi au vendredi. Choisissez un autre jour.";
    }
    ok = setError("f-date", dateMsg) && ok;

    if (!ok) {
      var first = $(".has-error input, .has-error select", form);
      if (first) first.focus();
      return null;
    }
    return data;
  }

  function whatsappUrl(data) {
    var lines = [
      "Bonjour Docteur Traoré, je souhaite prendre rendez-vous.",
      "",
      "Nom : " + data.nom,
      "Téléphone : " + data.tel,
      "Lieu : " + data.lieu,
      "Motif : " + data.motif
    ];
    if (data.date) lines.push("Jour souhaité : " + frDate(data.date));
    if (data.creneau) lines.push("Moment : " + data.creneau);
    if (data.message) lines.push("Message : " + data.message);
    lines.push("", "Merci de me confirmer un créneau.");
    return "https://wa.me/" + PHONE_WA + "?text=" + encodeURIComponent(lines.join("\n"));
  }
  function openWhatsApp(data) {
    var w = window.open(whatsappUrl(data), "_blank", "noopener,noreferrer");
    setNote(w
      ? "WhatsApp s'est ouvert avec votre demande. Appuyez sur Envoyer pour la transmettre."
      : "Impossible d'ouvrir WhatsApp. Appelez le 76 13 18 88 pour prendre rendez-vous.", w ? "ok" : "error");
  }

  // Envoi vers Google Sheets (Apps Script). Requête « simple » : pas de pré-vérification CORS.
  function sendToSheet(data) {
    var payload = {
      nom: data.nom, tel: data.tel, lieu: data.lieu, motif: data.motif,
      date: data.date ? frDate(data.date) : "", creneau: data.creneau, message: data.message,
      site: $("#f-site").value,                 // piège à robots : doit rester vide
      elapsed: Date.now() - openedAt           // durée passée sur le formulaire
    };
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    return fetch(SHEET_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(payload),
      redirect: "follow",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      clearTimeout(timer);
      return res.json();
    }).then(function (json) {
      if (!json || json.ok !== true) throw new Error("refus");
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = collect();
    if (!data) return;

    if (!SHEET_ENDPOINT) { openWhatsApp(data); return; }

    btnSend.disabled = true;
    btnSend.textContent = "Envoi en cours";
    setNote("", "");
    sendToSheet(data).then(function () {
      form.reset();
      updateHint();
      openedAt = Date.now();
      setNote("Merci, votre demande est bien reçue. Le cabinet vous rappelle pour confirmer le rendez-vous.", "ok");
    }).catch(function () {
      setNote("Votre demande n'a pas pu être envoyée. Réessayez, écrivez par WhatsApp ou appelez le 76 13 18 88.", "error");
    }).then(function () {
      btnSend.disabled = false;
      btnSend.textContent = "Envoyer ma demande";
    });
  });

  btnWa.addEventListener("click", function () {
    var data = collect();
    if (data) openWhatsApp(data);
  });

  // Efface l'erreur dès que le champ est corrigé
  $$("input, select", form).forEach(function (el) {
    el.addEventListener("input", function () { if (el.id) setError(el.id, ""); });
  });
})();
