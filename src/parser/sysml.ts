import type {
  ActionNodeType,
  EdgeId,
  ElementId,
  ElementKind,
  ElementOfKind,
  ModelEdge,
  ModelElement,
  OwnerRole,
  PortDirection,
  ProjectId,
  RequirementPriority,
  RequirementStatus,
  RequirementTraceKind,
  StateNodeType,
  ValueLiteral,
  ValueType,
} from '@/model';
import { ACTION_NODE_TYPE_VALUES, STATE_NODE_TYPE_VALUES } from '@/model';
import { STANDARD_LIBRARY_INDEX, type LibraryIndex } from '@/library';

export interface ParseError {
  readonly line: number;
  readonly col: number;
  readonly message: string;
}

export interface ParsedProject {
  readonly elements: ModelElement[];
  readonly edges: ModelEdge[];
  readonly projectId?: ProjectId;
  readonly projectName?: string;
  /**
   * Qualified names from leading `import <Qualname>::*;` directives, in
   * source order. T-14.05 surfaces these for documentation / round-trip;
   * namespace resolution against the named packages lands in T-14.06.
   */
  readonly imports?: readonly string[];
}

export type ParseResult =
  | { readonly ok: true; readonly value: ParsedProject }
  | { readonly ok: false; readonly errors: ParseError[] };

export interface ParseOptions {
  /**
   * Library namespace to seed when parsing `import …::*;` directives.
   * Defaults to {@link STANDARD_LIBRARY_INDEX} — i.e. KerML core only — for
   * fresh standalone parses. The workspace `importSysmlText` action passes
   * an index built from the current project so user-defined library roots
   * also resolve (T-14.06).
   */
  readonly libraryIndex?: LibraryIndex;
}

export function parseSysmlText(
  input: string,
  options: ParseOptions = {},
): ParseResult {
  try {
    const tokens = tokenize(input);
    const libraryIndex = options.libraryIndex ?? STANDARD_LIBRARY_INDEX;
    const p = new Parser(tokens, libraryIndex);
    const result = p.parseFile();
    return { ok: true, value: result };
  } catch (e) {
    if (e instanceof ParserError) {
      return { ok: false, errors: [{ line: e.line, col: e.col, message: e.message }] };
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, errors: [{ line: 1, col: 1, message: msg }] };
  }
}

// -- tokenizer -------------------------------------------------------

type TokenType =
  | 'ident'
  | 'string'
  | 'number'
  | 'punct'
  | 'idmark'
  | 'arrow'
  | 'eof';

interface Token {
  readonly type: TokenType;
  readonly value: string;
  readonly line: number;
  readonly col: number;
}

class ParserError extends Error {
  readonly line: number;
  readonly col: number;
  constructor(message: string, line: number, col: number) {
    super(message);
    this.name = 'ParserError';
    this.line = line;
    this.col = col;
  }
}

const PUNCT_CHARS = new Set(['{', '}', '[', ']', ':', ';', ',', '=', '*']);

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  const n = src.length;

  function advance(ch: string): void {
    if (ch === '\n') {
      line += 1;
      col = 1;
    } else {
      col += 1;
    }
  }

  while (i < n) {
    const ch = src[i] ?? '';
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      advance(ch);
      i += 1;
      continue;
    }
    if (ch === '/' && src[i + 1] === '/') {
      const startLine = line;
      const startCol = col;
      let j = i + 2;
      while (j < n && src[j] !== '\n') j += 1;
      const body = src.slice(i + 2, j);
      const idRegex = /id:\s*([A-Za-z0-9_-]+)/g;
      let m: RegExpExecArray | null;
      while ((m = idRegex.exec(body)) !== null) {
        tokens.push({
          type: 'idmark',
          value: m[1] ?? '',
          line: startLine,
          col: startCol,
        });
      }
      const consumed = j - i;
      for (let k = 0; k < consumed; k += 1) {
        col += 1;
      }
      i = j;
      continue;
    }
    if (ch === '"') {
      const startLine = line;
      const startCol = col;
      let j = i + 1;
      let str = '';
      while (j < n) {
        const c = src[j] ?? '';
        if (c === '\\' && j + 1 < n) {
          const next = src[j + 1] ?? '';
          if (next === 'n') str += '\n';
          else if (next === 't') str += '\t';
          else if (next === 'r') str += '\r';
          else if (next === '"') str += '"';
          else if (next === '\\') str += '\\';
          else if (next === '/') str += '/';
          else if (next === 'b') str += '\b';
          else if (next === 'f') str += '\f';
          else if (next === 'u') {
            const hex = src.slice(j + 2, j + 6);
            str += String.fromCharCode(parseInt(hex, 16));
            j += 4;
          } else {
            str += next;
          }
          j += 2;
          continue;
        }
        if (c === '"') {
          j += 1;
          break;
        }
        if (c === '\n') {
          throw new ParserError('unterminated string', startLine, startCol);
        }
        str += c;
        j += 1;
      }
      tokens.push({ type: 'string', value: str, line: startLine, col: startCol });
      const consumed = j - i;
      for (let k = 0; k < consumed; k += 1) col += 1;
      i = j;
      continue;
    }
    if (ch === '-' && src[i + 1] === '>') {
      tokens.push({ type: 'arrow', value: '->', line, col });
      col += 2;
      i += 2;
      continue;
    }
    if (ch === ':' && src[i + 1] === ':') {
      tokens.push({ type: 'punct', value: '::', line, col });
      col += 2;
      i += 2;
      continue;
    }
    if (PUNCT_CHARS.has(ch)) {
      tokens.push({ type: 'punct', value: ch, line, col });
      col += 1;
      i += 1;
      continue;
    }
    if (isNumberStart(ch, src, i)) {
      const startLine = line;
      const startCol = col;
      let j = i;
      if (src[j] === '-' || src[j] === '+') j += 1;
      while (j < n && /[0-9.eE+-]/.test(src[j] ?? '')) j += 1;
      const lit = src.slice(i, j);
      tokens.push({ type: 'number', value: lit, line: startLine, col: startCol });
      const consumed = j - i;
      for (let k = 0; k < consumed; k += 1) col += 1;
      i = j;
      continue;
    }
    if (isIdentStart(ch)) {
      const startLine = line;
      const startCol = col;
      let j = i;
      while (j < n && isIdentPart(src[j] ?? '')) j += 1;
      const lit = src.slice(i, j);
      tokens.push({ type: 'ident', value: lit, line: startLine, col: startCol });
      const consumed = j - i;
      for (let k = 0; k < consumed; k += 1) col += 1;
      i = j;
      continue;
    }
    if (ch === '<') {
      // OMG SysMLv2 §4.4.1 quotedName: `<` … `>` around any character
      // except newline and unescaped `>`. The inner content becomes the
      // identifier value verbatim. Issue #446.
      const startLine = line;
      const startCol = col;
      let j = i + 1;
      let body = '';
      while (j < n && src[j] !== '>' && src[j] !== '\n') {
        body += src[j];
        j += 1;
      }
      if (j >= n || src[j] !== '>') {
        throw new ParserError('unterminated quoted name', startLine, startCol);
      }
      j += 1;
      tokens.push({ type: 'ident', value: body, line: startLine, col: startCol });
      const consumed = j - i;
      for (let k = 0; k < consumed; k += 1) col += 1;
      i = j;
      continue;
    }
    tokens.push({ type: 'punct', value: ch, line, col });
    col += 1;
    i += 1;
  }
  tokens.push({ type: 'eof', value: '', line, col });
  return tokens;
}

function isIdentStart(c: string): boolean {
  return /[A-Za-z_]/.test(c);
}
function isIdentPart(c: string): boolean {
  return /[A-Za-z0-9_-]/.test(c);
}
function isNumberStart(c: string, src: string, i: number): boolean {
  if (/[0-9]/.test(c)) return true;
  if ((c === '-' || c === '+') && /[0-9]/.test(src[i + 1] ?? '')) return true;
  return false;
}

// -- parser ----------------------------------------------------------

/** A "loose" element — every parser method returns one of these (no owner
 * fields yet). The caller stamps `ownerId`/`ownerRole`/`ownerIndex` based on
 * lexical containment. Distributed over `ElementKind` so each per-kind
 * variant retains its discriminant-specific required fields. */
type LooseElement = {
  [K in ElementKind]: Omit<
    ElementOfKind<K>,
    'ownerId' | 'ownerRole' | 'ownerIndex'
  >;
}[ElementKind];

interface OwnerInfo {
  readonly ownerId: ElementId | null;
  readonly role: OwnerRole;
  readonly index: number;
}

function stamp(loose: LooseElement, owner: OwnerInfo): ModelElement {
  return {
    ...loose,
    ownerId: owner.ownerId,
    ownerRole: owner.role,
    ownerIndex: owner.index,
  } as ModelElement;
}

class Parser {
  private readonly tokens: Token[];
  private readonly libraryIndex: LibraryIndex;
  private pos = 0;
  private readonly nameToId = new Map<string, ElementId>();
  private readonly pendingRefs: Array<{ name: string; apply: (id: ElementId) => void }> = [];
  private projectId?: ProjectId;
  private projectName?: string;
  private readonly elements: ModelElement[] = [];

  constructor(tokens: Token[], libraryIndex: LibraryIndex) {
    this.tokens = tokens;
    this.libraryIndex = libraryIndex;
  }

  parseFile(): ParsedProject {
    const edges: ModelEdge[] = [];
    const imports: string[] = [];

    if (this.peek().type === 'idmark') {
      this.projectId = this.consume().value as ProjectId;
    }

    let topIndex = 0;
    while (this.peek().type !== 'eof') {
      const t = this.peek();
      if (this.isImportDirective()) {
        const qn = this.parseImportDirective();
        imports.push(qn);
        this.seedLibraryNames(qn);
        continue;
      }
      if (this.isEdgeKeyword(t.value)) {
        edges.push(this.parseEdge());
        continue;
      }
      const loose = this.parseElement();
      const stamped = stamp(loose, {
        ownerId: null,
        role: 'member',
        index: topIndex,
      });
      this.elements.push(stamped);
      topIndex += 1;
    }

    for (const ref of this.pendingRefs) {
      const id = this.nameToId.get(ref.name);
      if (id) ref.apply(id);
    }

    const result: ParsedProject = {
      elements: this.elements,
      edges,
    };
    if (this.projectId !== undefined) {
      (result as { projectId?: ProjectId }).projectId = this.projectId;
    }
    if (this.projectName !== undefined) {
      (result as { projectName?: string }).projectName = this.projectName;
    }
    if (imports.length > 0) {
      (result as { imports?: readonly string[] }).imports = imports;
    }
    return result;
  }

  /**
   * True iff the current position starts an `import <Qualname>::*;`
   * directive. Disambiguates from the `import` *edge* form
   * (`import src -> tgt;`) by requiring a `::` after the first ident.
   */
  private isImportDirective(): boolean {
    const t0 = this.peek();
    if (t0.type !== 'ident' || t0.value !== 'import') return false;
    const t1 = this.peek(1);
    if (t1.type !== 'ident') return false;
    const t2 = this.peek(2);
    return t2.type === 'punct' && t2.value === '::';
  }

  /** Seeds `nameToId` with the short names of library elements under
   * `qn`, so unqualified references in the body resolve to library
   * element ids. Resolution goes through the supplied `LibraryIndex`,
   * which covers the standard library by default and additionally any
   * user-defined library roots when the workspace passes a project-
   * derived index (T-14.06). No-op for unknown qualnames. */
  private seedLibraryNames(qn: string): void {
    const inner = this.libraryIndex.resolveImport(qn);
    if (!inner) return;
    for (const [shortName, id] of inner) {
      // Don't overwrite a user-defined name with a library binding.
      if (!this.nameToId.has(shortName)) {
        this.nameToId.set(shortName, id);
      }
    }
  }

  /** Consumes `import Ident ('::' Ident)* '::' '*' ';'` and returns the
   * qualified name (e.g. `'Base'` or `'kerml::core::Base'`). */
  private parseImportDirective(): string {
    this.expectIdent('import');
    const parts: string[] = [this.expectIdent().value];
    while (this.peek().type === 'punct' && this.peek().value === '::') {
      this.consume();
      const next = this.peek();
      if (next.type === 'punct' && next.value === '*') {
        this.consume();
        this.expectPunct(';');
        return parts.join('::');
      }
      if (next.type !== 'ident') {
        throw new ParserError(
          `expected identifier or '*' after '::'`,
          next.line,
          next.col,
        );
      }
      parts.push(this.consume().value);
    }
    const t = this.peek();
    throw new ParserError(
      `import directive must end with '::*;'`,
      t.line,
      t.col,
    );
  }

  private isEdgeKeyword(value: string): boolean {
    return [
      'composition',
      'aggregation',
      'generalization',
      'association',
      'dependency',
      'trace',
      'control-flow',
      'object-flow',
      'include',
      'extend',
      'binding',
      'import',
    ].includes(value);
  }

  private peek(offset = 0): Token {
    return this.tokens[this.pos + offset] ?? this.tokens[this.tokens.length - 1]!;
  }
  private consume(): Token {
    const t = this.tokens[this.pos]!;
    this.pos += 1;
    return t;
  }
  private expectIdent(name?: string): Token {
    const t = this.peek();
    if (t.type !== 'ident') {
      throw new ParserError(`expected identifier${name ? ` '${name}'` : ''}`, t.line, t.col);
    }
    if (name && t.value !== name) {
      throw new ParserError(`expected '${name}' but got '${t.value}'`, t.line, t.col);
    }
    return this.consume();
  }
  private expectPunct(p: string): Token {
    const t = this.peek();
    if (t.type !== 'punct' || t.value !== p) {
      throw new ParserError(`expected '${p}'`, t.line, t.col);
    }
    return this.consume();
  }
  private matchIdent(name: string): boolean {
    const t = this.peek();
    return t.type === 'ident' && t.value === name;
  }
  private consumeIdMark(): ElementId {
    const t = this.peek();
    if (t.type !== 'idmark') {
      throw new ParserError(`expected '// id: <id>' marker`, t.line, t.col);
    }
    this.consume();
    return t.value as ElementId;
  }

  private parseElement(): LooseElement {
    const t = this.peek();
    if (t.type !== 'ident') {
      throw new ParserError(`unexpected token '${t.value}'`, t.line, t.col);
    }
    switch (t.value) {
      case 'package':
        return this.parsePackage();
      case 'abstract':
      case 'part':
        return this.parsePartLike();
      case 'port':
        return this.parsePortLike();
      case 'interface':
        return this.parseInterfaceDef();
      case 'connection':
        return this.parseConnection();
      case 'flow':
        return this.parseItemFlow();
      case 'requirement':
        return this.parseRequirement();
      case 'action':
        return this.parseActionLike();
      case 'state':
      case 'composite':
        return this.parseStateLike();
      case 'transition':
        return this.parseTransition();
      case 'use':
        return this.parseUseCase();
      case 'actor':
        return this.parseActor();
      case 'constraint':
        return this.parseConstraintLike();
      case 'attribute':
        return this.parseValueProperty();
      default:
        throw new ParserError(`unknown element '${t.value}'`, t.line, t.col);
    }
  }

  /** Parse a block body, stamping each child with the given owner id + role,
   * advancing a per-role index. Children are pushed onto the flat element
   * list; their `LooseElement` form is returned to the caller in case it
   * wants per-child handling (e.g. PartDefinition discriminating PortDefinition
   * vs ValueProperty). */
  private parseBlockChildren(
    ownerId: ElementId,
    roleOf: (child: LooseElement) => OwnerRole,
  ): LooseElement[] {
    const indices = new Map<OwnerRole, number>();
    const collected: LooseElement[] = [];
    while (!(this.peek().type === 'punct' && this.peek().value === '}')) {
      const loose = this.parseElement();
      const role = roleOf(loose);
      const idx = indices.get(role) ?? 0;
      indices.set(role, idx + 1);
      this.elements.push(stamp(loose, { ownerId, role, index: idx }));
      collected.push(loose);
    }
    return collected;
  }

  private parsePackage(): LooseElement {
    this.expectIdent('package');
    const nameTok = this.expectIdent();
    this.expectPunct('{');
    const id = this.consumeIdMark();
    const documentation = this.parseOptionalDoc();
    this.parseBlockChildren(id, () => 'member');
    this.expectPunct('}');
    const pkg: LooseElement = {
      id,
      kind: 'Package',
      name: nameTok.value,
    };
    if (documentation !== undefined) (pkg as { documentation?: string }).documentation = documentation;
    this.nameToId.set(nameTok.value, id);
    return pkg;
  }

  private parseOptionalDoc(): string | undefined {
    if (this.matchIdent('doc') && this.peek(1).type === 'string') {
      this.consume();
      const s = this.consume();
      return s.value;
    }
    return undefined;
  }

  private parsePartLike(): LooseElement {
    let isAbstract = false;
    if (this.matchIdent('abstract')) {
      this.consume();
      isAbstract = true;
    }
    this.expectIdent('part');
    if (this.matchIdent('def')) {
      this.consume();
      const name = this.expectIdent().value;
      this.expectPunct('{');
      const id = this.consumeIdMark();
      const documentation = this.parseOptionalDoc();
      this.parseBlockChildren(id, (child) => {
        if (child.kind === 'PortDefinition') return 'port';
        if (child.kind === 'ValueProperty') return 'property';
        throw new ParserError(
          `unexpected '${child.kind}' inside part def`,
          this.peek().line,
          this.peek().col,
        );
      });
      this.expectPunct('}');
      const out: LooseElement = {
        id,
        kind: 'PartDefinition',
        name,
        isAbstract,
      };
      if (documentation !== undefined) (out as { documentation?: string }).documentation = documentation;
      this.nameToId.set(name, id);
      return out;
    }
    const name = this.expectIdent().value;
    this.expectPunct(':');
    const defName = this.expectIdent().value;
    let multiplicity: string | undefined;
    if (this.peek().type === 'punct' && this.peek().value === '[') {
      this.consume();
      const mTok = this.peek();
      let m = '';
      while (!(this.peek().type === 'punct' && this.peek().value === ']')) {
        const tk = this.consume();
        if (tk.type === 'eof') {
          throw new ParserError(`unterminated multiplicity`, mTok.line, mTok.col);
        }
        m += tk.value;
      }
      this.expectPunct(']');
      multiplicity = m;
    }
    this.expectPunct('{');
    const id = this.consumeIdMark();
    const documentation = this.parseOptionalDoc();
    this.parseBlockChildren(id, (child) => {
      if (child.kind === 'PortUsage') return 'port';
      throw new ParserError(
        `expected PortUsage inside part block, got ${child.kind}`,
        this.peek().line,
        this.peek().col,
      );
    });
    this.expectPunct('}');
    const out: Omit<
      Extract<ModelElement, { kind: 'PartUsage' }>,
      'ownerId' | 'ownerRole' | 'ownerIndex'
    > = {
      id,
      kind: 'PartUsage',
      name,
      definitionId: this.resolveName(defName),
    };
    if (!this.nameToId.has(defName)) {
      this.pendingRefs.push({
        name: defName,
        apply: (rid) => {
          (out as { definitionId: ElementId }).definitionId = rid;
          // Update the stamped copy in the flat list as well.
          const stampedIdx = this.elements.findIndex((e) => e.id === id);
          if (stampedIdx >= 0) {
            const cur = this.elements[stampedIdx];
            if (cur && cur.kind === 'PartUsage') {
              (cur as { definitionId: ElementId }).definitionId = rid;
            }
          }
        },
      });
    }
    if (multiplicity !== undefined) (out as { multiplicity?: string }).multiplicity = multiplicity;
    if (documentation !== undefined) (out as { documentation?: string }).documentation = documentation;
    this.nameToId.set(name, id);
    return out as LooseElement;
  }

  private parsePortLike(): LooseElement {
    this.expectIdent('port');
    if (this.matchIdent('def')) {
      this.consume();
      const dirTok = this.expectIdent();
      const direction = dirTok.value as PortDirection;
      if (direction !== 'in' && direction !== 'out' && direction !== 'inout') {
        throw new ParserError(
          `invalid port direction '${direction}'`,
          dirTok.line,
          dirTok.col,
        );
      }
      const name = this.expectIdent().value;
      let interfaceName: string | undefined;
      if (this.peek().type === 'punct' && this.peek().value === ':') {
        this.consume();
        interfaceName = this.expectIdent().value;
      }
      this.expectPunct(';');
      const id = this.consumeIdMark();
      const out: Omit<
        Extract<ModelElement, { kind: 'PortDefinition' }>,
        'ownerId' | 'ownerRole' | 'ownerIndex'
      > = {
        id,
        kind: 'PortDefinition',
        name,
        direction,
      };
      if (interfaceName !== undefined) {
        (out as { interfaceId?: ElementId }).interfaceId =
          this.resolveName(interfaceName);
        if (!this.nameToId.has(interfaceName)) {
          const ifn = interfaceName;
          this.pendingRefs.push({
            name: ifn,
            apply: (rid) => {
              (out as { interfaceId?: ElementId }).interfaceId = rid;
              const idx = this.elements.findIndex((e) => e.id === id);
              if (idx >= 0) {
                const cur = this.elements[idx];
                if (cur && cur.kind === 'PortDefinition') {
                  (cur as { interfaceId?: ElementId }).interfaceId = rid;
                }
              }
            },
          });
        }
      }
      this.nameToId.set(name, id);
      return out as LooseElement;
    }
    const name = this.expectIdent().value;
    this.expectPunct(':');
    const defName = this.expectIdent().value;
    this.expectPunct(';');
    const id = this.consumeIdMark();
    const out: Omit<
      Extract<ModelElement, { kind: 'PortUsage' }>,
      'ownerId' | 'ownerRole' | 'ownerIndex'
    > = {
      id,
      kind: 'PortUsage',
      name,
      definitionId: this.resolveName(defName),
    };
    if (!this.nameToId.has(defName)) {
      this.pendingRefs.push({
        name: defName,
        apply: (rid) => {
          (out as { definitionId: ElementId }).definitionId = rid;
          const idx = this.elements.findIndex((e) => e.id === id);
          if (idx >= 0) {
            const cur = this.elements[idx];
            if (cur && cur.kind === 'PortUsage') {
              (cur as { definitionId: ElementId }).definitionId = rid;
            }
          }
        },
      });
    }
    this.nameToId.set(name, id);
    return out as LooseElement;
  }

  private parseInterfaceDef(): LooseElement {
    this.expectIdent('interface');
    this.expectIdent('def');
    const name = this.expectIdent().value;
    this.expectPunct('{');
    const id = this.consumeIdMark();
    const documentation = this.parseOptionalDoc();
    this.parseBlockChildren(id, (child) => {
      if (child.kind === 'PortDefinition') return 'portDefinition';
      throw new ParserError(
        `expected PortDefinition inside interface def, got ${child.kind}`,
        this.peek().line,
        this.peek().col,
      );
    });
    this.expectPunct('}');
    const out: LooseElement = {
      id,
      kind: 'InterfaceDefinition',
      name,
    };
    if (documentation !== undefined) (out as { documentation?: string }).documentation = documentation;
    this.nameToId.set(name, id);
    return out;
  }

  private parseConnection(): LooseElement {
    this.expectIdent('connection');
    const name = this.expectIdent().value;
    this.expectIdent('connect');
    const source = this.expectIdent().value;
    this.expectIdent('to');
    const target = this.expectIdent().value;
    this.expectPunct(';');
    const id = this.consumeIdMark();
    return {
      id,
      kind: 'ConnectionUsage',
      name,
      sourceId: source as ElementId,
      targetId: target as ElementId,
    };
  }

  private parseItemFlow(): LooseElement {
    this.expectIdent('flow');
    const name = this.expectIdent().value;
    let itemType: string | undefined;
    if (this.matchIdent('of')) {
      this.consume();
      itemType = this.expectIdent().value;
    }
    this.expectIdent('from');
    const source = this.expectIdent().value;
    this.expectIdent('to');
    const target = this.expectIdent().value;
    this.expectPunct(';');
    const id = this.consumeIdMark();
    const out: LooseElement = {
      id,
      kind: 'ItemFlow',
      name,
      sourceId: source as ElementId,
      targetId: target as ElementId,
    };
    if (itemType !== undefined) (out as { itemType?: string }).itemType = itemType;
    return out;
  }

  private parseRequirement(): LooseElement {
    this.expectIdent('requirement');
    let reqId: string | undefined;
    let name: string;
    const first = this.expectIdent().value;
    if (this.peek().type === 'punct' && this.peek().value === '{') {
      name = first;
    } else {
      reqId = first;
      name = this.expectIdent().value;
    }
    this.expectPunct('{');
    const id = this.consumeIdMark();
    let priority: RequirementPriority | undefined;
    let status: RequirementStatus | undefined;
    let text: string | undefined;
    let rationale: string | undefined;
    let documentation: string | undefined;
    while (!(this.peek().type === 'punct' && this.peek().value === '}')) {
      const key = this.expectIdent().value;
      if (key === 'priority') {
        priority = this.expectIdent().value as RequirementPriority;
        this.expectPunct(';');
      } else if (key === 'status') {
        status = this.expectIdent().value as RequirementStatus;
        this.expectPunct(';');
      } else if (key === 'text') {
        const s = this.peek();
        if (s.type !== 'string') {
          throw new ParserError(`expected string after 'text'`, s.line, s.col);
        }
        text = this.consume().value;
        this.expectPunct(';');
      } else if (key === 'rationale') {
        const s = this.peek();
        if (s.type !== 'string') {
          throw new ParserError(`expected string after 'rationale'`, s.line, s.col);
        }
        rationale = this.consume().value;
        this.expectPunct(';');
      } else if (key === 'doc') {
        const s = this.peek();
        if (s.type !== 'string') {
          throw new ParserError(`expected string after 'doc'`, s.line, s.col);
        }
        documentation = this.consume().value;
        this.expectPunct(';');
      } else {
        const t = this.peek();
        throw new ParserError(`unknown requirement field '${key}'`, t.line, t.col);
      }
    }
    this.expectPunct('}');
    if (!priority || !status || text === undefined) {
      const t = this.peek();
      throw new ParserError(`requirement missing required fields`, t.line, t.col);
    }
    const out: LooseElement = {
      id,
      kind: 'Requirement',
      name,
      text,
      priority,
      status,
    };
    if (reqId !== undefined) (out as { reqId?: string }).reqId = reqId;
    if (rationale !== undefined) (out as { rationale?: string }).rationale = rationale;
    if (documentation !== undefined) (out as { documentation?: string }).documentation = documentation;
    this.nameToId.set(name, id);
    return out;
  }

  private parseActionLike(): LooseElement {
    this.expectIdent('action');
    if (this.matchIdent('def')) {
      this.consume();
      const name = this.expectIdent().value;
      this.expectPunct('{');
      const id = this.consumeIdMark();
      const documentation = this.parseOptionalDoc();
      this.parseBlockChildren(id, () => 'parameter');
      this.expectPunct('}');
      const out: LooseElement = {
        id,
        kind: 'ActionDefinition',
        name,
      };
      if (documentation !== undefined) (out as { documentation?: string }).documentation = documentation;
      this.nameToId.set(name, id);
      return out;
    }
    const nodeTypeTok = this.expectIdent();
    const nodeType = nodeTypeTok.value as ActionNodeType;
    if (!(ACTION_NODE_TYPE_VALUES as readonly string[]).includes(nodeType)) {
      throw new ParserError(
        `invalid action node type '${nodeType}'`,
        nodeTypeTok.line,
        nodeTypeTok.col,
      );
    }
    const name = this.expectIdent().value;
    let defName: string | undefined;
    if (this.peek().type === 'punct' && this.peek().value === ':') {
      this.consume();
      defName = this.expectIdent().value;
    }
    this.expectPunct(';');
    const id = this.consumeIdMark();
    const out: Omit<
      Extract<ModelElement, { kind: 'ActionUsage' }>,
      'ownerId' | 'ownerRole' | 'ownerIndex'
    > = {
      id,
      kind: 'ActionUsage',
      name,
      nodeType,
    };
    if (defName !== undefined) {
      (out as { definitionId?: ElementId }).definitionId =
        this.resolveName(defName);
      if (!this.nameToId.has(defName)) {
        const dn = defName;
        this.pendingRefs.push({
          name: dn,
          apply: (rid) => {
            (out as { definitionId?: ElementId }).definitionId = rid;
            const idx = this.elements.findIndex((e) => e.id === id);
            if (idx >= 0) {
              const cur = this.elements[idx];
              if (cur && cur.kind === 'ActionUsage') {
                (cur as { definitionId?: ElementId }).definitionId = rid;
              }
            }
          },
        });
      }
    }
    this.nameToId.set(name, id);
    return out as LooseElement;
  }

  private parseStateLike(): LooseElement {
    let isComposite = false;
    if (this.matchIdent('composite')) {
      this.consume();
      isComposite = true;
    }
    this.expectIdent('state');
    if (this.matchIdent('def')) {
      this.consume();
      const name = this.expectIdent().value;
      this.expectPunct(';');
      const id = this.consumeIdMark();
      const out: LooseElement = {
        id,
        kind: 'StateDefinition',
        name,
        isComposite,
      };
      this.nameToId.set(name, id);
      return out;
    }
    const typeTok = this.expectIdent();
    const stateType = typeTok.value as StateNodeType;
    if (!(STATE_NODE_TYPE_VALUES as readonly string[]).includes(stateType)) {
      throw new ParserError(
        `invalid state type '${stateType}'`,
        typeTok.line,
        typeTok.col,
      );
    }
    const name = this.expectIdent().value;
    let defName: string | undefined;
    if (this.peek().type === 'punct' && this.peek().value === ':') {
      this.consume();
      defName = this.expectIdent().value;
    }
    let entryAction: string | undefined;
    let doAction: string | undefined;
    let exitAction: string | undefined;
    let id: ElementId;
    if (this.peek().type === 'punct' && this.peek().value === '{') {
      this.consume();
      id = this.consumeIdMark();
      while (!(this.peek().type === 'punct' && this.peek().value === '}')) {
        const key = this.expectIdent().value;
        const s = this.peek();
        if (s.type !== 'string') {
          throw new ParserError(`expected string after '${key}'`, s.line, s.col);
        }
        const val = this.consume().value;
        this.expectPunct(';');
        if (key === 'entry') entryAction = val;
        else if (key === 'do') doAction = val;
        else if (key === 'exit') exitAction = val;
        else
          throw new ParserError(
            `unknown state field '${key}'`,
            s.line,
            s.col,
          );
      }
      this.expectPunct('}');
    } else {
      this.expectPunct(';');
      id = this.consumeIdMark();
    }
    const out: Omit<
      Extract<ModelElement, { kind: 'StateUsage' }>,
      'ownerId' | 'ownerRole' | 'ownerIndex'
    > = {
      id,
      kind: 'StateUsage',
      name,
      stateType,
    };
    if (defName !== undefined) {
      (out as { definitionId?: ElementId }).definitionId =
        this.resolveName(defName);
      if (!this.nameToId.has(defName)) {
        const dn = defName;
        this.pendingRefs.push({
          name: dn,
          apply: (rid) => {
            (out as { definitionId?: ElementId }).definitionId = rid;
            const idx = this.elements.findIndex((e) => e.id === id);
            if (idx >= 0) {
              const cur = this.elements[idx];
              if (cur && cur.kind === 'StateUsage') {
                (cur as { definitionId?: ElementId }).definitionId = rid;
              }
            }
          },
        });
      }
    }
    if (entryAction !== undefined) (out as { entryAction?: string }).entryAction = entryAction;
    if (doAction !== undefined) (out as { doAction?: string }).doAction = doAction;
    if (exitAction !== undefined) (out as { exitAction?: string }).exitAction = exitAction;
    this.nameToId.set(name, id);
    return out as LooseElement;
  }

  private parseTransition(): LooseElement {
    this.expectIdent('transition');
    const name = this.expectIdent().value;
    this.expectIdent('first');
    const source = this.expectIdent().value;
    this.expectIdent('then');
    const target = this.expectIdent().value;
    let trigger: string | undefined;
    let guard: string | undefined;
    let effect: string | undefined;
    while (!(this.peek().type === 'punct' && this.peek().value === ';')) {
      const key = this.expectIdent().value;
      const s = this.peek();
      if (s.type !== 'string') {
        throw new ParserError(`expected string after '${key}'`, s.line, s.col);
      }
      const val = this.consume().value;
      if (key === 'trigger') trigger = val;
      else if (key === 'guard') guard = val;
      else if (key === 'effect') effect = val;
      else throw new ParserError(`unknown transition field '${key}'`, s.line, s.col);
    }
    this.expectPunct(';');
    const id = this.consumeIdMark();
    const out: LooseElement = {
      id,
      kind: 'Transition',
      name,
      sourceId: source as ElementId,
      targetId: target as ElementId,
    };
    if (trigger !== undefined) (out as { trigger?: string }).trigger = trigger;
    if (guard !== undefined) (out as { guard?: string }).guard = guard;
    if (effect !== undefined) (out as { effect?: string }).effect = effect;
    return out;
  }

  private parseUseCase(): LooseElement {
    this.expectIdent('use');
    this.expectIdent('case');
    const name = this.expectIdent().value;
    if (this.peek().type === 'punct' && this.peek().value === ';') {
      this.consume();
      const id = this.consumeIdMark();
      this.nameToId.set(name, id);
      return { id, kind: 'UseCase', name };
    }
    this.expectPunct('{');
    const id = this.consumeIdMark();
    let text: string | undefined;
    while (!(this.peek().type === 'punct' && this.peek().value === '}')) {
      const key = this.expectIdent().value;
      const s = this.peek();
      if (s.type !== 'string') {
        throw new ParserError(`expected string after '${key}'`, s.line, s.col);
      }
      const val = this.consume().value;
      this.expectPunct(';');
      if (key === 'text') text = val;
      else throw new ParserError(`unknown use case field '${key}'`, s.line, s.col);
    }
    this.expectPunct('}');
    this.nameToId.set(name, id);
    const out: LooseElement = { id, kind: 'UseCase', name };
    if (text !== undefined) (out as { text?: string }).text = text;
    return out;
  }

  private parseActor(): LooseElement {
    this.expectIdent('actor');
    const name = this.expectIdent().value;
    this.expectPunct(';');
    const id = this.consumeIdMark();
    this.nameToId.set(name, id);
    return { id, kind: 'Actor', name };
  }

  private parseConstraintLike(): LooseElement {
    this.expectIdent('constraint');
    if (this.matchIdent('def')) {
      this.consume();
      const name = this.expectIdent().value;
      this.expectPunct('{');
      const id = this.consumeIdMark();
      let expression: string | undefined;
      // Mixed body: expr "..."; followed by parameter declarations.
      const paramIndices = new Map<OwnerRole, number>();
      while (!(this.peek().type === 'punct' && this.peek().value === '}')) {
        if (this.matchIdent('expr')) {
          this.consume();
          const s = this.peek();
          if (s.type !== 'string') {
            throw new ParserError(`expected string after 'expr'`, s.line, s.col);
          }
          expression = this.consume().value;
          this.expectPunct(';');
        } else {
          const loose = this.parseElement();
          const idx = paramIndices.get('parameter') ?? 0;
          paramIndices.set('parameter', idx + 1);
          this.elements.push(
            stamp(loose, { ownerId: id, role: 'parameter', index: idx }),
          );
        }
      }
      this.expectPunct('}');
      if (expression === undefined) {
        const t = this.peek();
        throw new ParserError(`constraint def missing expr`, t.line, t.col);
      }
      const out: LooseElement = {
        id,
        kind: 'ConstraintDefinition',
        name,
        expression,
      };
      this.nameToId.set(name, id);
      return out;
    }
    const name = this.expectIdent().value;
    this.expectPunct(':');
    const defName = this.expectIdent().value;
    this.expectPunct(';');
    const id = this.consumeIdMark();
    const out: Omit<
      Extract<ModelElement, { kind: 'ConstraintUsage' }>,
      'ownerId' | 'ownerRole' | 'ownerIndex'
    > = {
      id,
      kind: 'ConstraintUsage',
      name,
      definitionId: this.resolveName(defName),
    };
    if (!this.nameToId.has(defName)) {
      this.pendingRefs.push({
        name: defName,
        apply: (rid) => {
          (out as { definitionId: ElementId }).definitionId = rid;
          const idx = this.elements.findIndex((e) => e.id === id);
          if (idx >= 0) {
            const cur = this.elements[idx];
            if (cur && cur.kind === 'ConstraintUsage') {
              (cur as { definitionId: ElementId }).definitionId = rid;
            }
          }
        },
      });
    }
    this.nameToId.set(name, id);
    return out as LooseElement;
  }

  private parseValueProperty(): LooseElement {
    this.expectIdent('attribute');
    const name = this.expectIdent().value;
    this.expectPunct(':');
    const typeTok = this.expectIdent();
    const valueType = typeTok.value as ValueType;
    if (valueType !== 'string' && valueType !== 'number' && valueType !== 'boolean') {
      throw new ParserError(
        `invalid value type '${valueType}'`,
        typeTok.line,
        typeTok.col,
      );
    }
    let defaultValue: ValueLiteral | undefined;
    if (this.peek().type === 'punct' && this.peek().value === '=') {
      this.consume();
      const t = this.peek();
      if (t.type === 'string') {
        defaultValue = this.consume().value;
      } else if (t.type === 'number') {
        defaultValue = parseFloat(this.consume().value);
      } else if (t.type === 'ident' && (t.value === 'true' || t.value === 'false')) {
        defaultValue = this.consume().value === 'true';
      } else {
        throw new ParserError(`expected literal after '='`, t.line, t.col);
      }
    }
    this.expectPunct(';');
    const id = this.consumeIdMark();
    const out: LooseElement = {
      id,
      kind: 'ValueProperty',
      name,
      valueType,
    };
    if (defaultValue !== undefined) (out as { defaultValue?: ValueLiteral }).defaultValue = defaultValue;
    this.nameToId.set(name, id);
    return out;
  }

  private parseEdge(): ModelEdge {
    const kwTok = this.consume();
    const kw = kwTok.value;
    switch (kw) {
      case 'composition':
        return this.finishEdge('Composition');
      case 'aggregation':
        return this.finishEdge('Aggregation');
      case 'generalization':
        return this.finishEdge('Generalization');
      case 'association':
        return this.finishEdge('Association');
      case 'dependency':
        return this.finishEdge('Dependency');
      case 'trace': {
        const kindTok = this.expectIdent();
        const traceKind = kindTok.value as RequirementTraceKind;
        if (!['satisfy', 'verify', 'derive', 'refine'].includes(traceKind)) {
          throw new ParserError(
            `invalid trace kind '${traceKind}'`,
            kindTok.line,
            kindTok.col,
          );
        }
        return this.finishEdge('RequirementTrace', { traceKind });
      }
      case 'control-flow': {
        let guard: string | undefined;
        if (this.peek().type === 'punct' && this.peek().value === '[') {
          this.consume();
          let buf = '';
          while (!(this.peek().type === 'punct' && this.peek().value === ']')) {
            const tk = this.consume();
            if (tk.type === 'eof') {
              throw new ParserError(`unterminated guard`, kwTok.line, kwTok.col);
            }
            buf += tk.value;
          }
          this.expectPunct(']');
          guard = buf;
        }
        return this.finishEdge('ControlFlow', guard !== undefined ? { guard } : {});
      }
      case 'object-flow': {
        let itemType: string | undefined;
        if (this.matchIdent('of')) {
          this.consume();
          itemType = this.expectIdent().value;
        }
        return this.finishEdge('ObjectFlow', itemType !== undefined ? { itemType } : {});
      }
      case 'include':
        return this.finishEdge('Include');
      case 'extend': {
        let extensionPoint: string | undefined;
        if (this.matchIdent('at')) {
          this.consume();
          extensionPoint = this.expectIdent().value;
        }
        return this.finishEdge(
          'Extend',
          extensionPoint !== undefined ? { extensionPoint } : {},
        );
      }
      case 'binding':
        return this.finishEdge('ParameterBinding');
      case 'import':
        return this.finishEdge('PackageImport');
      default:
        throw new ParserError(`unknown edge keyword '${kw}'`, kwTok.line, kwTok.col);
    }
  }

  private finishEdge<K extends ModelEdge['kind']>(
    kind: K,
    extra: Partial<Extract<ModelEdge, { kind: K }>> = {},
  ): ModelEdge {
    const source = this.expectIdent().value;
    // SysML 1.x §9.4 — optional `[multiplicity]` immediately after the
    // source name, only meaningful for Association edges. Issue #434.
    const sourceMultiplicity = this.tryConsumeBracketed();
    const arrow = this.peek();
    if (arrow.type !== 'arrow') {
      throw new ParserError(`expected '->'`, arrow.line, arrow.col);
    }
    this.consume();
    const target = this.expectIdent().value;
    const targetMultiplicity = this.tryConsumeBracketed();
    this.expectPunct(';');
    const id = this.consumeIdMark() as unknown as EdgeId;
    const base = {
      id,
      kind,
      sourceId: source as ElementId,
      targetId: target as ElementId,
      ...extra,
    } as ModelEdge;
    if (kind === 'Association') {
      const assocBase = base as Extract<ModelEdge, { kind: 'Association' }>;
      if (sourceMultiplicity !== undefined) {
        (assocBase as { sourceMultiplicity?: string }).sourceMultiplicity =
          sourceMultiplicity;
      }
      if (targetMultiplicity !== undefined) {
        (assocBase as { targetMultiplicity?: string }).targetMultiplicity =
          targetMultiplicity;
      }
    }
    return base;
  }

  // Consume `[<contents>]` if present at the current cursor and return the
  // contents verbatim. Returns `undefined` when the next token is not `[`.
  // Used by `finishEdge` to pick up optional association multiplicities;
  // also benignly tolerates bracketed annotations on other edge kinds in
  // case future spec extensions appear.
  private tryConsumeBracketed(): string | undefined {
    const next = this.peek();
    if (next.type !== 'punct' || next.value !== '[') return undefined;
    const opener = this.consume();
    let buf = '';
    while (!(this.peek().type === 'punct' && this.peek().value === ']')) {
      const tk = this.consume();
      if (tk.type === 'eof') {
        throw new ParserError(
          `unterminated multiplicity`,
          opener.line,
          opener.col,
        );
      }
      buf += tk.value;
    }
    this.expectPunct(']');
    return buf;
  }

  private resolveName(name: string): ElementId {
    const id = this.nameToId.get(name);
    if (id) return id;
    return name as ElementId;
  }
}
