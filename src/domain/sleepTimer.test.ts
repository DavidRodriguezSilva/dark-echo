import { describe, expect, it } from "vitest";
import { formatRemaining, parseClockTime, parseDuration } from "./sleepTimer";

describe("parseDuration", () => {
  it.each([
    ["30m", 1800],
    ["1h", 3600],
    ["1h30m", 5400],
    ["45s", 45],
    ["0:27:00", 1620],
    ["1:05:09", 3909],
    ["12h", 43200],
    ["1s", 1],
  ])("lee %s como %i s", (text, seconds) => {
    expect(parseDuration(text)).toEqual({ ok: true, seconds });
  });

  it.each(["", "0", "0m", "13h", "abc", "30", "-5m", "1:60:00"])("rechaza %j", (text) => {
    const result = parseDuration(text);
    expect(result.ok).toBe(false);
  });

  it("el error muestra el formato válido", () => {
    const result = parseDuration("abc");
    expect(!result.ok && result.message).toContain("0:27:00");
  });
});

describe("parseClockTime", () => {
  const at = (h: number, m: number) => new Date(2026, 9, 12, h, m, 0, 0).getTime();

  it("una hora futura de hoy cae hoy", () => {
    const result = parseClockTime("23:30", at(20, 0));
    expect(result).toEqual({ ok: true, endAt: at(23, 30) });
  });

  it("una hora ya pasada cae mañana", () => {
    const result = parseClockTime("07:00", at(23, 50));
    expect(result).toEqual({ ok: true, endAt: new Date(2026, 9, 13, 7, 0, 0, 0).getTime() });
  });

  it("la hora exacta de ahora cae mañana", () => {
    const result = parseClockTime("20:00", at(20, 0));
    expect(result.ok && result.endAt).toBe(new Date(2026, 9, 13, 20, 0, 0, 0).getTime());
  });

  it.each(["25:00", "7", "12:60", "abc"])("rechaza %j", (text) => {
    expect(parseClockTime(text, at(10, 0)).ok).toBe(false);
  });
});

describe("formatRemaining", () => {
  it("formatea minutos y horas", () => {
    expect(formatRemaining(27 * 60_000)).toBe("27:00");
    expect(formatRemaining(3_909_000)).toBe("1:05:09");
    expect(formatRemaining(-5)).toBe("0:00");
  });
});
