"use client";

import { useEffect } from "react";
import { subscribeWebPush } from "@/lib/webPush";

export default function WebPushInit() {
  useEffect(() => {
    // Запускаем только если медик залогинен
    if (localStorage.getItem("medic_token")) {
      subscribeWebPush();
    }
  }, []);
  return null;
}
