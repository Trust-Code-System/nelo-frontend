'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DirectLinkMark } from '@/components/DirectLinkMark';
import type { CSSProperties } from 'react';
import { formatNaira, type NeloProduct } from './nelo';
import type { Market } from '@/lib/vendure/channels';

const COLOUR_SWATCHES: Record<string, string> = {
  black: '#0b0b0b', blue: '#315f9b', brown: '#704531', 'burnt orange': '#a94920',
  cream: '#eee7d8', gold: '#b18b3a', green: '#567052', grey: '#777774',
  'light blue': '#a9cfdf', lilac: '#b6a0d3', 'navy blue': '#17243c', olive: '#6c6b33',
  orange: '#e27631', peach: '#efb09a', pink: '#e7a1af', purple: '#6d367f', red: '#9f1019',
  'sky blue': '#7ec1dd', teal: '#168c91', 'teal blue': '#247d86', white: '#f8f8f5',
  yellow: '#e6c83d', 'baby pink': '#efc9d0', 'fuchsia pink': '#ca3f82', 'off-white': '#ece9df',
  'white with black pant': 'linear-gradient(90deg,#f8f8f5 0 50%,#0b0b0b 50%)',
};

const MEASUREMENT_OPTIONS = {
  bust: Array.from({ length: 33 }, (_, index) => 28 + index),
  waist: Array.from({ length: 33 }, (_, index) => 22 + index),
  hips: Array.from({ length: 35 }, (_, index) => 30 + index),
} as const;

const HEIGHT_OPTIONS = Array.from({ length: 21 }, (_, index) => 58 + index);

type MeasurementKey = keyof typeof MEASUREMENT_OPTIONS | 'height';
type Measurements = Record<MeasurementKey, string>;

const EMPTY_MEASUREMENTS: Measurements = { bust: '', waist: '', hips: '', height: '' };

function inchesLabel(value: number) {
  return `${value} in · ${Math.round(value * 2.54)} cm`;
}

function heightLabel(value: number) {
  const feet = Math.floor(value / 12);
  const inches = value % 12;
  return `${feet}′ ${inches}″ · ${Math.round(value * 2.54)} cm`;
}

export function NeloVariantPicker({ product, market }: { product: NeloProduct; market: Market }) {
  const normalise = (value: string) => value.trim().toLocaleLowerCase();
  const selectableOptions = product.options.filter(
    (option) => !(option.name === 'Title' && option.values.length === 1),
  );
  const firstAvailable = product.variants.find((variant) => variant.available) ?? product.variants[0];
  const [selected, setSelected] = useState<string[]>([
    firstAvailable?.option1 ?? '',
    firstAvailable?.option2 ?? '',
    firstAvailable?.option3 ?? '',
  ]);
  const [measurements, setMeasurements] = useState<Measurements>(EMPTY_MEASUREMENTS);

  const variant = useMemo(
    () =>
      product.variants.find(
        (item) =>
          normalise(item.option1) === normalise(selected[0] ?? '') &&
          normalise(item.option2) === normalise(selected[1] ?? '') &&
          normalise(item.option3) === normalise(selected[2] ?? ''),
      ) ?? firstAvailable,
    [firstAvailable, product.variants, selected],
  );

  function choose(position: number, value: string) {
    setSelected((current) => current.map((item, index) => (index === position ? value : item)));
  }

  const orderHref = useMemo(() => {
    const params = new URLSearchParams({
      piece: product.title,
      handle: product.handle,
    });

    if (variant) params.set('variant', variant.id);
    selectableOptions.forEach((option) => {
      const value = selected[option.position - 1];
      if (value) params.set(option.name.toLocaleLowerCase(), value);
    });
    Object.entries(measurements).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    return `/${market}/atelier?${params.toString()}`;
  }, [market, measurements, product.handle, product.title, selectableOptions, selected, variant]);

  return (
    <div className="nelo-variant-picker">
      {selectableOptions.map((option) => {
        const position = option.position - 1;
        const isColour = option.name.toLocaleLowerCase() === 'colour';
        const values = option.values.filter(
          (value, index, all) =>
            all.findIndex((candidate) => normalise(candidate) === normalise(value)) === index,
        );
        return (
          <fieldset key={option.name}>
            <legend>{option.name}</legend>
            <div className="nelo-option-list">
              {values.map((value) => {
                const canMatch = product.variants.some((candidate) => {
                  const values = [candidate.option1, candidate.option2, candidate.option3];
                  return candidate.available && normalise(values[position] ?? '') === normalise(value);
                });
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={normalise(selected[position] ?? '') === normalise(value)}
                    disabled={!canMatch}
                    onClick={() => choose(position, value)}
                  >
                    {isColour ? (
                      <span
                        className="nelo-option-swatch"
                        aria-hidden="true"
                        style={{ '--swatch': COLOUR_SWATCHES[normalise(value)] ?? '#d8d8d4' } as CSSProperties}
                      />
                    ) : null}
                    <span>{value}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <fieldset className="nelo-measurements">
        <legend>Your measurements</legend>
        <div className="nelo-measurements__heading">
          <p>Optional, but useful when you want the atelier to refine the selected size.</p>
          <Link href={`/${market}/size-guide`}>How to measure <DirectLinkMark /></Link>
        </div>
        <div className="nelo-measurements__grid">
          {(Object.keys(MEASUREMENT_OPTIONS) as Array<keyof typeof MEASUREMENT_OPTIONS>).map((key) => (
            <label key={key}>
              <span>{key === 'hips' ? 'Hips' : `${key[0]!.toUpperCase()}${key.slice(1)}`} (inches)</span>
              <select
                aria-label={key === 'hips' ? 'Hips' : `${key[0]!.toUpperCase()}${key.slice(1)}`}
                value={measurements[key]}
                onChange={(event) =>
                  setMeasurements((current) => ({ ...current, [key]: event.target.value }))
                }
              >
                <option value="">Select {key}</option>
                {MEASUREMENT_OPTIONS[key].map((value) => (
                  <option key={value} value={value}>{inchesLabel(value)}</option>
                ))}
              </select>
            </label>
          ))}
          <label>
            <span>Height</span>
            <select
              aria-label="Height"
              value={measurements.height}
              onChange={(event) =>
                setMeasurements((current) => ({ ...current, height: event.target.value }))
              }
            >
              <option value="">Select height</option>
              {HEIGHT_OPTIONS.map((value) => (
                <option key={value} value={value}>{heightLabel(value)}</option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <div className="nelo-order-summary" aria-live="polite">
        <div>
          <span className="lab">Selected piece</span>
          <strong>
            {variant
              ? Number(variant.price) > 0
                ? formatNaira(variant.price)
                : 'Price on request'
              : 'Price unavailable'}
          </strong>
        </div>
        <span className={variant?.available ? 'is-available' : 'is-unavailable'}>
          {variant?.available ? 'Available to order' : 'Currently unavailable'}
        </span>
      </div>

      {variant?.available ? (
        <Link
          className="btn nelo-order-button"
          href={orderHref}
        >
          Order this piece
        </Link>
      ) : (
        <button className="btn nelo-order-button" type="button" disabled>
          Currently unavailable
        </button>
      )}
      <p className="nelo-order-note">
        Your selections stay on this NELO site and continue into a private atelier request.
        {' '}Nothing is charged until the atelier confirms the piece, fit, timing and price.
      </p>
    </div>
  );
}
