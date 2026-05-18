import { describe, expect, it } from 'vitest';
import { parseSysmlText } from './sysml';

describe('parseSysmlText — view blocks (diagrams)', () => {
  it('parses a single view block with @viewpoint and produces one diagram', () => {
    const text = `
package Pkg { // id: pkg-1
}

// @viewpoint bdd
view <Main BDD> { // id: diag-1
  expose Pkg;
}
`;
    const result = parseSysmlText(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const diagrams = result.value.diagrams ?? [];
    expect(diagrams).toHaveLength(1);
    const d = diagrams[0]!;
    expect(d.name).toBe('Main BDD');
    expect(d.viewpointId).toBe('bdd');
    expect(d.id).toBe('diag-1');
    expect(d.context.kind).toBe('package');
    expect(d.context.id).toBe('pkg-1');
  });

  it('defaults viewpointId to "bdd" when @viewpoint annotation is absent', () => {
    const text = `
package Root { // id: root-1
}

view MyView { // id: d-1
  expose Root;
}
`;
    const result = parseSysmlText(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const diagrams = result.value.diagrams ?? [];
    expect(diagrams).toHaveLength(1);
    expect(diagrams[0]!.viewpointId).toBe('bdd');
  });

  it('preserves the diagram id from the // id: trailing comment', () => {
    const text = `
package P { // id: p-99
}

// @viewpoint req
view ReqView { // id: my-diag-uuid-123
  expose P;
}
`;
    const result = parseSysmlText(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const diagrams = result.value.diagrams ?? [];
    expect(diagrams).toHaveLength(1);
    expect(diagrams[0]!.id).toBe('my-diag-uuid-123');
  });

  it('parses a view whose name uses <Quoted Name> with whitespace', () => {
    const text = `
package Sys { // id: sys-1
}

// @viewpoint bdd
view <Flight Control BDD> { // id: fcs-diag
  expose Sys;
}
`;
    const result = parseSysmlText(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const diagrams = result.value.diagrams ?? [];
    expect(diagrams).toHaveLength(1);
    expect(diagrams[0]!.name).toBe('Flight Control BDD');
    expect(diagrams[0]!.id).toBe('fcs-diag');
  });

  it('resolves a two-segment expose path to PartDefinition context', () => {
    const text = `
package Root { // id: root-2
  part def PFC { // id: pfc-2
  }
}

// @viewpoint ibd
view <PFC IBD> { // id: ibd-2
  expose Root::PFC;
}
`;
    const result = parseSysmlText(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const diagrams = result.value.diagrams ?? [];
    expect(diagrams).toHaveLength(1);
    const d = diagrams[0]!;
    expect(d.context.kind).toBe('partDefinition');
    expect(d.context.id).toBe('pfc-2');
    expect(d.viewpointId).toBe('ibd');
  });

  it('produces a ParseError when the expose target does not exist', () => {
    const text = `
package Root { // id: root-3
}

// @viewpoint bdd
view Bad { // id: bad-1
  expose NonExistent;
}
`;
    const result = parseSysmlText(text);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]!.message).toMatch(/expose.*NonExistent|NonExistent.*resolve|unknown.*NonExistent/i);
  });

  it('produces a ParseError when the expose target resolves to an unsupported kind', () => {
    const text = `
package Root { // id: root-4
  actor BadActor; // id: actor-4
}

// @viewpoint bdd
view Bad2 { // id: bad-2
  expose Root::BadActor;
}
`;
    const result = parseSysmlText(text);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]!.message).toMatch(/unsupported|invalid|context|BadActor/i);
  });

  it('parsedProject.diagrams is undefined (not an empty array) when no view blocks are present', () => {
    const text = `
package Simple { // id: simple-1
}
`;
    const result = parseSysmlText(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // diagrams should be absent (undefined) when no views are parsed
    expect(result.value.diagrams).toBeUndefined();
  });
});
