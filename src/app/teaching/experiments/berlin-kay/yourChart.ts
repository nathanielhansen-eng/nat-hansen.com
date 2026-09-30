/** The participant's own chart, kept in this browser so the atlas page can
 * set it beside the World Color Survey. Nothing here leaves the device. */

export interface YourChart {
  language: string;
  terms: { term: string; chips: number[]; focal: number | null }[];
  savedAt: string;
}

const KEY = "berlin-kay:your-chart:v1";

export function saveYourChart(chart: YourChart) {
  try {
    localStorage.setItem(KEY, JSON.stringify(chart));
  } catch {
    // private mode or blocked storage: the atlas simply shows no chart
  }
}

export function loadYourChart(): YourChart | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as YourChart;
    return Array.isArray(c?.terms) && c.terms.length ? c : null;
  } catch {
    return null;
  }
}
