interface SettingsSectionProps {
  title: string;
  description?: string;
  dividerAfter?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export function SettingsSection({
  title,
  description,
  dividerAfter = true,
  headerAction,
  children,
}: SettingsSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {headerAction}
      </div>
      {description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
          {description}
        </p>
      )}
      {children}
      {dividerAfter && (
        <div className="border-b border-border/30 my-6" />
      )}
    </section>
  );
}
