import { describe, expect, it } from "vitest";
import { formatLastSeen } from "./format-last-seen";

const now = new Date(2026, 9, 30, 12, 0, 0);

describe("formatLastSeen", () => {
  it("returns offline text when there is no last seen date", () => {
    expect(formatLastSeen(null, now)).toBe("не в сети");
  });

  it("formats recent minutes with correct plural forms", () => {
    expect(formatLastSeen(new Date(2026, 9, 30, 11, 59, 30).toISOString(), now)).toBe(
      "был(а) только что",
    );
    expect(formatLastSeen(new Date(2026, 9, 30, 11, 59, 0).toISOString(), now)).toBe(
      "был(а) 1 минуту назад",
    );
    expect(formatLastSeen(new Date(2026, 9, 30, 11, 57, 0).toISOString(), now)).toBe(
      "был(а) 3 минуты назад",
    );
    expect(formatLastSeen(new Date(2026, 9, 30, 11, 55, 0).toISOString(), now)).toBe(
      "был(а) 5 минут назад",
    );
    expect(formatLastSeen(new Date(2026, 9, 30, 11, 49, 0).toISOString(), now)).toBe(
      "был(а) 11 минут назад",
    );
  });

  it("formats same day, yesterday and older dates", () => {
    expect(formatLastSeen(new Date(2026, 9, 30, 10, 15).toISOString(), now)).toBe("был(а) в 10:15");
    expect(formatLastSeen(new Date(2026, 9, 29, 18, 45).toISOString(), now)).toBe(
      "был(а) вчера в 18:45",
    );
    expect(formatLastSeen(new Date(2025, 9, 30, 10, 15).toISOString(), now)).toBe(
      "был(а) 30.10.2025",
    );
  });
});
