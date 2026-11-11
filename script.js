/* ------------------------------------------------------------
   CONFIG — vyplňte před spuštěním / fill in before launch
   formEndpoint: Formspree URL, e.g. "https://formspree.io/f/XXXX"
                 (formulář se odešle přes fetch POST / form is sent via fetch POST)
   email:        e-mail pro mailto: záložní odeslání a kontaktní kartu
                 (used for mailto: fallback and the contact card)
   phone:        telefon v mezinárodním tvaru, e.g. "+420123456789"
                 (shows phone + WhatsApp cards)
   Prázdná hodnota = daná funkce se nezobrazí / empty = feature hidden.
------------------------------------------------------------ */
const CONFIG = { formEndpoint: "", email: "impulsdigita@gmail.com", phone: "" };

(function () {
  "use strict";
  document.documentElement.classList.add("js");

  const $ = (s, r = document) => r.querySelector(s);
  const ICON = (id) => '<svg class="icon" aria-hidden="true"><use href="#' + id + '"/></svg>';

  /* Year */
  const yr = $("#year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* Mobile menu */
  const toggle = $(".nav-toggle");
  const nav = $("#nav");
  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Zavřít menu" : "Otevřít menu");
    nav.classList.toggle("open", open);
  }
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") { setMenu(false); toggle.focus(); }
  });

  /* Reveal on scroll */
  const items = document.querySelectorAll(".reveal");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach((el) => {
      const idx = Array.prototype.indexOf.call(el.parentElement.children, el);
      el.style.transitionDelay = Math.min(idx, 5) * 70 + "ms";
      io.observe(el);
    });
  }

  /* Contact cards (only if configured) */
  const cards = $("#contact-cards");
  const html = [];
  if (CONFIG.email) html.push('<a href="mailto:' + CONFIG.email + '">' + ICON("i-mail") + "<span>" + CONFIG.email + "</span></a>");
  if (CONFIG.phone) {
    const digits = CONFIG.phone.replace(/\D/g, "");
    html.push('<a href="tel:' + CONFIG.phone.replace(/[^\d+]/g, "") + '">' + ICON("i-phone") + "<span>" + CONFIG.phone + "</span></a>");
    html.push('<a href="https://wa.me/' + digits + '" target="_blank" rel="noopener">' + ICON("i-chat") + "<span>WhatsApp</span></a>");
  }
  if (html.length) { cards.innerHTML = html.join(""); cards.hidden = false; }

  /* Form */
  const form = $("#contact-form");
  const status = $("#form-status");
  const f = { name: $("#f-name"), company: $("#f-firm"), contact: $("#f-contact"), message: $("#f-msg") };

  function setStatus(msg, type) { status.textContent = msg; status.className = "status" + (type ? " " + type : ""); }
  function validContact(v) {
    v = v.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || v.replace(/\D/g, "").length >= 9;
  }
  function check(key) {
    const el = f[key], v = el.value.trim();
    const ok = key === "contact" ? validContact(v) : v.length > 0;
    el.closest(".field").classList.toggle("invalid", !ok);
    el.setAttribute("aria-invalid", String(!ok));
    return ok;
  }
  ["name", "contact", "message"].forEach((k) => {
    f[k].addEventListener("blur", () => check(k));
    f[k].addEventListener("input", () => { if (f[k].closest(".field").classList.contains("invalid")) check(k); });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("", "");
    const bad = ["name", "contact", "message"].filter((k) => !check(k));
    if (bad.length) { f[bad[0]].focus(); setStatus("Zkontrolujte prosím zvýrazněná pole.", "bad"); return; }
    if (form.elements["_gotcha"].value) return; /* spam honeypot */

    if (CONFIG.formEndpoint) {
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        const res = await fetch(CONFIG.formEndpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("HTTP " + res.status);
        form.reset();
        setStatus("Děkuji, poptávka je odeslaná. Ozvu se vám do 24 hodin.", "ok");
      } catch (err) {
        setStatus("Odeslání se nepovedlo. Zkuste to prosím znovu nebo mi napište e-mailem.", "bad");
      } finally { btn.disabled = false; }
    } else if (CONFIG.email) {
      const body = "Jméno: " + f.name.value + "\nFirma: " + f.company.value + "\nKontakt: " + f.contact.value + "\n\n" + f.message.value;
      window.location.href = "mailto:" + CONFIG.email + "?subject=" + encodeURIComponent("Poptávka webu") + "&body=" + encodeURIComponent(body);
      setStatus("Otevírám váš e-mailový program. Pokud se neotevřel, napište mi prosím na " + CONFIG.email + ".", "ok");
    } else {
      setStatus("Formulář se právě nastavuje. Zkuste to prosím později.", "warn");
    }
  });
})();
