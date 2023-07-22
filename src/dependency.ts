import { DepsSymbol, DependencyType, TypeSymbol } from './constants';
import {
  Dependency,
  DependentClass,
  DependentFactory,
  DependentObject,
} from './types';

function hasDependencies(
  value: unknown
): value is DependentClass | DependentFactory | DependentObject {
  return Boolean((value as DependentClass)?.[DepsSymbol]);
}
function getDependencies(dependency: Dependency): Dependency[] {
  if (hasDependencies(dependency)) {
    return dependency[DepsSymbol] || [];
  }
  return [];
}

function isDependentObject(
  dependency: Dependency
): dependency is DependentObject {
  return typeof dependency === 'object' && hasDependencies(dependency);
}

function isDependentClass(
  dependency: Dependency
): dependency is DependentClass {
  return (
    hasDependencies(dependency) &&
    !isDependentObject(dependency) &&
    dependency?.[TypeSymbol] === DependencyType.CLASS
  );
}

function isDependentFactory(
  dependency: Dependency
): dependency is DependentFactory {
  return (
    hasDependencies(dependency) &&
    !isDependentObject(dependency) &&
    dependency?.[TypeSymbol] === DependencyType.FACTORY
  );
}

function serializeDependencyName(value: Dependency): string {
  if (typeof value === 'function') {
    return / (\w+)/.exec(value.toString())?.[1] || value.constructor.name;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return (value as string)?.toString() || value;
}

function serializeCallTree(callTree: Dependency[]): string {
  return callTree.map(serializeDependencyName).join(' -> ');
}

export const dependencyUtils = {
  hasDependencies,
  getDependencies,
  isDependentObject,
  isDependentClass,
  isDependentFactory,
  serializeDependencyName,
  serializeCallTree,
};
