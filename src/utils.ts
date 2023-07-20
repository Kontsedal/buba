export function serializeDependencyName(
  value: string | ((...args: any[]) => unknown)
): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'function') {
    return / (\w+)/.exec(value.toString())?.[1] || value.constructor.name;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return (value as string)?.toString() || value;
}

export function serializeCallTree(callTree: any[]): string {
  return callTree.map(serializeDependencyName).join(' -> ');
}
