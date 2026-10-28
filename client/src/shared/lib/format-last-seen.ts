function plural(num: number, one: string, few: string, many: string): string {
  const mod10 = num % 10;
  const mod100 = num % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function formatLastSeen(lastSeenAt: string | null, now: Date = new Date()): string {
  if (!lastSeenAt) return "не в сети";

  const date = new Date(lastSeenAt);
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60_000);

  if (diffMin < 1) return "был(а) только что";
  if (diffMin < 60) {
    return `был(а) ${diffMin} ${plural(diffMin, "минуту", "минуты", "минут")} назад`;
  }

  const time = date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (date.toDateString() === now.toDateString()) {
    return `был(а) в ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `был(а) вчера в ${time}`;
  }

  return `был(а) ${date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })}`;
}
