export const DEPENDENCIES = Symbol('DEPENDENCIES');

export const TYPE = Symbol('TYPE');
export enum DependencyType {
  CLASS = 'class',
  FACTORY = 'factory',
}

export type DependentClass = {
  new (...args: unknown[]): any;
  [DEPENDENCIES]: Dependency[];
  [TYPE]: DependencyType;
};

export type DependentFactory = {
  (...args: unknown[]): unknown;
  [DEPENDENCIES]: Dependency[];
  [TYPE]: DependencyType;
};

type DependencyHolder = DependentFactory | DependentClass;

export type Dependency =
  | DependentFactory
  | DependentClass
  | string
  | symbol
  | number
  | boolean
  | null
  | object;

declare global {
  interface Function {
    [DEPENDENCIES]: Dependency[];
    [TYPE]: DependencyType;
  }
}

export function hasDependencies(value: unknown): value is DependencyHolder {
  return Boolean((value as DependentClass)?.[DEPENDENCIES]);
}

export function getDependencies(dependency: Dependency): Dependency[] {
  if (typeof dependency === 'string' || typeof dependency === 'symbol') {
    return [];
  }
  if (hasDependencies(dependency)) {
    return dependency[DEPENDENCIES] || [];
  }
  return [];
}

export function isDependentClass(
  dependency: Dependency
): dependency is DependentClass {
  return (
    hasDependencies(dependency) && dependency?.[TYPE] === DependencyType.CLASS
  );
}

export function isDependentFactory(
  dependency: Dependency
): dependency is DependentFactory {
  return (
    hasDependencies(dependency) && dependency?.[TYPE] === DependencyType.FACTORY
  );
}
