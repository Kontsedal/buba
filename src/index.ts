import { AsyncLocalStorage } from 'async_hooks';

const asyncLocalStorage = new AsyncLocalStorage();

const containerMap = new Map<number, Container>();
let counter = 0;
export const DEPENDENCIES = Symbol('DEPENDENCIES');

class DependentClass {
  static [DEPENDENCIES]?: Dependency[] = [];
}

enum DependencyType {
  CLASS = 'class',
  FACTORY = 'factory',
  VALUE = 'value',
}
type Dependency =
  | {
      type: DependencyType.VALUE;
      value: any;
      valueType?: any;
    }
  | {
      type: DependencyType.CLASS;
      value: typeof DependentClass;
      valueType?: any;
    }
  | {
      type: DependencyType.FACTORY;
      value: () => unknown;
      valueType?: any;
    };

export const asClass = (value: typeof DependentClass): Dependency => {
  return {
    type: DependencyType.CLASS,
    value: value,
    valueType: value,
  };
};

export const asFactory = <T>(
  value: () => T | Promise<T>,
  valueType: unknown
): Dependency => {
  return {
    type: DependencyType.FACTORY,
    value: value,
    valueType: valueType,
  };
};

export const asValue = (value: unknown): Dependency => {
  return {
    type: DependencyType.VALUE,
    value: value,
    valueType: value,
  };
};

export class Container {
  private id: number;
  private parentContainer?: Container;
  private registry: Map<any, any> = new Map();
  private registerQueue: [any, Dependency][] = [];
  private resolvingDependencies: Map<any, boolean> = new Map();
  private forcedDependencies: Map<any, any> = new Map();
  constructor() {
    this.id = counter++;
    const parentContainerId = asyncLocalStorage.getStore() as number;
    this.parentContainer = containerMap.get(parentContainerId);
    containerMap.set(this.id, this);
  }

  register(name: unknown, dependency: Dependency): void {
    if (dependency.type === DependencyType.VALUE) {
      this.registry.set(name, dependency.value);
      return;
    }
    this.registerQueue.push([name, dependency]);
  }
  async build(): Promise<void> {
    for (const [name, value] of this.registerQueue) {
      await this.resolve(name, value);
    }
  }

  get<T>(name: unknown): T {
    return (
      (this.forcedDependencies.get(name) as T) ||
      (this.parentContainer?.forcedDependencies.get(name) as T) ||
      (this.registry.get(name) as T) ||
      (this?.parentContainer?.get(name) as T)
    );
  }

  mock<T>(name: unknown, value: T): void {
    this.forcedDependencies.set(name, value);
  }

  async resolve<T>(name: unknown, dependency: Dependency): Promise<T> {
    const existing = this.get<T>(name);
    if (existing) {
      return existing;
    }
    if (this.resolvingDependencies.get(name)) {
      throw new Error(
        `Circular dependency detected for ${(name as string)?.toString()}`
      );
    }
    this.resolvingDependencies.set(name, true);
    if (typeof dependency.value === 'function') {
      if (hasDependencies(dependency.value)) {
        for (const innerDependency of dependency.value[DEPENDENCIES]) {
          await this.resolve(innerDependency.valueType, innerDependency);
        }
      }
      if (dependency.type === DependencyType.FACTORY) {
        const value = (await dependency.value()) as T;
        this.registry.set(name, value);
        this.resolvingDependencies.set(name, false);
        return value;
      }
      if (dependency.type === DependencyType.CLASS) {
        const value = new dependency.value() as T;
        this.registry.set(name, value);
        this.resolvingDependencies.set(name, false);
        return value;
      }
      throw new Error(`Unknown dependency type ${dependency.type}`);
    } else {
      throw new Error('Attempt to resolve non registered plain value');
    }
  }

  run<T>(fn: () => T): void {
    return asyncLocalStorage.run(this.id, () => {
      return fn();
    });
  }
}

function hasDependencies(
  value: any
): value is { [DEPENDENCIES]: Dependency[] } {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return Boolean(value?.[DEPENDENCIES]);
}

export const getContainer = (): Container => {
  const containerId = asyncLocalStorage.getStore() as number;
  const container = containerMap.get(containerId);
  if (!container) {
    throw new Error('Container not found');
  }
  return container;
};

export const dependency = <T>(value: unknown): T => {
  return getContainer().get<T>(value);
};
