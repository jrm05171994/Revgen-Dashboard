"use client";

import { useState, useEffect } from "react";

const GOAL_KEY = "scenario_goalOverride";
const BOOKED_KEY = "scenario_bookedOverride";

function readStorage(key: string): string {
  if (typeof window === "undefined") return "";
  try { return localStorage.getItem(key) ?? ""; } catch { return ""; }
}

function writeStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    if (value === "") localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

export function useScenario() {
  const [goalOverride, setGoalOverrideState] = useState<string>("");
  const [bookedOverride, setBookedOverrideState] = useState<string>("");

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setGoalOverrideState(readStorage(GOAL_KEY));
    setBookedOverrideState(readStorage(BOOKED_KEY));
  }, []);

  function setGoalOverride(value: string) {
    setGoalOverrideState(value);
    writeStorage(GOAL_KEY, value);
  }

  function setBookedOverride(value: string) {
    setBookedOverrideState(value);
    writeStorage(BOOKED_KEY, value);
  }

  function clearAll() {
    setGoalOverrideState("");
    setBookedOverrideState("");
    writeStorage(GOAL_KEY, "");
    writeStorage(BOOKED_KEY, "");
  }

  return { goalOverride, bookedOverride, setGoalOverride, setBookedOverride, clearAll };
}
