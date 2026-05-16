import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

import type { ElementKind } from '@/model';
import { kindIcon, KIND_ICONS } from '@/workspace/tree/kindIcons';

const ALL_KINDS: readonly ElementKind[] = [
  'Package',
  'PartDefinition',
  'PartUsage',
  'PortDefinition',
  'PortUsage',
  'InterfaceDefinition',
  'ConnectionUsage',
  'ItemFlow',
  'Requirement',
  'ActionDefinition',
  'ActionUsage',
  'StateDefinition',
  'StateUsage',
  'Transition',
  'UseCase',
  'Actor',
  'ConstraintDefinition',
  'ConstraintUsage',
  'ValueProperty',
];

describe('kindIcons', () => {
  it('maps every ElementKind to a defined icon component', () => {
    for (const kind of ALL_KINDS) {
      expect(KIND_ICONS[kind], `${kind} should have an icon`).toBeDefined();
    }
  });

  it('kindIcon(kind) returns a renderable React component for every kind', () => {
    for (const kind of ALL_KINDS) {
      const Icon = kindIcon(kind);
      const markup = renderToStaticMarkup(createElement(Icon, { 'aria-hidden': true }));
      expect(markup, `${kind} icon should render an <svg>`).toContain('<svg');
    }
  });

  it('reuses the same icon for definition/usage pairs', () => {
    expect(kindIcon('ActionDefinition')).toBe(kindIcon('ActionUsage'));
    expect(kindIcon('StateDefinition')).toBe(kindIcon('StateUsage'));
    expect(kindIcon('PortDefinition')).toBe(kindIcon('PortUsage'));
    expect(kindIcon('ConstraintDefinition')).toBe(kindIcon('ConstraintUsage'));
  });
});
