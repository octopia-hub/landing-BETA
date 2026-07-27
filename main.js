(function () {
  "use strict";

  var data = window.__BRAND__ || {};
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var escHTML = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "] failed:", e); }
  }

  /* ---------------------------------------------------------------
     Nav — sticky solidify, mobile panel, smooth anchor scroll
     --------------------------------------------------------------- */
  function initNav() {
    var nav = $("[data-nav]");
    if (!nav) return;

    var onScroll = function () {
      if (window.scrollY > 12) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    var toggle = $("[data-nav-toggle]");
    var panel = $("[data-nav-mobile]");
    if (toggle && panel) {
      toggle.addEventListener("click", function () {
        var open = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!open));
        panel.classList.toggle("is-open", !open);
      });
      $$("a", panel).forEach(function (a) {
        a.addEventListener("click", function () {
          toggle.setAttribute("aria-expanded", "false");
          panel.classList.remove("is-open");
        });
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          toggle.setAttribute("aria-expanded", "false");
          panel.classList.remove("is-open");
        }
      });
    }

    var navOffset = nav.offsetHeight || 78;
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var top = el.getBoundingClientRect().top + window.scrollY - navOffset + 1;
      window.scrollTo({ top: top, behavior: reduced ? "auto" : "smooth" });
    });
  }

  /* ---------------------------------------------------------------
     Reveal on scroll — threshold low + safety net
     --------------------------------------------------------------- */
  function initReveals() {
    var targets = $$(".reveal");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });

    targets.forEach(function (el) { io.observe(el); });

    setTimeout(function () {
      targets.forEach(function (el) {
        if (!el.classList.contains("is-visible") && el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-visible");
        }
      });
    }, 6000);
  }

  /* ---------------------------------------------------------------
     Hero mouse-reactive glow
     --------------------------------------------------------------- */
  function initHeroGlow() {
    var hero = $(".hero");
    var glow = $("[data-mouse-glow]");
    if (!hero || !glow || !fineHover) return;

    // Default anchor baked into the .hero-glow-spot gradient (62% 28%).
    var DEFAULT_MX = 62, DEFAULT_MY = 28;
    var ticking = false;
    var mx = DEFAULT_MX, my = DEFAULT_MY;
    var glowW = 0, glowH = 0;

    function measureGlow() {
      var r = glow.getBoundingClientRect();
      glowW = r.width;
      glowH = r.height;
    }
    measureGlow();
    window.addEventListener("resize", measureGlow);

    hero.addEventListener("mousemove", function (e) {
      var rect = hero.getBoundingClientRect();
      mx = ((e.clientX - rect.left) / rect.width) * 100;
      my = ((e.clientY - rect.top) / rect.height) * 100;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () {
          // Translate instead of recomputing the gradient's center: keeps
          // the update on the compositor (transform) instead of forcing
          // Chrome to repaint+reblur the whole gradient surface per frame.
          var gx = ((mx - DEFAULT_MX) / 100) * glowW;
          var gy = ((my - DEFAULT_MY) / 100) * glowH;
          glow.style.setProperty("--gx", gx.toFixed(1) + "px");
          glow.style.setProperty("--gy", gy.toFixed(1) + "px");
          ticking = false;
        });
      }
    });
  }

  /* ---------------------------------------------------------------
     Hero reveal (GSAP) — el campo de ideas nace, se reordena (unas
     palabras ganan protagonismo, otras se retiran) y se disuelve justo
     cuando el titular real toma foco palabra por palabra. Corre en
     cada carga de página (el usuario quiere ver el detalle cada vez
     que recarga), salvo con prefers-reduced-motion. El reposo por
     defecto en CSS ya es el estado final y correcto — visible, nítido
     — así que si GSAP no carga, no pasa nada: el Hero simplemente no
     anima, nunca queda invisible o borroso a medias.
     --------------------------------------------------------------- */
  function initHeroReveal() {
    var hero = $(".hero");
    var title = $("[data-hero-title]", hero);
    if (!hero || !title || reduced || typeof gsap === "undefined") return;

    var field = $("[data-hero-field]", hero);
    var words = field ? $$(".hf-word", field) : [];
    var riseWords = field ? $$(".hf-word.hf-rise", field) : [];
    var fadeWords = field ? $$(".hf-word.hf-fade", field) : [];
    var hw = $$(".hw", title);
    var hwAccent = $(".hw-accent", title);
    var wide = words.length && matchMedia("(min-width: 1440px)").matches;

    function cssVar(el, name, fallback) {
      var v = el.style.getPropertyValue(name);
      return v ? v : fallback;
    }

    var tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    if (wide) {
      gsap.set(words, {
        xPercent: -50, yPercent: -50, opacity: 0,
        y: 10, scale: .94, filter: "blur(4px)"
      });
      gsap.set(riseWords, { textShadow: "0px 0px 0px rgba(193,0,209,0)" });

      // Etapa 1 — el campo de ideas nace, palabra por palabra.
      tl.to(words, {
        opacity: function (i, el) { return parseFloat(cssVar(el, "--o", ".5")); },
        y: 0, scale: 1, filter: "blur(0px)",
        duration: 1, stagger: .19
      }, .15);

      // Etapa 2 — se reordena: unas ganan protagonismo, otras se retiran.
      tl.to(fadeWords, {
        opacity: 0, scale: .88, filter: "blur(5px)",
        x: function (i, el) { return cssVar(el, "--dx", "0px"); },
        y: function (i, el) { return cssVar(el, "--dy", "0px"); },
        duration: .8, stagger: .05
      }, "+=.35")
      .to(riseWords, {
        opacity: .95, scale: 1.16, color: "#F2F1FA",
        textShadow: "0px 0px 24px rgba(193,0,209,.4)",
        x: function (i, el) { return cssVar(el, "--dx", "0px"); },
        y: function (i, el) { return cssVar(el, "--dy", "0px"); },
        duration: .8, stagger: .07
      }, "<");

      // Etapa 3 — todo se disuelve justo antes de que nazca el titular.
      tl.to(words, { opacity: 0, duration: .6 }, "+=.9");
    }

    // Etapa 4 — el titular real toma foco, palabra por palabra.
    gsap.set(hw, { y: 12, scale: 1.035, filter: "blur(11px)" });
    tl.to(hw, {
      y: 0, scale: 1, filter: "blur(0px)",
      duration: .85, stagger: .085
    }, wide ? "-=.2" : .3);

    if (hwAccent) {
      gsap.set(hwAccent, { textShadow: "0px 0px 0px rgba(193,0,209,0)" });
      tl.to(hwAccent, {
        textShadow: "0px 0px 22px rgba(193,0,209,.65)",
        duration: .4, yoyo: true, repeat: 1
      }, "-=.25");
    }
  }

  /* ---------------------------------------------------------------
     Card tilt — subtle, fine pointer only
     --------------------------------------------------------------- */
  function initTilt() {
    if (!fineHover) return;
    var cards = $$("[data-tilt]");
    cards.forEach(function (card) {
      var raf = null;
      card.addEventListener("mousemove", function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          var rect = card.getBoundingClientRect();
          var px = (e.clientX - rect.left) / rect.width - 0.5;
          var py = (e.clientY - rect.top) / rect.height - 0.5;
          card.style.transform = "perspective(800px) rotateX(" + (py * -5) + "deg) rotateY(" + (px * 5) + "deg) translateY(-4px)";
          raf = null;
        });
      });
      card.addEventListener("mouseout", function (e) {
        if (card.contains(e.relatedTarget)) return;
        card.style.transform = "";
      });
    });
  }

  /* ---------------------------------------------------------------
     Magnetic buttons — subtle
     --------------------------------------------------------------- */
  function initMagnetic() {
    if (!fineHover) return;
    $$("[data-magnetic]").forEach(function (btn) {
      var raf = null;
      btn.addEventListener("mousemove", function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          var rect = btn.getBoundingClientRect();
          var x = (e.clientX - rect.left - rect.width / 2) * 0.18;
          var y = (e.clientY - rect.top - rect.height / 2) * 0.28;
          btn.style.transform = "translate(" + x + "px, " + y + "px)";
          raf = null;
        });
      });
      btn.addEventListener("mouseout", function (e) {
        if (btn.contains(e.relatedTarget)) return;
        btn.style.transform = "";
      });
    });
  }

  /* ---------------------------------------------------------------
     Count-up — triggers once when visible
     --------------------------------------------------------------- */
  function initCountUp() {
    var targets = $$("[data-count-to]");
    if (!targets.length) return;

    var fmt = function (n) { return n.toLocaleString("es-CO"); };
    var animate = function (el) {
      var to = parseInt(el.getAttribute("data-count-to"), 10) || 0;
      if (reduced) { el.textContent = fmt(to); return; }
      var start = null;
      var duration = 900;
      var step = function (ts) {
        if (!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        el.textContent = fmt(Math.floor(progress * to));
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = fmt(to);
      };
      requestAnimationFrame(step);
    };

    if (!("IntersectionObserver" in window)) {
      targets.forEach(animate);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { animate(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.2 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------
     FAQ accordion
     --------------------------------------------------------------- */
  function initFAQ() {
    $$(".faq-item").forEach(function (item) {
      var btn = $(".faq-question", item);
      if (!btn) return;
      btn.addEventListener("click", function () {
        var isOpen = item.classList.contains("is-open");
        $$(".faq-item").forEach(function (other) {
          other.classList.remove("is-open");
          var otherBtn = $(".faq-question", other);
          if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
        });
        if (!isOpen) {
          item.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  /* ---------------------------------------------------------------
     Video carousel (casos de éxito con varios videos de YouTube)
     --------------------------------------------------------------- */
  function initVideoCarousels() {
    $$("[data-video-carousel]").forEach(function (carousel) {
      var ids = (carousel.getAttribute("data-videos") || "")
        .split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      if (!ids.length) return;

      var iframe = $("[data-video-iframe]", carousel);
      var dotsWrap = $("[data-video-dots]", carousel);
      var prevBtn = $("[data-video-prev]", carousel);
      var nextBtn = $("[data-video-next]", carousel);
      if (!iframe || ids.length < 2 || !dotsWrap || !prevBtn || !nextBtn) return;

      var index = 0;
      var dots = ids.map(function (_, i) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "case-video-dot";
        dot.setAttribute("aria-label", "Ver video " + (i + 1));
        dot.addEventListener("click", function () { render(i); });
        dotsWrap.appendChild(dot);
        return dot;
      });

      function render(i) {
        index = (i + ids.length) % ids.length;
        var src = "https://www.youtube-nocookie.com/embed/" + ids[index];
        if (iframe.src.indexOf(ids[index]) === -1) iframe.src = src;
        dots.forEach(function (dot, di) { dot.classList.toggle("is-active", di === index); });
      }

      prevBtn.addEventListener("click", function () { render(index - 1); });
      nextBtn.addEventListener("click", function () { render(index + 1); });
      render(0);
    });
  }

  /* ---------------------------------------------------------------
     Lead form — client validation + simulated submit
     (see lib/manifest.js for Odoo CRM integration notes)
     --------------------------------------------------------------- */
  function initForm() {
    var form = $("#lead-form");
    if (!form) return;
    var status = $("[data-form-status]", form);
    var submitBtn = $('button[type="submit"]', form);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var payload = {};
      new FormData(form).forEach(function (value, key) { payload[key] = value; });

      form.classList.add("is-sending");
      if (submitBtn) submitBtn.disabled = true;
      if (status) {
        status.textContent = "Enviando...";
        status.className = "form-status";
      }

      // Simulated network delay — replace with a real fetch() to
      // form.endpoint (see lib/manifest.js) once Odoo is wired up.
      setTimeout(function () {
        document.dispatchEvent(new CustomEvent("leadSubmitted", { detail: payload }));
        form.classList.remove("is-sending");
        if (submitBtn) submitBtn.disabled = false;
        if (status) {
          status.textContent = "Gracias — recibimos tu información y te contactaremos pronto.";
          status.className = "form-status is-success";
        }
        form.reset();
      }, 700);
    });
  }

  /* ---------------------------------------------------------------
     Boot
     --------------------------------------------------------------- */
  function boot() {
    safe(initNav, "initNav");
    safe(initReveals, "initReveals");
    safe(initHeroGlow, "initHeroGlow");
    safe(initHeroReveal, "initHeroReveal");
    safe(initTilt, "initTilt");
    safe(initMagnetic, "initMagnetic");
    safe(initCountUp, "initCountUp");
    safe(initFAQ, "initFAQ");
    safe(initVideoCarousels, "initVideoCarousels");
    safe(initForm, "initForm");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
