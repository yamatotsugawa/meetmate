// src/lib/freeSlots.ts
export type Interval = { start: Date; end: Date };

export function invertBusyToFree(
  workStart: Date, workEnd: Date, busy: Interval[], minDurationMin: number
): Interval[] {
  const result: Interval[] = [];
  let cursor = new Date(workStart);
  const sorted = [...busy].sort((a,b) => +a.start - +b.start);

  for (const b of sorted) {
    const s = new Date(Math.max(+b.start, +workStart));
    const e = new Date(Math.min(+b.end, +workEnd));
    if (e <= workStart || s >= workEnd) continue; // 勤務時間外のbusyは無視
    if (s > cursor) {
      const freeStart = cursor;
      const freeEnd = new Date(Math.min(+s, +workEnd));
      if ((+freeEnd - +freeStart)/60000 >= minDurationMin) result.push({ start: freeStart, end: freeEnd });
    }
    if (e > cursor) cursor = e;
    if (cursor >= workEnd) break;
  }
  // 最後の余り
  if (cursor < workEnd) {
    const freeStart = cursor;
    const freeEnd = new Date(workEnd);
    if ((+freeEnd - +freeStart)/60000 >= minDurationMin) result.push({ start: freeStart, end: freeEnd });
  }
  return result;
}
