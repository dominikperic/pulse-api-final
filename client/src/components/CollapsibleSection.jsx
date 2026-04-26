import { useState } from 'react';

/**
 * @param {{
 *   sectionId: string,
 *   title: string,
 *   variant?: 'card' | 'form',
 *   defaultOpen?: boolean,
 *   headerActions?: import('react').ReactNode,
 *   className?: string,
 *   titleStyle?: import('react').CSSProperties,
 *   style?: import('react').CSSProperties,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function CollapsibleSection({
  sectionId,
  title,
  variant = 'card',
  defaultOpen = true,
  headerActions,
  className = '',
  titleStyle,
  style,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const base = variant === 'form' ? 'form-section' : 'card';
  const panelId = `${sectionId}-panel`;

  return (
    <section
      className={`${base} collapsible-section ${className}`.trim()}
      style={{ marginBottom: 16, ...style }}
      aria-labelledby={sectionId}
    >
      <div className="collapsible-section__head">
        <button
          type="button"
          className="collapsible-section__toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="collapsible-section__chevron mono" aria-hidden>
            {open ? '▼' : '▶'}
          </span>
          <span id={sectionId} className="section-title collapsible-section__title" style={{ margin: 0, ...titleStyle }}>
            {title}
          </span>
        </button>
        {headerActions ? <div className="collapsible-section__actions">{headerActions}</div> : null}
      </div>
      {open ? (
        <div id={panelId} className="collapsible-section__panel">
          {children}
        </div>
      ) : null}
    </section>
  );
}
