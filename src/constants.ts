export const errorPrefix = '@kontsedal/buba error::: ';
export const DepsSymbol = Symbol('DEPENDENCIES');
export const TypeSymbol = Symbol('TYPE');

export enum DependencyType {
  CLASS = 'class',
  FACTORY = 'factory',
}
