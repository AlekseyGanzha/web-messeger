"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui";
import { THEME_KEY, applyTheme, resolveDark, type Theme } from "@/shared/lib/theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system";
    setDark(resolveDark(stored));
    applyTheme(stored);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system";
      if (current === "system") {
        setDark(resolveDark("system"));
        applyTheme("system");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    const next: Theme = dark ? "light" : "dark";
    setDark(!dark);
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={toggle} aria-label="Сменить тему">
      {dark ? "Светлая" : "Тёмная"}
    </Button>
  );
}
