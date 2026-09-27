"use client";

import { useLayoutEffect, useRef } from "react";

// Wraps an admin dashboard shown inside ux-phi's class page (an iframe).
// Two jobs:
// 1. The class-link token is in this page's address, not a cookie (browsers
//    block cookies set inside another site's frame), so every request the
//    dashboard makes to this experiment's API gets `t=<token>` appended.
//    Patched in a layout effect, which runs before the dashboard's own data
//    effects.
// 2. A cross-site parent can't read the frame's height, so the page posts it
//    whenever it changes and the class page sizes the frame to fit.
// 3. The view is locked to one class, so the session menu (it would read
//    "All sessions" over one class's data) and the participant-link maker are
//    hidden. Recognised from the rendered page, not per dashboard: the menu is
//    the <select> offering "All sessions"; the maker is the box under a
//    "Participant link" / "Student URL" heading that holds a text field.
//    Other menus (study, language) and the Present / Download buttons stay.
export default function EmbedFrame({
  token,
  slug,
  children,
}: {
  token: string;
  slug: string;
  children: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const original = window.fetch;
    const prefix = `/api/experiments/${slug}/`;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const u = new URL(raw, window.location.origin);
      if (u.origin === window.location.origin && u.pathname.startsWith(prefix)) {
        u.searchParams.set("t", token);
        return original(u.toString(), init);
      }
      return original(input, init);
    };
    return () => {
      window.fetch = original;
    };
  }, [token, slug]);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || window.parent === window) return;
    const post = () =>
      window.parent.postMessage(
        { type: "nh-embed-height", slug, height: Math.ceil(el.getBoundingClientRect().height) },
        "*",
      );
    post();
    const ro = new ResizeObserver(post);
    ro.observe(el);
    return () => ro.disconnect();
  }, [slug]);

  // Dashboards fill at least the window (min-height: 100vh). Inside a frame
  // the "window" is the frame, so each resize would grow it again and the
  // reported height would ratchet upward; in embed mode that minimum goes.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const hide = (node: Element | null) => {
      if (node instanceof HTMLElement) node.style.display = "none";
    };
    const sweep = () => {
      for (const sel of Array.from(el.querySelectorAll("select"))) {
        if (sel.dataset.embedSeen) continue;
        const opts = Array.from(sel.options).map((o) => o.text.trim().toLowerCase());
        if (!opts.includes("all sessions")) continue;
        hide(sel);
        const lbl = sel.previousElementSibling;
        if (lbl && /^session:?$/i.test(lbl.textContent?.trim() ?? "")) hide(lbl);
        // The session list fills in after the data loads: keep checking until
        // the class's own session is there to select.
        if (!Array.from(sel.options).some((o) => o.value !== "")) continue;
        sel.dataset.embedSeen = "1";
        // Select the class's own session before hiding the menu, so the
        // dashboard's captions name it rather than "All sessions" (the data
        // is that one session either way). React listens for a bubbling
        // change event carrying the new value.
        const classOption = Array.from(sel.options).find((o) => o.value !== "");
        if (classOption && sel.value !== classOption.value) {
          const setter = Object.getOwnPropertyDescriptor(
            HTMLSelectElement.prototype,
            "value",
          )?.set;
          setter?.call(sel, classOption.value);
          sel.dispatchEvent(new Event("change", { bubbles: true }));
        }
        hide(sel);
        const prev = sel.previousElementSibling;
        if (prev && /^session:?$/i.test(prev.textContent?.trim() ?? "")) hide(prev);
        const label = sel.closest("label");
        if (label && /session/i.test(label.textContent ?? "")) hide(label);
      }
      for (const node of Array.from(el.querySelectorAll("div, label, span, p"))) {
        if (node.children.length > 0) continue;
        if (!/^(participant link|student url)$/i.test(node.textContent?.trim() ?? "")) continue;
        let box: Element | null = node.parentElement;
        while (box && box !== el && !box.querySelector("input")) box = box.parentElement;
        if (box && box !== el) hide(box);
      }
    };
    sweep();
    const mo = new MutationObserver(sweep);
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  return (
    <div ref={root} className="nh-embed">
      <style>{[
        `.nh-embed [style*="100vh"], .nh-embed [style*="100dvh"] { min-height: 0 !important; padding: 12px !important; }`,
        // The chart cards drawn as SVG pictures (Brown & Lenneberg, Heider,
        // conceptual inflation) stop at 1100px and shrink to fit, so in a
        // frame their 10-unit labels came out near 7px. Let them use the
        // frame's full width and trim their padding (Nat, 2026-09-27).
        `.nh-embed [style*="max-width: 1100px"] { max-width: none !important; padding-left: 12px !important; padding-right: 12px !important; }`,
      ].join("\n")}</style>
      {children}
    </div>
  );
}
