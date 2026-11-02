import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../state/ThemeContext";

export default function ThemeToggle({ className = "", showLabel = false }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${isDark ? "is-dark" : "is-light"} ${className}`}
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      <span className="theme-toggle-icon">
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </span>
      {showLabel && (
        <span className="theme-toggle-label">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  );
}
