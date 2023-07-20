import { AsyncLocalStorage } from 'async_hooks';
import { serializeCallTree, serializeDependencyName } from './utils';
import {
  DEPENDENCIES,
  Dependency,
  DependencyType,
  hasDependencies,
} from './dependency';

const errorPrefix = '@kontsedal/buba error::: ';
const asyncLocalStorage = new AsyncLocalStorage();
const containerMap = new Map<number, Container>();
let containerIdCounter = 0;

export class Container {
  private id: number;
  private parentContainer?: Container;
  private registry: Map<any, any> = new Map();
  private resolvingDependencies: Map<any, boolean> = new Map();
  private forcedDependencies: Map<any, any> = new Map();
  constructor() {
    this.id = containerIdCounter++;
    const parentContainerId = asyncLocalStorage.getStore() as number;
    this.parentContainer = containerMap.get(parentContainerId);
    containerMap.set(this.id, this);
  }

  set(name: unknown, value: unknown): void {
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

  mock<T>(name: unknown, value: T): void {
    this.forcedDependencies.set(name, value);
  }

  async resolve<T>(name: unknown, dependency: Dependency): Promise<T> {
    const resolveWithMetadata = async (
      name: unknown,
      dependency: Dependency,
      callTree: any[]
    ) => {
      const existing = this.get<T>(name);
      if (existing) {
        return existing;
      }
      if (this.resolvingDependencies.get(name)) {
        throw new Error(
          `${errorPrefix}Circular dependency detected. Call tree: ${serializeCallTree(
            callTree.concat([name])
          )}`
        );
      }
      this.resolvingDependencies.set(name, true);
      if (typeof dependency.value === 'function') {
        if (hasDependencies(dependency.value)) {
          for (const innerDependency of dependency.value[DEPENDENCIES]) {
            await resolveWithMetadata(innerDependency.value, innerDependency, [
              ...callTree,
              name,
            ]);
          }
        }
        if (dependency.type === DependencyType.FACTORY) {
          const value = (await dependency.value()) as T;
          this.set(name, value);
          this.resolvingDependencies.set(name, false);
          return value;
        }
        if (dependency.type === DependencyType.CLASS) {
          const value = new dependency.value() as T;
          this.set(name, value);
          this.resolvingDependencies.set(name, false);
          return value;
        }
        throw new Error(
          `${errorPrefix}Unknown dependency type ${
            dependency.type
          }. Call tree: ${serializeCallTree(callTree.concat([name]))}`
        );
      } else {
        throw new Error(
          `${errorPrefix}Attempt to resolve non registered plain value. Call tree: ${serializeCallTree(
            callTree.concat([name])
          )}`
        );
      }
    };
    return resolveWithMetadata(name, dependency, []);
  }

  run<T>(fn: () => T): void {
    return asyncLocalStorage.run(this.id, () => {
      return fn();
    });
  }
}

export const getContainer = (): Container => {
  const containerId = asyncLocalStorage.getStore() as number;
  const container = containerMap.get(containerId);
  if (!container) {
    throw new Error(`${errorPrefix}Container not found`);
  }
  return container;
};

export const container = (callback: (instance: Container) => unknown): void => {
  const container = new Container();
  return container.run(() => {
    return callback(container);
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
