import { Class, Function } from 'ts-toolbelt';
import { DepsSymbol, DependencyType, TypeSymbol } from './constants';

declare global {
  interface Function {
    [DepsSymbol]: Dependency[];
    [TypeSymbol]: DependencyType;
  }
}

export type DependentClass = {
  new (...args: unknown[]): any;
  [DepsSymbol]: Dependency[];
  [TypeSymbol]: DependencyType;
};
export type DependentFactory = {
  (...args: unknown[]): unknown;
  [DepsSymbol]: Dependency[];
  [TypeSymbol]: DependencyType;
};
export type DependentObject = {
  [DepsSymbol]: Dependency[];
};
export type Dependency =
  | DependentFactory
  | DependentClass
  | DependentObject
  | object;
export type ResolvedDependency<T extends Dependency> = T extends DependentClass
  ? Class.Instance<T>
  : T extends DependentFactory
  ? Function.Return<T>
  : T extends DependentObject
  ? T
  : T;
