"use client";

import React from "react";
import { CHIPS, ROWS, type Chip } from "./chips";

/** Per-chip visual state supplied by the parent. All optional. */
export interface ChipDecoration {
  /** Draw a dual ring (inset dark + white) marking membership in the active set. */
  ring?: boolean;
  /** Small corner dot, e.g. "this chip belongs to another of your terms". */
  dot?: boolean;
  /** Centered best-example marker. */
  focal?: boolean;
  /** 0..1 multiplier on the chip color (consensus heat); default 1. */
  strength?: number;
  /** Fade the chip toward the mount grey (not in any relevant set). */
  dim?: boolean;
  /** Tiny text badge, bottom-right (admin counts). */
  badge?: string;
}

interface Props {
  decorate?: (chip: Chip) => ChipDecoration | null | undefined;
  onChipDown?: (chip: Chip, e: React.PointerEvent) => void;
  onChipEnter?: (chip: Chip, e: React.PointerEvent) => void;
  onChipClick?: (chip: Chip) => void;
  /** Disable pointer affordances entirely (review/admin displays). */
  interactive?: boolean;
  /** Suppress page scrolling over the grid so drag-painting works on touch. */
  paintable?: boolean;
}

/** The WCS mount grey — chips are judged against a neutral surround, like the
 * grey card of the physical chart (and of the 2017 class handouts). */
const MOUNT = "#9C9C9C";
const MOUNT_EDGE = "#8A8A8A";

const HUE_COLS = Array.from({ length: 40 }, (_, i) => i + 1);

const chipIndex: Record<string, Chip> = {};
for (const c of CHIPS) chipIndex[`${c.row}${c.col}`] = c;

export default function ChipGrid({
  decorate,
  onChipDown,
  onChipEnter,
  onChipClick,
  interactive = false,
  paintable = false,
}: Props) {
  // header col | neutral col | gap | 40 hue cols
  const template = `22px minmax(13px, 1fr) 10px repeat(40, minmax(13px, 1fr))`;

  const headerCell = (label: string, key: string) => (
    <div
      key={key}
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: "9px",
        color: "#3A3A3A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
      }}
    >
      {label}
    </div>
  );

  const renderChip = (chip: Chip | undefined, key: string) => {
    if (!chip) return <div key={key} />;
    const d = (decorate ? decorate(chip) : null) ?? {};
    const strength = d.strength ?? 1;
    const style: React.CSSProperties = {
      aspectRatio: "1 / 1",
      background: d.dim
        ? MOUNT_EDGE
        : strength >= 1
          ? chip.hex
          : `color-mix(in srgb, ${chip.hex} ${Math.round(strength * 100)}%, ${MOUNT})`,
      borderRadius: "1px",
      position: "relative",
      cursor: interactive ? "pointer" : "default",
      touchAction: paintable ? "none" : undefined,
      boxShadow: d.ring ? "inset 0 0 0 2px #FFFFFF, inset 0 0 0 3.5px #1A1814" : undefined,
      opacity: d.dim ? 0.55 : 1,
    };
    return (
      <div
        key={key}
        title={`${chip.row}${chip.col} · ${chip.munsell}`}
        style={style}
        onPointerDown={
          onChipDown
            ? (e) => {
                // Release the implicit touch capture so pointerenter fires on
                // the chips the finger crosses during a drag-paint.
                (e.target as Element).releasePointerCapture?.(e.pointerId);
                onChipDown(chip, e);
              }
            : undefined
        }
        onPointerEnter={onChipEnter ? (e) => onChipEnter(chip, e) : undefined}
        onClick={onChipClick ? () => onChipClick(chip) : undefined}
      >
        {d.focal && (
          <div
            style={{
              position: "absolute",
              inset: "22%",
              borderRadius: "50%",
              background: "#FFFFFF",
              border: "2px solid #1A1814",
              pointerEvents: "none",
            }}
          />
        )}
        {d.dot && !d.focal && (
          <div
            style={{
              position: "absolute",
              right: "12%",
              bottom: "12%",
              width: "22%",
              height: "22%",
              borderRadius: "50%",
              background: "rgba(26,24,20,0.55)",
              pointerEvents: "none",
            }}
          />
        )}
        {d.badge && (
          <div
            style={{
              position: "absolute",
              right: "0",
              bottom: "0",
              fontFamily: "'Space Mono', monospace",
              fontSize: "8px",
              lineHeight: 1,
              padding: "1px 2px",
              background: "rgba(255,255,255,0.85)",
              color: "#1A1814",
              pointerEvents: "none",
            }}
          >
            {d.badge}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <div
        style={{
          background: MOUNT,
          border: `1px solid ${MOUNT_EDGE}`,
          padding: "10px 12px 12px",
          minWidth: "760px",
          touchAction: paintable ? "none" : undefined,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: template,
            gap: "2px",
            alignItems: "stretch",
          }}
        >
          {/* column headers */}
          {headerCell("", "h-corner")}
          {headerCell("0", "h-0")}
          <div key="h-gap" />
          {HUE_COLS.map((c) => headerCell(String(c), `h-${c}`))}
          {/* rows */}
          {ROWS.map((r) => (
            <React.Fragment key={`r-${r}`}>
              {headerCell(r, `rh-${r}`)}
              {renderChip(chipIndex[`${r}0`], `${r}0`)}
              <div key={`gap-${r}`} />
              {HUE_COLS.map((c) => renderChip(chipIndex[`${r}${c}`], `${r}${c}`))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
