import type {
  ActionNodeType,
  EdgeId,
  ElementId,
  ModelEdge,
  ModelElement,
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
}

export type ParseResult =
  | { readonly ok: true; readonly value: ParsedProject }
  | { readonly ok: false; readonly errors: ParseError[] };

export function parseSysmlText(input: string): ParseResult {
  try {
    const tokens = tokenize(input);
    const p = new Parser(tokens);
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

const PUNCT_CHARS = new Set(['{', '}', '[', ']', ':', ';', ',', '=']);

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
    // Comments: //...EOL. Special case `// id: <id>` and `// id: <id>...` (header).
    if (ch === '/' && src[i + 1] === '/') {
      // Capture full comment text
      const startLine = line;
      const startCol = col;
      let j = i + 2;
      while (j < n && src[j] !== '\n') j += 1;
      const body = src.slice(i + 2, j);
      // Look for "id: <token>" — supports multiple in one comment (header line)
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
      // Advance past comment
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
    // Fallback: emit any other printable character as a single-char punct
    // token. The parser consumes raw token values inside bracketed segments
    // (multiplicities, guards), so this preserves arithmetic-ish characters.
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

class Parser {
  private readonly tokens: Token[];
  private pos = 0;
  private readonly nameToId = new Map<string, ElementId>();
  private readonly pendingRefs: Array<{ name: string; apply: (id: ElementId) => void }> = [];
  private projectId?: ProjectId;
  private projectName?: string;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parseFile(): ParsedProject {
    const elements: ModelElement[] = [];
    const edges: ModelEdge[] = [];

    // Header `// id: <projectId>` is the first idmark before any statements.
    // The serializer also embeds the name in the comment text — we cannot
    // recover it from a token, so we keep it undefined; the import action
    // can fall back to a caller-supplied default. If present, the first
    // idmark BEFORE any other token is treated as the project id.
    if (this.peek().type === 'idmark') {
      this.projectId = this.consume().value as ProjectId;
    }

    while (this.peek().type !== 'eof') {
      const top = this.parseTopLevel();
      if (Array.isArray(top)) {
        for (const item of top) {
          if (isElement(item)) elements.push(item);
          else edges.push(item);
        }
      } else if (isElement(top)) {
        elements.push(top);
      } else {
        edges.push(top);
      }
    }
    // Drain nested elements collected while parsing block-bodies.
    if (this.pendingFlat.length > 0) {
      elements.push(...this.pendingFlat);
      this.pendingFlat.length = 0;
    }
    // Resolve forward references using the now-complete name->id map.
    for (const ref of this.pendingRefs) {
      const id = this.nameToId.get(ref.name);
      if (id) ref.apply(id);
    }

    // Resolve name-based references on edge-like elements (Connection, ItemFlow,
    // Transition emit IDs directly, so no lookup needed). All edges in the
    // `// edges` block also emit IDs directly.
    const result: ParsedProject = {
      elements,
      edges,
    };
    if (this.projectId !== undefined) {
      (result as { projectId?: ProjectId }).projectId = this.projectId;
    }
    if (this.projectName !== undefined) {
      (result as { projectName?: string }).projectName = this.projectName;
    }
    return result;
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
  private parseTopLevel(): ModelElement | ModelEdge | (ModelElement | ModelEdge)[] {
    const t = this.peek();
    if (t.type !== 'ident') {
      throw new ParserError(`unexpected token '${t.value}'`, t.line, t.col);
    }
    switch (t.value) {
      case 'package':
      case 'part':
      case 'abstract':
      case 'port':
      case 'interface':
      case 'connection':
      case 'flow':
      case 'requirement':
      case 'action':
      case 'state':
      case 'composite':
      case 'transition':
      case 'use':
      case 'actor':
      case 'constraint':
      case 'attribute':
        return this.parseElement();
      // Edge keywords at top level (inside the `// edges` section, but the
      // header comment is already stripped). They are just identifiers here.
      case 'composition':
      case 'generalization':
      case 'trace':
      case 'control-flow':
      case 'object-flow':
      case 'include':
      case 'extend':
      case 'binding':
      case 'import':
        return this.parseEdge();
      default:
        throw new ParserError(`unknown statement '${t.value}'`, t.line, t.col);
    }
  }

  private parseElement(): ModelElement {
    const t = this.peek();
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

  private parsePackage(): ModelElement {
    this.expectIdent('package');
    const nameTok = this.expectIdent();
    this.expectPunct('{');
    const id = this.consumeIdMark();
    const documentation = this.parseOptionalDoc();
    const memberIds: ElementId[] = [];
    const inner: ModelElement[] = [];
    while (!(this.peek().type === 'punct' && this.peek().value === '}')) {
      const m = this.parseElement();
      inner.push(m);
      memberIds.push(m.id);
    }
    this.expectPunct('}');
    const pkg: ModelElement = {
      id,
      kind: 'Package',
      name: nameTok.value,
      memberIds,
    };
    if (documentation !== undefined) pkg.documentation = documentation;
    this.nameToId.set(nameTok.value, id);
    // Members are siblings in the flat element list; return a marker by
    // pushing them too. We rely on parseFile flattening top-level only —
    // so re-emit nested elements by temporarily stashing them on a queue.
    this.pendingFlat.push(...inner);
    return pkg;
  }

  private readonly pendingFlat: ModelElement[] = [];

  private parseOptionalDoc(): string | undefined {
    if (this.matchIdent('doc') && this.peek(1).type === 'string') {
      this.consume();
      const s = this.consume();
      // doc statements end without a semicolon in containing blocks
      // (serializer emits `doc "..."` inside blocks without `;`)
      return s.value;
    }
    return undefined;
  }

  private parsePartLike(): ModelElement {
    // 'abstract'? 'part' (('def' Name '{') | (Name ':' DefName ('[' Mult ']')? '{'))
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
      const portIds: ElementId[] = [];
      const propertyIds: ElementId[] = [];
      while (!(this.peek().type === 'punct' && this.peek().value === '}')) {
        const inner = this.parseElement();
        if (inner.kind === 'PortDefinition') portIds.push(inner.id);
        else if (inner.kind === 'ValueProperty') propertyIds.push(inner.id);
        else
          throw new ParserError(
            `unexpected '${inner.kind}' inside part def`,
            this.peek().line,
            this.peek().col,
          );
        this.pendingFlat.push(inner);
      }
      this.expectPunct('}');
      const out: ModelElement = {
        id,
        kind: 'PartDefinition',
        name,
        isAbstract,
        propertyIds,
        portIds,
      };
      if (documentation !== undefined) out.documentation = documentation;
      this.nameToId.set(name, id);
      return out;
    }
    // PartUsage
    const name = this.expectIdent().value;
    this.expectPunct(':');
    const defName = this.expectIdent().value;
    let multiplicity: string | undefined;
    if (this.peek().type === 'punct' && this.peek().value === '[') {
      this.consume();
      const mTok = this.peek();
      // multiplicity may be number or identifier-ish; consume until ']'
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
    const portUsageIds: ElementId[] = [];
    while (!(this.peek().type === 'punct' && this.peek().value === '}')) {
      const inner = this.parseElement();
      if (inner.kind !== 'PortUsage') {
        throw new ParserError(
          `expected PortUsage inside part block, got ${inner.kind}`,
          this.peek().line,
          this.peek().col,
        );
      }
      portUsageIds.push(inner.id);
      this.pendingFlat.push(inner);
    }
    this.expectPunct('}');
    const out: Extract<ModelElement, { kind: 'PartUsage' }> = {
      id,
      kind: 'PartUsage',
      name,
      definitionId: this.resolveName(defName),
      portUsageIds,
    };
    if (!this.nameToId.has(defName)) {
      this.pendingRefs.push({ name: defName, apply: (rid) => { out.definitionId = rid; } });
    }
    if (multiplicity !== undefined) out.multiplicity = multiplicity;
    if (documentation !== undefined) out.documentation = documentation;
    this.nameToId.set(name, id);
    return out;
  }

  private parsePortLike(): ModelElement {
    this.expectIdent('port');
    if (this.matchIdent('def')) {
      this.consume();
      // direction identifier next
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
      const out: Extract<ModelElement, { kind: 'PortDefinition' }> = {
        id,
        kind: 'PortDefinition',
        name,
        direction,
      };
      if (interfaceName !== undefined) {
        out.interfaceId = this.resolveName(interfaceName);
        if (!this.nameToId.has(interfaceName)) {
          const ifn = interfaceName;
          this.pendingRefs.push({ name: ifn, apply: (rid) => { out.interfaceId = rid; } });
        }
      }
      this.nameToId.set(name, id);
      return out;
    }
    // PortUsage: port Name : DefName ;
    const name = this.expectIdent().value;
    this.expectPunct(':');
    const defName = this.expectIdent().value;
    this.expectPunct(';');
    const id = this.consumeIdMark();
    const out: Extract<ModelElement, { kind: 'PortUsage' }> = {
      id,
      kind: 'PortUsage',
      name,
      definitionId: this.resolveName(defName),
    };
    if (!this.nameToId.has(defName)) {
      this.pendingRefs.push({ name: defName, apply: (rid) => { out.definitionId = rid; } });
    }
    this.nameToId.set(name, id);
    return out;
  }

  private parseInterfaceDef(): ModelElement {
    this.expectIdent('interface');
    this.expectIdent('def');
    const name = this.expectIdent().value;
    this.expectPunct('{');
    const id = this.consumeIdMark();
    const documentation = this.parseOptionalDoc();
    const portDefinitionIds: ElementId[] = [];
    while (!(this.peek().type === 'punct' && this.peek().value === '}')) {
      const inner = this.parseElement();
      if (inner.kind !== 'PortDefinition') {
        throw new ParserError(
          `expected PortDefinition inside interface def, got ${inner.kind}`,
          this.peek().line,
          this.peek().col,
        );
      }
      portDefinitionIds.push(inner.id);
      this.pendingFlat.push(inner);
    }
    this.expectPunct('}');
    const out: ModelElement = {
      id,
      kind: 'InterfaceDefinition',
      name,
      portDefinitionIds,
    };
    if (documentation !== undefined) out.documentation = documentation;
    this.nameToId.set(name, id);
    return out;
  }

  private parseConnection(): ModelElement {
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

  private parseItemFlow(): ModelElement {
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
    const out: ModelElement = {
      id,
      kind: 'ItemFlow',
      name,
      sourceId: source as ElementId,
      targetId: target as ElementId,
    };
    if (itemType !== undefined) out.itemType = itemType;
    return out;
  }

  private parseRequirement(): ModelElement {
    this.expectIdent('requirement');
    // optional reqId before the name; both are identifiers
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
    const out: ModelElement = {
      id,
      kind: 'Requirement',
      name,
      text,
      priority,
      status,
    };
    if (reqId !== undefined) out.reqId = reqId;
    if (rationale !== undefined) out.rationale = rationale;
    if (documentation !== undefined) out.documentation = documentation;
    this.nameToId.set(name, id);
    return out;
  }

  private parseActionLike(): ModelElement {
    this.expectIdent('action');
    if (this.matchIdent('def')) {
      this.consume();
      const name = this.expectIdent().value;
      this.expectPunct('{');
      const id = this.consumeIdMark();
      const documentation = this.parseOptionalDoc();
      const parameterIds: ElementId[] = [];
      while (!(this.peek().type === 'punct' && this.peek().value === '}')) {
        const inner = this.parseElement();
        parameterIds.push(inner.id);
        this.pendingFlat.push(inner);
      }
      this.expectPunct('}');
      const out: ModelElement = {
        id,
        kind: 'ActionDefinition',
        name,
        parameterIds,
      };
      if (documentation !== undefined) out.documentation = documentation;
      this.nameToId.set(name, id);
      return out;
    }
    // action <nodeType> <name> (':' defName)? ';'
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
    const out: Extract<ModelElement, { kind: 'ActionUsage' }> = {
      id,
      kind: 'ActionUsage',
      name,
      nodeType,
    };
    if (defName !== undefined) {
      out.definitionId = this.resolveName(defName);
      if (!this.nameToId.has(defName)) {
        const dn = defName;
        this.pendingRefs.push({ name: dn, apply: (rid) => { out.definitionId = rid; } });
      }
    }
    this.nameToId.set(name, id);
    return out;
  }

  private parseStateLike(): ModelElement {
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
      const out: ModelElement = {
        id,
        kind: 'StateDefinition',
        name,
        isComposite,
      };
      this.nameToId.set(name, id);
      return out;
    }
    // state <stateType> <name> (':' defName)? ( ';' | '{' body '}' )
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
    const out: Extract<ModelElement, { kind: 'StateUsage' }> = {
      id,
      kind: 'StateUsage',
      name,
      stateType,
    };
    if (defName !== undefined) {
      out.definitionId = this.resolveName(defName);
      if (!this.nameToId.has(defName)) {
        const dn = defName;
        this.pendingRefs.push({ name: dn, apply: (rid) => { out.definitionId = rid; } });
      }
    }
    if (entryAction !== undefined) out.entryAction = entryAction;
    if (doAction !== undefined) out.doAction = doAction;
    if (exitAction !== undefined) out.exitAction = exitAction;
    this.nameToId.set(name, id);
    return out;
  }

  private parseTransition(): ModelElement {
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
    const out: ModelElement = {
      id,
      kind: 'Transition',
      name,
      sourceId: source as ElementId,
      targetId: target as ElementId,
    };
    if (trigger !== undefined) out.trigger = trigger;
    if (guard !== undefined) out.guard = guard;
    if (effect !== undefined) out.effect = effect;
    return out;
  }

  private parseUseCase(): ModelElement {
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
    const out: ModelElement = { id, kind: 'UseCase', name };
    if (text !== undefined) out.text = text;
    return out;
  }

  private parseActor(): ModelElement {
    this.expectIdent('actor');
    const name = this.expectIdent().value;
    this.expectPunct(';');
    const id = this.consumeIdMark();
    this.nameToId.set(name, id);
    return { id, kind: 'Actor', name };
  }

  private parseConstraintLike(): ModelElement {
    this.expectIdent('constraint');
    if (this.matchIdent('def')) {
      this.consume();
      const name = this.expectIdent().value;
      this.expectPunct('{');
      const id = this.consumeIdMark();
      let expression: string | undefined;
      const parameterIds: ElementId[] = [];
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
          const inner = this.parseElement();
          parameterIds.push(inner.id);
          this.pendingFlat.push(inner);
        }
      }
      this.expectPunct('}');
      if (expression === undefined) {
        const t = this.peek();
        throw new ParserError(`constraint def missing expr`, t.line, t.col);
      }
      const out: ModelElement = {
        id,
        kind: 'ConstraintDefinition',
        name,
        expression,
        parameterIds,
      };
      this.nameToId.set(name, id);
      return out;
    }
    // ConstraintUsage: constraint <name> : <def> ;
    const name = this.expectIdent().value;
    this.expectPunct(':');
    const defName = this.expectIdent().value;
    this.expectPunct(';');
    const id = this.consumeIdMark();
    const out: Extract<ModelElement, { kind: 'ConstraintUsage' }> = {
      id,
      kind: 'ConstraintUsage',
      name,
      definitionId: this.resolveName(defName),
    };
    if (!this.nameToId.has(defName)) {
      this.pendingRefs.push({ name: defName, apply: (rid) => { out.definitionId = rid; } });
    }
    this.nameToId.set(name, id);
    return out;
  }

  private parseValueProperty(): ModelElement {
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
    const out: ModelElement = {
      id,
      kind: 'ValueProperty',
      name,
      valueType,
    };
    if (defaultValue !== undefined) out.defaultValue = defaultValue;
    this.nameToId.set(name, id);
    return out;
  }

  private parseEdge(): ModelEdge {
    const kwTok = this.consume();
    const kw = kwTok.value;
    switch (kw) {
      case 'composition':
        return this.finishEdge('Composition');
      case 'generalization':
        return this.finishEdge('Generalization');
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
    const arrow = this.peek();
    if (arrow.type !== 'arrow') {
      throw new ParserError(`expected '->'`, arrow.line, arrow.col);
    }
    this.consume();
    const target = this.expectIdent().value;
    this.expectPunct(';');
    const id = this.consumeIdMark() as unknown as EdgeId;
    const base = {
      id,
      kind,
      sourceId: source as ElementId,
      targetId: target as ElementId,
      ...extra,
    } as ModelEdge;
    return base;
  }

  private resolveName(name: string): ElementId {
    const id = this.nameToId.get(name);
    if (id) return id;
    return name as ElementId;
  }

}

function isElement(x: ModelElement | ModelEdge): x is ModelElement {
  return !('kind' in x) ? false : ELEMENT_KIND_SET.has(x.kind as string);
}

const ELEMENT_KIND_SET: ReadonlySet<string> = new Set([
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
]);
