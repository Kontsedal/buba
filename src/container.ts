import { AsyncLocalStorage } from 'async_hooks';
import { dependencyUtils } from './dependency';
import { errorPrefix } from './constants';
import { Dependency, ResolvedDependency } from './types';

const asyncLocalStorage = new AsyncLocalStorage();

export class Container {
  private parentContainer?: Container;
  private registry: Map<any, any> = new Map();
  private resolvingDependencies: Map<any, boolean> = new Map();
  private forcedDependencies: Map<any, any> = new Map();
  constructor() {
    this.parentContainer = asyncLocalStorage.getStore() as
      | Container
      | undefined;
  }

  set(name: Dependency, value: Dependency): void {
    if (this.registry.has(name)) {
      throw new Error(
        `${errorPrefix}Dependency ${dependencyUtils.serializeDependencyName(
          name
        )} already registered`
      );
    }
    this.registry.set(name, value);
  }

  get<T>(name: unknown): T {
    return (
      (this.forcedDependencies.get(name) as T) ||
      (this.parentContainer?.forcedDependencies.get(name) as T) ||
      (this.registry.get(name) as T) ||
      (this?.parentContainer?.get(name) as T)
    );
  }

  mock<T>(name: T, value: unknown): void {
    this.forcedDependencies.set(name, value);
  }

  async resolve<T extends Dependency = Dependency>(
    dependency: T
  ): Promise<ResolvedDependency<T>> {
    type ExpectedType = ResolvedDependency<T>;
    const resolveWithMetadata = async (
      dependency: Dependency,
      callTree: Dependency[]
    ): Promise<ExpectedType> => {
      const existing = this.get<ExpectedType>(dependency);
      if (existing) {
        return existing;
      }
      if (this.resolvingDependencies.get(dependency)) {
        throw new Error(
          `${errorPrefix}Circular dependency detected. Call tree: ${dependencyUtils.serializeCallTree(
            callTree.concat([dependency])
          )}`
        );
      }
      this.resolvingDependencies.set(dependency, true);
      if (dependencyUtils.hasDependencies(dependency)) {
        for (const innerDependency of dependencyUtils.getDependencies(
          dependency
        )) {
          await resolveWithMetadata(innerDependency, [...callTree, dependency]);
        }
      }
      let value: ExpectedType | undefined;
      if (dependencyUtils.isDependentClass(dependency)) {
        value = new dependency() as ExpectedType;
      } else if (dependencyUtils.isDependentFactory(dependency)) {
        value = (await dependency()) as ExpectedType;
      } else {
        value = dependency as ExpectedType;
      }
      if (typeof value === 'undefined') {
        throw new Error(
          `${errorPrefix}Dependency ${dependencyUtils.serializeDependencyName(
            dependency
          )} resolved to undefined. Call tree: ${dependencyUtils.serializeCallTree(
            callTree.concat([dependency])
          )}`
        );
      }
      this.set(dependency, value);
      this.resolvingDependencies.set(dependency, false);
      return value;
    };
    return resolveWithMetadata(dependency, []);
  }

  run<T>(fn: () => T): T {
    return asyncLocalStorage.run(this, () => {
      return fn();
    });
  }
}

export const getContainer = (): Container => {
  const container = asyncLocalStorage.getStore() as Container | undefined;
  if (!container) {
    throw new Error(`${errorPrefix}Container not found`);
  }
  return container;
};

export const scope = <T>(callback: () => T | Promise<T>): Promise<T> => {
  const container = new Container();
  return container.run(async () => {
    return callback();
  });
};

export const getDep = <T extends Dependency>(
  value: T
): ResolvedDependency<T> => {
  const dependency = getContainer().get<ResolvedDependency<T>>(value);
  if (!dependency) {
    throw new Error(
      `${errorPrefix}Dependency ${dependencyUtils.serializeDependencyName(
        value
      )} not found`
    );
  }
  return dependency;
};

export const setDep = <T extends Dependency>(name: T, value: T) => {
  getContainer().set(name, value);
};

export const mockDep = <T extends Dependency>(name: T, value: T) => {
  getContainer().mock(name, value);
};

export const resolveDep = <T extends Dependency>(name: T) => {
  return getContainer().resolve(name);
};
