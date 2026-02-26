"use client";

import { useEffect } from "react";
import { subscribeWebPush } from "@/lib/webPush";

export default function WebPushInit() {
  useEffect(() => {
    // Запускаем только если клиент залогинен
    if (localStorage.getItem("token")) {
      subscribeWebPush();
    }
  }, []);
  return null;
}
