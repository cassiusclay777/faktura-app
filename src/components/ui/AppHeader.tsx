"use client";

import WizardTabs, { type TabType } from "@/components/wizard/WizardTabs";

interface AppHeaderProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  title?: string;
  subtitle?: string;
}

export default function AppHeader({
  currentTab,
  onTabChange,
  title = "Faktura z podkladu",
  subtitle = "Podklad → řádky → náhled / tisk (bez iDoklad API)",
}: AppHeaderProps) {
  return (
    <header className="print:hidden border-b border-zinc-800 bg-zinc-900/80 backdrop-blur px-4 py-4">
      <div className="mx-auto max-w-5xl flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-zinc-500">{subtitle}</p>
        </div>
        <WizardTabs currentTab={currentTab} onTabChange={onTabChange} />
      </div>
    </header>
  );
}