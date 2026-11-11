import { documentLocale, translate } from '../lib/i18n.ts';

export function createCarouselState(length, reducedMotion = false) {
  if (!Number.isInteger(length) || length < 1) throw new RangeError("Invalid slide count");
  let index = 0;
  let paused = false;
  const blocks = new Set(reducedMotion ? ["motion"] : []);
  return {
    get index() { return index; },
    get paused() { return paused; },
    get playing() { return !paused && blocks.size === 0 && length > 1; },
    select(next) {
      if (!Number.isInteger(next) || next < 0 || next >= length) throw new RangeError("Invalid slide");
      index = next;
    },
    step(direction) { index = (index + direction + length) % length; },
    setBlock(reason, blocked) { blocked ? blocks.add(reason) : blocks.delete(reason); },
    toggle() { paused = !paused; },
  };
}

export function analyticsConfiguration(site) {
  if (site.environment !== "production") return null;
  try {
    const base = new URL(site.base_url);
    const endpoint = new URL(site.analytics_endpoint);
    if ([base, endpoint].some((url) => url.protocol !== "https:" || url.username || url.password)) return null;
    if (endpoint.search || endpoint.hash) return null;
    return endpoint.href;
  } catch {
    return null;
  }
}

export function analyticsEvent(href, referrer, event = "page_view", category = "page") {
  if (!["page_view", "intent_click", "inquiry_prepared"].includes(event)) return null;
  if (!["page", "makeup", "skin", "nails", "learning", "general"].includes(category)) return null;
  try {
    const path = new URL(href).pathname;
    let origin = "";
    let source = "direct";
    if (referrer) {
      const url = new URL(referrer);
      if (["http:", "https:"].includes(url.protocol)) {
        origin = url.origin;
        source = /(^|\.)(chatgpt\.com|chat\.openai\.com|claude\.ai|perplexity\.ai|doubao\.com|kimi\.com|gemini\.google\.com)$/.test(url.hostname) ? "ai" : "referral";
      }
    }
    return { event, category, path, referrer_origin: origin, source };
  } catch {
    return null;
  }
}

export function initializeSite() {
  const locale = documentLocale(document);
  const tr = (text) => translate(text, locale);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 1200px)");
  const menu = document.querySelector("[data-mobile-menu]");
  if (menu) {
    const summary = menu.querySelector("summary");
    menu.addEventListener("toggle", () => {
      summary?.setAttribute("aria-expanded", String(menu.open));
      summary?.setAttribute("aria-label", tr(menu.open ? "关闭导航菜单" : "打开导航菜单"));
    });
    menu.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.open) {
        menu.open = false;
        summary?.focus();
      }
    });
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => { menu.open = false; }));
    document.addEventListener("pointerdown", (event) => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
    mobile.addEventListener("change", () => { if (!mobile.matches) menu.open = false; });
  }

  document.querySelectorAll("[data-carousel]").forEach((carousel) => {
    if (carousel.dataset.ready === "true") return;
    const slides = [...carousel.querySelectorAll("[data-slide]")];
    const dots = [...carousel.querySelectorAll("[data-dot]")];
    const controls = carousel.querySelectorAll("[data-carousel-controls]");
    const pause = carousel.querySelector("[data-pause]");
    const status = carousel.querySelector("[data-slide-status]");
    const count = carousel.querySelector("[data-slide-count]");
    const caption = carousel.querySelector("[data-slide-caption]");
    const state = createCarouselState(slides.length, motion.matches);
    let timer;

    const schedule = () => {
      window.clearTimeout(timer);
      if (state.playing) timer = window.setTimeout(() => {
        state.step(1);
        render(false);
      }, 7000);
    };
    const render = (announce = true) => {
      slides.forEach((slide, index) => {
        slide.classList.toggle("is-active", state.index === index);
        slide.setAttribute("aria-hidden", String(state.index !== index));
      });
      dots.forEach((dot, index) => {
        dot.setAttribute("aria-current", state.index === index ? "true" : "false");
      });
      if (count) count.textContent = String(state.index + 1).padStart(2, "0");
      if (caption) caption.textContent = slides[state.index].dataset.label;
      if (status && announce) status.textContent = tr(`第 ${state.index + 1} 张，共 ${slides.length} 张。${slides[state.index].dataset.label}`);
      if (pause) {
        pause.disabled = motion.matches;
        pause.setAttribute("aria-label", tr(motion.matches ? "已根据减少动态效果设置停止自动播放" : state.paused ? "开始自动播放" : "暂停自动播放"));
        pause.setAttribute("aria-pressed", String(state.paused || motion.matches));
        pause.dataset.paused = String(state.paused || motion.matches);
      }
      schedule();
    };
    carousel.querySelector("[data-prev]")?.addEventListener("click", () => { state.step(-1); render(); });
    carousel.querySelector("[data-next]")?.addEventListener("click", () => { state.step(1); render(); });
    dots.forEach((dot, index) => dot.addEventListener("click", () => { state.select(index); render(); }));
    carousel.addEventListener("keydown", (event) => {
      if (event.target.tagName !== "BUTTON" || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      state.step(event.key === "ArrowLeft" ? -1 : 1);
      render();
    });
    pause?.addEventListener("click", () => { state.toggle(); render(false); });
    carousel.addEventListener("mouseenter", () => { state.setBlock("hover", true); schedule(); });
    carousel.addEventListener("mouseleave", () => { state.setBlock("hover", false); schedule(); });
    carousel.addEventListener("focusin", () => { state.setBlock("focus", true); schedule(); });
    carousel.addEventListener("focusout", (event) => {
      if (!carousel.contains(event.relatedTarget)) { state.setBlock("focus", false); schedule(); }
    });
    document.addEventListener("visibilitychange", () => { state.setBlock("hidden", document.hidden); schedule(); });
    motion.addEventListener("change", () => { state.setBlock("motion", motion.matches); render(false); });
    state.setBlock("hidden", document.hidden);
    carousel.dataset.ready = "true";
    controls.forEach((control) => { control.hidden = false; });
    render(false);
  });

  if (!motion.matches && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("has-arrived");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
  }

  const toggle = document.querySelector("[data-analytics-toggle]");
  const status = document.querySelector("[data-analytics-status]");
  if (toggle) {
    const endpoint = analyticsConfiguration({
      environment: toggle.dataset.environment,
      base_url: toggle.dataset.baseUrl,
      analytics_endpoint: toggle.dataset.endpoint,
    });
    let consent = false;
    const pending = new Set();
    const send = (event, category) => {
      if (!consent || !endpoint) return;
      const payload = analyticsEvent(window.location.href, document.referrer, event, category);
      if (!payload) return;
      const controller = new AbortController();
      pending.add(controller);
      const timeout = window.setTimeout(() => controller.abort(), 4000);
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      }).catch(() => {}).finally(() => { window.clearTimeout(timeout); pending.delete(controller); });
    };
    toggle.disabled = !endpoint;
    if (status) status.textContent = tr(endpoint ? "默认关闭，仅本页生效；不收集咨询内容。" : "当前未启用分析，不发送访问数据。");
    toggle.addEventListener("click", () => {
      if (!endpoint) return;
      consent = !consent;
      toggle.setAttribute("aria-pressed", String(consent));
      toggle.textContent = tr(consent ? "关闭访问分析" : "开启访问分析");
      if (status) status.textContent = tr(consent ? "本页已开启匿名分类统计，可随时关闭。" : "访问分析已关闭。");
      if (consent) send("page_view", "page");
      else pending.forEach((controller) => controller.abort());
    });
    document.querySelectorAll("[data-analytics-category]").forEach((link) => {
      link.addEventListener("click", () => send("intent_click", link.dataset.analyticsCategory));
    });
    document.addEventListener("beiti:inquiry-prepared", () => send("inquiry_prepared", "general"));
  }
}
