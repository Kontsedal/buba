export const DEPENDENCIES = Symbol('DEPENDENCIES');

class DependentClass {
  static [DEPENDENCIES]?: Dependency[] = [];
}

export enum DependencyType {
  CLASS = 'class',
  FACTORY = 'factory',
  VALUE = 'value',
}

export type Dependency =
  | {
      type: DependencyType.VALUE;
      value: any;
    }
  | {
      type: DependencyType.CLASS;
      value: typeof DependentClass;
    }
  | {
      type: DependencyType.FACTORY;
      value: () => unknown;
    };
export const asClass = (value: typeof DependentClass): Dependency => {
  return {
    type: DependencyType.CLASS,
    value: value,
  };
};
export const asFactory = <T>(value: () => T | Promise<T>): Dependency => {
  return {
    type: DependencyType.FACTORY,
    value: value,
  };
};
export const asValue = (value: unknown): Dependency => {
  return {
    type: DependencyType.VALUE,
    value: value,
  };
};

export function hasDependencies(
  value: unknown
): value is { [DEPENDENCIES]: Dependency[] } {
  return Boolean((value as typeof DependentClass)?.[DEPENDENCIES]);
}
