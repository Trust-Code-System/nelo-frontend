'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

type Panel = 'colour' | 'size' | 'sort';
type Option = { label: string; href: string; active: boolean };

export function ShopToolbar({
  colourLabel,
  sizeLabel,
  sortLabel,
  colourOptions,
  sizeOptions,
  sortOptions,
  resultCount,
  activeFilters,
  clearHref,
}: {
  colourLabel: string;
  sizeLabel: string;
  sortLabel: string;
  colourOptions: Option[];
  sizeOptions: Option[];
  sortOptions: Option[];
  resultCount: number;
  activeFilters: number;
  clearHref: string;
}) {
  const [open, setOpen] = useState<Panel | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const triggers = useRef(new Map<Panel, HTMLButtonElement>());
  const uid = useId();

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(null);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !open) return;
      const trigger = triggers.current.get(open);
      setOpen(null);
      trigger?.focus();
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    document.documentElement.classList.add('shop-filter-lock');

    const menu = () => root.current?.querySelector<HTMLElement>('.shop-filter__menu[data-open="true"]');

    const insideOpenMenu = (target: EventTarget | null) => {
      const panel = menu();
      return Boolean(panel && target instanceof Node && panel.contains(target));
    };

    const onWheel = (event: WheelEvent) => {
      if (insideOpenMenu(event.target)) return;
      event.preventDefault();
    };

    const onTouchMove = (event: TouchEvent) => {
      if (insideOpenMenu(event.target)) return;
      event.preventDefault();
    };

    document.addEventListener('wheel', onWheel, { capture: true, passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      document.documentElement.classList.remove('shop-filter-lock');
      document.removeEventListener('wheel', onWheel, true);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, [open]);

  const panels: Array<{
    key: Panel;
    label: string;
    options: Option[];
    menuClass?: string;
  }> = [
    { key: 'colour', label: colourLabel, options: colourOptions, menuClass: 'shop-filter__menu--colours' },
    { key: 'size', label: sizeLabel, options: sizeOptions, menuClass: 'shop-filter__menu--sizes' },
    { key: 'sort', label: sortLabel, options: sortOptions },
  ];

  return (
    <div ref={root} className="shop-toolbar" aria-label="Shop controls">
      <div className="shop-toolbar__filters">
        <span className="shop-toolbar__label">Filter {activeFilters ? `(${activeFilters})` : ''}</span>
        {panels.slice(0, 2).map((panel) => (
          <ShopDisclosure
            key={panel.key}
            panel={panel}
            uid={uid}
            open={open}
            setOpen={setOpen}
            triggers={triggers}
          />
        ))}
        {activeFilters ? <Link className="shop-toolbar__clear" href={clearHref}>Clear</Link> : null}
      </div>

      <div className="shop-toolbar__result"><strong>{resultCount}</strong> pieces</div>

      <ShopDisclosure
        panel={panels[2]!}
        uid={uid}
        open={open}
        setOpen={setOpen}
        triggers={triggers}
        sort
      />
    </div>
  );
}

function ShopDisclosure({
  panel,
  uid,
  open,
  setOpen,
  triggers,
  sort = false,
}: {
  panel: { key: Panel; label: string; options: Option[]; menuClass?: string };
  uid: string;
  open: Panel | null;
  setOpen: (panel: Panel | null) => void;
  triggers: React.RefObject<Map<Panel, HTMLButtonElement>>;
  sort?: boolean;
}) {
  const expanded = open === panel.key;
  const panelId = `${uid}-${panel.key}`;

  return (
    <div className={`shop-filter${sort ? ' shop-filter--sort' : ''}`} data-open={expanded ? 'true' : 'false'}>
      <button
        ref={(node) => {
          if (node) triggers.current.set(panel.key, node);
          else triggers.current.delete(panel.key);
        }}
        className="shop-filter__trigger"
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setOpen(expanded ? null : panel.key)}
      >
        {panel.label}
      </button>
      <div
        id={panelId}
        className={`shop-filter__menu ${panel.menuClass ?? ''}`}
        data-open={expanded ? 'true' : 'false'}
        data-lenis-prevent
        data-lenis-prevent-wheel
        data-lenis-prevent-touch
        aria-hidden={!expanded}
        inert={!expanded}
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        {panel.options.map((option) => (
          <Link
            key={`${panel.key}-${option.label}`}
            href={option.href}
            aria-current={option.active ? 'true' : undefined}
            onClick={() => setOpen(null)}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
