"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UNAUTHORIZED_EVENT } from "@/shared/api";
import { logout } from "../api/auth";

export function SessionWatcher() {
  const router = useRouter();

  useEffect(() => {
    function handleUnauthorized() {
      logout();
      router.replace("/login");
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [router]);

  return null;
}
