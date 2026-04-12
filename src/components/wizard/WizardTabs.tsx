"use client";

export type TabType = "podklad" | "faktura" | "nahled";

interface WizardTabsProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  className?: string;
}

export default function WizardTabs({
  currentTab,
  onTabChange,
  className = "",
}: WizardTabsProps) {
  const tabs: TabType[] = ["podklad", "faktura", "nahled"];
  
  const getTabLabel = (tab: TabType): string => {
    switch (tab) {
      case "podklad":
        return "1. Podklad";
      case "faktura":
        return "2. Faktura";
      case "nahled":
        return "3. Náhled";
      default:
        return tab;
    }
  };

  return (
    <nav className={`flex gap-2 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            currentTab === tab
              ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40"
              : "text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          {getTabLabel(tab)}
        </button>
      ))}
    </nav>
  );
}