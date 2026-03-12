interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 border-b border-forge-800">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        const classes = [
          'px-4 py-2 text-sm font-medium transition-colors cursor-pointer',
          'border-b-2 -mb-px',
          isActive
            ? 'text-amber-400 border-amber-500'
            : 'text-forge-400 border-transparent hover:text-forge-200 hover:border-forge-600',
        ].join(' ');

        return (
          <button key={tab.key} className={classes} onClick={() => onChange(tab.key)}>
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={[
                  'ml-1.5 px-1.5 py-0.5 rounded text-xs',
                  isActive
                    ? 'bg-amber-600/10 text-amber-300'
                    : 'bg-forge-800 text-forge-500',
                ].join(' ')}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
