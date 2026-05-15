import type { ValueLiteral, ValueType } from './elements';

export function formatValueLiteral(value: ValueLiteral): string {
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}

export function formatValuePropertySignature(
  valueType: ValueType,
  defaultValue: ValueLiteral | undefined,
): string {
  if (defaultValue === undefined) return `: ${valueType}`;
  return `: ${valueType} = ${formatValueLiteral(defaultValue)}`;
}

export function formatConstraintExpression(expression: string): string | null {
  const trimmed = expression.trim();
  return trimmed.length > 0 ? trimmed : null;
}
