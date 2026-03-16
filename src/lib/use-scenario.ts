"use client";

import { useState, useEffect } from "react";

const GOAL_KEY   = "scenario_goalOverride";
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

// Module-level singleton state
let _goal   = "";
let _booked = "";
const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach((fn) => fn());
}

function _setGoal(value: string) {
  _goal = value;
  writeStorage(GOAL_KEY, value);
  _notify();
}

function _setBooked(value: string) {
  _booked = value;
  writeStorage(BOOKED_KEY, value);
  _notify();
}

function _clearAll() {
  _goal = "";
  _booked = "";
  writeStorage(GOAL_KEY, "");
  writeStorage(BOOKED_KEY, "");
  _notify();
}

export function useScenario() {
  const [, rerender] = useState(0);

  // Subscribe to module-level changes
  useEffect(() => {
    const trigger = () => rerender((n) => n + 1);
    _listeners.add(trigger);
    return () => { _listeners.delete(trigger); };
  }, []);

  // Hydrate from localStorage on first client mount
  useEffect(() => {
    const g = readStorage(GOAL_KEY);
    const b = readStorage(BOOKED_KEY);
    if (g !== _goal || b !== _booked) {
      _goal   = g;
      _booked = b;
      _notify();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    goalOverride:    _goal,
    bookedOverride:  _booked,
    setGoalOverride:  _setGoal,
    setBookedOverride: _setBooked,
    clearAll:         _clearAll,
  };
}
