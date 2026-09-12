"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, Sparkles } from "lucide-react";
import {
  AUTO_DETECT_FONT_ID,
  AVAILABLE_FONTS,
  detectClosestFont,
  type FontDefinition,
} from "@/lib/fonts";

export interface FontPickerProps {
  value?: string; // font id or "auto"
  detectedFontName?: string; // original font from PDF or OCR
  onChange: (fontId: string) => void;
  className?: string;
  allowAutoDetect?: boolean;
}

export function FontPicker({
  value = AUTO_DETECT_FONT_ID,
  detectedFontName,
  onChange,
  className = "",
  allowAutoDetect = true,
}: FontPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const autoDetected = useMemo(() => {
    return detectClosestFont(detectedFontName);
  }, [detectedFontName]);

  const selectedFont = useMemo(() => {
    if (value === AUTO_DETECT_FONT_ID) return null;
    return AVAILABLE_FONTS.find(
      (f) => f.id === value || f.name.toLowerCase() === value.toLowerCase()
    );
  }, [value]);

  const filteredFonts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return AVAILABLE_FONTS;
    return AVAILABLE_FONTS.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleSelect = (fontId: string) => {
    onChange(fontId);
    setIsOpen(false);
  };

  const isAutoActive = value === AUTO_DETECT_FONT_ID;

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground shadow-xs transition-colors hover:border-primary/50 hover:bg-accent/40 focus:outline-hidden focus:ring-1 focus:ring-primary"
      >
        <div className="flex items-center gap-1.5 truncate">
          {isAutoActive ? (
            <>
              <Sparkles className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="truncate font-medium text-emerald-400">
                Auto-Detect ({autoDetected.name})
              </span>
            </>
          ) : (
            <span
              className="truncate font-medium"
              style={{ fontFamily: selectedFont?.fontFamily }}
            >
              {selectedFont ? selectedFont.name : value}
            </span>
          )}
        </div>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-lg border border-slate-800 bg-slate-950/95 p-1.5 text-slate-200 shadow-2xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
          {/* Search Input */}
          <div className="relative mb-1.5 px-1 pt-1">
            <Search className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 30+ fonts..."
              className="h-8 w-full rounded-md border border-slate-800 bg-slate-900/90 pl-8 pr-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-hidden"
            />
          </div>

          {/* Options Scroll List */}
          <div className="max-h-64 overflow-y-auto overscroll-contain pr-0.5 space-y-0.5 scrollbar-thin">
            {/* Auto-Detect Option (Pinned at top) */}
            {allowAutoDetect && (
              <button
                type="button"
                onClick={() => handleSelect(AUTO_DETECT_FONT_ID)}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                  isAutoActive
                    ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-medium">Use Original (Auto-Detect)</div>
                    <div className="text-[10px] text-emerald-400/80">
                      Matches: {autoDetected.name}
                    </div>
                  </div>
                </div>
                {isAutoActive && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
              </button>
            )}

            {allowAutoDetect && <div className="my-1 border-t border-slate-800/80" />}

            {/* Filtered Professional Fonts List */}
            {filteredFonts.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-500">
                No matching fonts found
              </div>
            ) : (
              filteredFonts.map((font: FontDefinition) => {
                const isSelected = value === font.id || value === font.name;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => handleSelect(font.id)}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="truncate text-sm"
                        style={{ fontFamily: font.fontFamily }}
                      >
                        {font.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="rounded bg-slate-800/80 px-1 py-0.2 text-[9px] text-slate-400 capitalize">
                        {font.category === "sans-serif"
                          ? "sans"
                          : font.category === "monospace"
                          ? "mono"
                          : font.category}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
