"use client";

import { useState } from "react";

export function AbstractToggle({ html }: { html: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="text-stone-400 text-sm uppercase tracking-wider hover:text-stone-600 transition-colors"
      >
        {open ? "Abstract \u25B4" : "Abstract \u25BE"}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-[1000px] opacity-100 mt-2" : "max-h-0 opacity-0"
        }`}
      >
        <p
          className="text-stone-500 text-sm leading-relaxed border-l-2 border-stone-200 pl-3"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
