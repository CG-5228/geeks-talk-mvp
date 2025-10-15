"use client";

import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

const FloatingInput = React.forwardRef<HTMLInputElement, Props>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || React.useId();
    const [focused, setFocused] = React.useState(false);
    const [value, setValue] = React.useState("");
    const showFloat = focused || value.length > 0;
    return (
      <div className={`group relative ${className}`}>
        <input
          id={inputId}
          ref={ref}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => setValue(e.target.value)}
          className="peer w-full rounded-md px-3 pt-6 pb-2 font-medium text-[#e0faff] placeholder-transparent outline-none border border-[rgba(0,212,255,0.3)] bg-transparent [box-shadow:inset_0_0_12px_rgba(255,255,255,0.05)] focus:border-[#00d4ff] focus:[box-shadow:0_0_10px_rgba(0,212,255,0.4),_inset_0_0_12px_rgba(255,255,255,0.05)] transition"
          {...props}
        />
        <label
          htmlFor={inputId}
          className={`pointer-events-none absolute left-3 transition-all ${
            showFloat ? "-top-2 text-xs px-1 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm text-[#00d4ff]" : "top-3 text-sm text-[rgba(200,255,255,0.7)]"
          }`}
        >
          {label}
        </label>
        {/* Scan line underline */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
          <div className="absolute -left-full h-full w-1/2 bg-[#00d4ff] blur-[1px] opacity-0 transition-opacity duration-150 group-hover:opacity-100 peer-focus:opacity-100 animate-[scanLine_1.6s_linear_infinite]" />
          <div className="h-px w-full bg-[rgba(0,212,255,0.3)]" />
        </div>
        {error ? (
          <p className="mt-1 text-xs text-red-400">{error}</p>
        ) : null}
      </div>
    );
  }
);

FloatingInput.displayName = "FloatingInput";

export default FloatingInput;
