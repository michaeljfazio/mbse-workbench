import { describe, expect, it } from 'vitest';

import type { ElementId } from '@/model';
import type {
  ActionDefinitionDiagramContext,
  DiagramContext,
  DiagramContextKind,
  PackageDiagramContext,
  PartDefinitionDiagramContext,
  StateDefinitionDiagramContext,
} from '@/workspace';

const ID = 'el-1' as ElementId;

describe('DiagramContext discriminated union (T-13.30 widening)', () => {
  it('accepts all four context kinds', () => {
    const pkg: PackageDiagramContext = { kind: 'package', id: ID };
    const part: PartDefinitionDiagramContext = { kind: 'partDefinition', id: ID };
    const action: ActionDefinitionDiagramContext = { kind: 'actionDefinition', id: ID };
    const state: StateDefinitionDiagramContext = { kind: 'stateDefinition', id: ID };

    const all: readonly DiagramContext[] = [pkg, part, action, state];
    expect(all.map((c) => c.kind)).toEqual([
      'package',
      'partDefinition',
      'actionDefinition',
      'stateDefinition',
    ]);
  });

  it('narrows by kind at the type level (exhaustive switch)', () => {
    const cases: readonly DiagramContext[] = [
      { kind: 'package', id: ID },
      { kind: 'partDefinition', id: ID },
      { kind: 'actionDefinition', id: ID },
      { kind: 'stateDefinition', id: ID },
    ];

    function describeKind(ctx: DiagramContext): DiagramContextKind {
      switch (ctx.kind) {
        case 'package':
          return ctx.kind;
        case 'partDefinition':
          return ctx.kind;
        case 'actionDefinition':
          return ctx.kind;
        case 'stateDefinition':
          return ctx.kind;
        default: {
          const _exhaustive: never = ctx;
          return _exhaustive;
        }
      }
    }

    expect(cases.map(describeKind)).toEqual([
      'package',
      'partDefinition',
      'actionDefinition',
      'stateDefinition',
    ]);
  });
});
