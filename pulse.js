/* =============================================================
   GREAT BOOST PULSE — pulse.js
   Esfera de acompañamiento + diagnóstico de madurez en IA.
   Independiente de GSAP (no todas las páginas lo cargan): toda la
   animación de posición (docking, apertura de modal) usa la técnica
   FLIP (First-Last-Invert-Play) para animar solo `transform`, nunca
   layout — mismo espíritu que ya usa styles.css en .hero-glow-spot.
   ============================================================= */
(function () {
  "use strict";

  var root = document.querySelector("[data-pulse]");
  if (!root) return;

  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[pulse:" + name + "] failed:", e); }
  }

  var mode = root.getAttribute("data-pulse-mode") === "link" ? "link" : "full";
  var trigger = $("[data-pulse-trigger]", root);
  var labelText = $("[data-pulse-label-text]", root);
  var STORAGE_KEY = "gbPulseState";

  /* ---------------------------------------------------------------
     Despertar + anclaje Hero → esquina (FLIP)
     --------------------------------------------------------------- */
  function flip(el, applyFinalState) {
    if (reduced) { applyFinalState(); return; }
    var first = el.getBoundingClientRect();
    applyFinalState();
    var last = el.getBoundingClientRect();
    var dx = first.left - last.left;
    var dy = first.top - last.top;
    if (!dx && !dy) return;
    el.style.transition = "none";
    el.style.transform = "translate3d(" + dx + "px," + dy + "px,0)";
    // Fuerza reflow para que el navegador registre el estado invertido
    // antes de limpiarlo — si no, ambos cambios se funden en un frame.
    el.getBoundingClientRect();
    requestAnimationFrame(function () {
      el.style.transition = "";
      el.style.transform = "";
    });
  }

  function setPulseState(state) {
    if (root.getAttribute("data-pulse-state") === state) return;
    flip(trigger, function () { root.setAttribute("data-pulse-state", state); });
  }

  function initWakeAndDock(skipDelay) {
    var heroEl = $(".hero");

    function wake() {
      var startState = "docked";
      if (heroEl) {
        var r = heroEl.getBoundingClientRect();
        startState = (r.bottom > 80) ? "hero" : "docked";
      }
      root.setAttribute("data-pulse-state", startState);
    }

    if (skipDelay || reduced) {
      wake();
    } else {
      setTimeout(wake, 2400);
    }

    if (!heroEl) return;

    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        setPulseState(entry.isIntersecting ? "hero" : "docked");
      });
    }, { threshold: 0.15 });
    io.observe(heroEl);
  }

  /* ---------------------------------------------------------------
     Mensaje contextual por sección (solo index.html)
     --------------------------------------------------------------- */
  function initContextLabel() {
    if (!labelText) return;
    var sections = $$("[data-pulse-section]");
    if (!sections.length || !("IntersectionObserver" in window)) return;

    var ratios = new Map();
    sections.forEach(function (s) { ratios.set(s, 0); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { ratios.set(entry.target, entry.intersectionRatio); });
      var best = null, bestRatio = 0;
      ratios.forEach(function (ratio, el) {
        if (ratio > bestRatio) { bestRatio = ratio; best = el; }
      });
      if (best && bestRatio > 0) {
        var label = best.getAttribute("data-pulse-label");
        if (label && labelText.textContent !== label) labelText.textContent = label;
      }
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------------------------------------------------------------
     Modo "link" (páginas secundarias sin cuestionario propio)
     --------------------------------------------------------------- */
  function initLinkMode() {
    if (!trigger) return;
    trigger.addEventListener("click", function () {
      window.location.href = "index.html?pulse=open";
    });
  }

  /* ---------------------------------------------------------------
     Modo "full" (index.html) — modal, cuestionario, resultado, lead
     --------------------------------------------------------------- */
  function initFullMode() {
    var overlay = $("[data-pulse-overlay]", root);
    var modal = $("[data-pulse-modal]", root);
    var panel = $("[data-pulse-panel]", root);
    var closeBtn = $("[data-pulse-close]", root);
    var progressFill = $("[data-pulse-progress-fill]", root);
    var stepLabel = $("[data-pulse-step-label]", root);
    var questions = $$("[data-pulse-question]", root);
    var levelItems = $$(".pulse-level-item", root);
    var continueBtn = $("[data-pulse-continue]", root);
    var leadForm = $("[data-pulse-lead-form]", root);
    var finishBtn = $("[data-pulse-finish]", root);
    if (!overlay || !modal || !panel) return;

    var TOTAL_STEPS = questions.length;
    var answers = {};
    var lastFocused = null;
    var scrollbarComp = 0;

    function totalScore() {
      var sum = 0;
      Object.keys(answers).forEach(function (k) { sum += answers[k]; });
      return sum;
    }

    function levelFromScore(score) {
      if (score <= 8) return 1;
      if (score <= 11) return 2;
      if (score <= 14) return 3;
      if (score <= 17) return 4;
      return 5;
    }

    function persist() {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          step: panel.getAttribute("data-pulse-step"),
          phase: panel.getAttribute("data-pulse-phase"),
          level: panel.getAttribute("data-pulse-level"),
          answers: answers
        }));
      } catch (e) { /* sessionStorage no disponible — no es crítico */ }
    }

    function showStep(step) {
      panel.setAttribute("data-pulse-step", String(step));
      questions.forEach(function (q) {
        q.classList.toggle("is-active", q.getAttribute("data-step") === String(step));
      });
      progressFill.style.width = ((step / TOTAL_STEPS) * 100) + "%";
      stepLabel.textContent = "Paso " + step + " de " + TOTAL_STEPS;
      persist();
    }

    function goBack(step) {
      if (step < 1) return;
      panel.setAttribute("data-pulse-phase", "quiz");
      showStep(step);
    }

    function showResult() {
      var score = totalScore();
      var level = levelFromScore(score);
      panel.setAttribute("data-pulse-level", String(level));
      panel.setAttribute("data-pulse-phase", "result");
      levelItems.forEach(function (li) {
        var n = parseInt(li.getAttribute("data-level"), 10);
        li.classList.toggle("is-done", n < level);
        li.classList.toggle("is-current", n === level);
      });
      persist();
    }

    function bindQuestion(q) {
      var step = parseInt(q.getAttribute("data-step"), 10);
      var back = $("[data-pulse-back]", q);
      if (back) {
        back.addEventListener("click", function (e) {
          e.preventDefault();
          if (step > 1) goBack(step - 1);
        });
      }
      $$("[data-pulse-option]", q).forEach(function (input) {
        input.addEventListener("change", function () {
          answers[step] = parseInt(input.value, 10);
          persist();
          setTimeout(function () {
            if (step < TOTAL_STEPS) showStep(step + 1);
            else showResult();
          }, reduced ? 0 : 280);
        });
      });
    }
    questions.forEach(bindQuestion);

    if (continueBtn) {
      continueBtn.addEventListener("click", function () {
        panel.setAttribute("data-pulse-phase", "lead");
        persist();
        var firstField = $("input", $("[data-pulse-lead]", root));
        if (firstField) firstField.focus();
      });
    }

    if (leadForm) {
      var status = $("[data-pulse-form-status]", leadForm);
      leadForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!leadForm.reportValidity()) return;
        var payload = {};
        new FormData(leadForm).forEach(function (value, key) { payload[key] = value; });
        payload.score = totalScore();
        payload.level = panel.getAttribute("data-pulse-level");
        payload.answers = answers;

        var submitBtn = $('button[type="submit"]', leadForm);
        if (submitBtn) submitBtn.disabled = true;
        if (status) { status.textContent = "Enviando..."; status.className = "form-status"; }

        // Envío simulado — ver lib/manifest.js para la integración con
        // Odoo CRM (mismo patrón que el evento "leadSubmitted" del
        // formulario de contacto principal).
        setTimeout(function () {
          document.dispatchEvent(new CustomEvent("pulseLeadSubmitted", { detail: payload }));
          if (submitBtn) submitBtn.disabled = false;
          panel.setAttribute("data-pulse-phase", "thanks");
          persist();
        }, 700);
      });
    }

    if (finishBtn) {
      finishBtn.addEventListener("click", function () { closeModal(); resetQuiz(); });
    }

    function resetQuiz() {
      answers = {};
      leadForm && leadForm.reset();
      $$("[data-pulse-option]", root).forEach(function (input) { input.checked = false; });
      panel.setAttribute("data-pulse-phase", "quiz");
      panel.setAttribute("data-pulse-level", "");
      showStep(1);
      try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }

    function restoreState() {
      var raw;
      try { raw = sessionStorage.getItem(STORAGE_KEY); } catch (e) { return; }
      if (!raw) return;
      try {
        var saved = JSON.parse(raw);
        answers = saved.answers || {};
        var phase = saved.phase || "quiz";
        panel.setAttribute("data-pulse-phase", phase);
        if (phase === "result" || phase === "lead" || phase === "thanks") {
          if (saved.level) {
            panel.setAttribute("data-pulse-level", saved.level);
            levelItems.forEach(function (li) {
              var n = parseInt(li.getAttribute("data-level"), 10);
              var lvl = parseInt(saved.level, 10);
              li.classList.toggle("is-done", n < lvl);
              li.classList.toggle("is-current", n === lvl);
            });
          }
        } else {
          showStep(parseInt(saved.step, 10) || 1);
        }
      } catch (e) { /* estado inválido — se ignora */ }
    }

    /* ---- Apertura / cierre del modal (FLIP scale-morph) ---- */
    function getFocusable() {
      return $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', panel)
        .filter(function (el) { return el.offsetParent !== null; });
    }

    function trapFocus(e) {
      if (e.key !== "Tab") return;
      var focusable = getFocusable();
      if (!focusable.length) return;
      var firstEl = focusable[0], lastEl = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    }

    function onKeydown(e) {
      if (e.key === "Escape") closeModal();
      else trapFocus(e);
    }

    function lockScroll() {
      scrollbarComp = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollbarComp > 0) document.body.style.paddingRight = scrollbarComp + "px";
    }
    function unlockScroll() {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }

    function openModal() {
      lastFocused = document.activeElement;
      overlay.hidden = false;
      modal.hidden = false;
      lockScroll();
      trigger.setAttribute("aria-expanded", "true");

      var originRect = $(".pulse-orb-core", trigger).getBoundingClientRect();

      requestAnimationFrame(function () {
        modal.classList.add("is-open");
        overlay.classList.add("is-visible");

        if (!reduced) {
          var targetRect = panel.getBoundingClientRect();
          var ox = originRect.left + originRect.width / 2;
          var oy = originRect.top + originRect.height / 2;
          var tx = targetRect.left + targetRect.width / 2;
          var ty = targetRect.top + targetRect.height / 2;
          var scale = Math.max(originRect.width / targetRect.width, 0.06);
          panel.style.transition = "none";
          panel.style.transform = "translate3d(" + (ox - tx) + "px," + (oy - ty) + "px,0) scale(" + scale + ")";
          panel.getBoundingClientRect();
          requestAnimationFrame(function () {
            panel.style.transition = "transform .55s var(--ease-bounce), opacity .35s var(--ease-out)";
            panel.style.transform = "none";
          });
        }

        document.addEventListener("keydown", onKeydown);
        var focusable = getFocusable();
        if (focusable.length) focusable[0].focus();
      });
    }

    function closeModal() {
      modal.classList.remove("is-open");
      overlay.classList.remove("is-visible");
      trigger.setAttribute("aria-expanded", "false");
      document.removeEventListener("keydown", onKeydown);
      unlockScroll();
      panel.style.transition = "";
      panel.style.transform = "";
      setTimeout(function () {
        overlay.hidden = true;
        modal.hidden = true;
        if (lastFocused && lastFocused.focus) lastFocused.focus();
      }, reduced ? 0 : 350);
    }

    trigger.addEventListener("click", function () {
      var isOpen = modal.classList.contains("is-open");
      if (isOpen) closeModal(); else openModal();
    });
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", closeModal);

    restoreState();
    showStep(parseInt(panel.getAttribute("data-pulse-step"), 10) || 1);

    // Deep link desde otra página: index.html?pulse=open
    var params = new URLSearchParams(window.location.search);
    if (params.get("pulse") === "open") {
      params.delete("pulse");
      var qs = params.toString();
      history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : ""));
      initWakeAndDock(true);
      setTimeout(openModal, 60);
      return true;
    }
    return false;
  }

  /* ---------------------------------------------------------------
     Límite de footer — la esfera nunca se monta sobre el footer.
     Mientras el footer entra por abajo del viewport, se empuja la
     esfera hacia arriba justo lo necesario para quedar siempre a
     GAP px sobre su borde superior; fuera del estado "docked" (Hero,
     modal abierto) no se toca el `bottom`, así no interfiere con las
     otras posiciones que ya controla el CSS.
     --------------------------------------------------------------- */
  function initFooterClamp() {
    var footer = $(".footer");
    if (!footer || !trigger) return;
    var GAP = 24;
    var ticking = false;

    function update() {
      ticking = false;
      if (root.getAttribute("data-pulse-state") !== "docked") {
        if (trigger.style.bottom) trigger.style.bottom = "";
        return;
      }
      var overlap = window.innerHeight - footer.getBoundingClientRect().top;
      trigger.style.bottom = overlap > 0 ? (overlap + GAP) + "px" : "";
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /* ---------------------------------------------------------------
     Boot
     --------------------------------------------------------------- */
  function boot() {
    var deepLinkOpened = false;
    if (mode === "link") {
      safe(initLinkMode, "initLinkMode");
      safe(function () { initWakeAndDock(false); }, "initWakeAndDock");
    } else {
      safe(function () { deepLinkOpened = initFullMode(); }, "initFullMode");
      safe(initContextLabel, "initContextLabel");
      if (!deepLinkOpened) safe(function () { initWakeAndDock(false); }, "initWakeAndDock");
    }
    safe(initFooterClamp, "initFooterClamp");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
