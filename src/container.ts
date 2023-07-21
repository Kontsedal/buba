import { AsyncLocalStorage } from 'async_hooks';
import { serializeCallTree, serializeDependencyName } from './utils';
import {
  Dependency,
  DependentClass,
  DependentFactory,
  getDependencies,
  hasDependencies,
  isDependentClass,
  isDependentFactory,
} from './dependency';
import { Class, Function } from 'ts-toolbelt';
import { errorPrefix } from './constants';

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

  set(name: Dependency, value: unknown): void {
    if (this.registry.has(name)) {
      throw new Error(
        `${errorPrefix}Dependency ${serializeDependencyName(
          name as string
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
  ): Promise<
    T extends DependentClass
      ? Class.Instance<T>
      : T extends DependentFactory
      ? Function.Return<T>
      : unknown
  > {
    type ExpectedType = T extends DependentClass
      ? Class.Instance<T>
      : T extends DependentFactory
      ? Function.Return<T>
      : unknown;
    const resolveWithMetadata = async (
      dependency: Dependency,
      callTree: any[]
    ): Promise<ExpectedType> => {
      const existing = this.get<ExpectedType>(dependency);
      if (existing) {
        return existing;
      }
      if (this.resolvingDependencies.get(dependency)) {
        throw new Error(
          `${errorPrefix}Circular dependency detected. Call tree: ${serializeCallTree(
            callTree.concat([dependency])
          )}`
        );
      }
      this.resolvingDependencies.set(dependency, true);
      if (isDependentClass(dependency) || isDependentFactory(dependency)) {
        if (hasDependencies(dependency)) {
          for (const innerDependency of getDependencies(dependency)) {
            await resolveWithMetadata(innerDependency, [
              ...callTree,
              dependency,
            ]);
          }
        }
        if (isDependentFactory(dependency)) {
          const value = (await dependency()) as ExpectedType;
          this.set(dependency, value);
          this.resolvingDependencies.set(dependency, false);
          return value;
        }
        if (isDependentClass(dependency)) {
          const value = new dependency() as ExpectedType;
          this.set(dependency, value);
          this.resolvingDependencies.set(dependency, false);
          return value;
        }
        throw new Error(
          `${errorPrefix}Unknown dependency type. Call tree: ${serializeCallTree(
            callTree.concat([dependency])
          )}`
        );
      } else {
        throw new Error(
          `${errorPrefix}Attempt to resolve non registered plain value. Call tree: ${serializeCallTree(
            callTree.concat([dependency])
          )}`
        );
      }
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

export const dependencyScope = <T>(
  callback: () => T | Promise<T>
): Promise<T> => {
  const container = new Container();
  return container.run(async () => {
    return callback();
  });
};

export const dependency = <T>(value: unknown): T => {
  const dependency = getContainer().get<T>(value);
  if (!dependency) {
    throw new Error(
      `${errorPrefix}Dependency ${serializeDependencyName(
        value as string
      )} not found`
    );
  }
  return dependency;
};
