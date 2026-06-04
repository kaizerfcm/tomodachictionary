import type { ReactNode } from 'react';

interface EditorSectionHeaderProps {
  title: string;
  children?: ReactNode;
}

export function EditorSectionHeader({
  title,
  children,
}: EditorSectionHeaderProps) {
  return (
    <div className="editor-section-header">
      <h2 className="editor-section-title">{title}</h2>
      {children ? (
        <div className="editor-section-actions">{children}</div>
      ) : null}
    </div>
  );
}
