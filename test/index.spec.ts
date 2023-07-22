import {
  scope,
  DependencyType,
  TypeSymbol,
  DepsSymbol,
  getDep,
  setDep,
  resolveDep,
} from '../src';

describe('buba', () => {
  it('should inject plain value for factory', async () => {
    await scope(async () => {
      const config = { URL: 'https://example.com' };
      const createExample = () => {
        return () => {
          return getDep(config).URL;
        };
      };
      createExample[DepsSymbol] = [config];
      createExample[TypeSymbol] = DependencyType.FACTORY;
      setDep(config, { URL: 'https://example2.com' });
      const example = await resolveDep(createExample);
      expect(example()).toBe('https://example2.com');
    });
  });

  it('should inject object value for class', async () => {
    await scope(async () => {
      const config = { URL: 'https://example.com' };
      class Example {
        static [DepsSymbol] = [config];
        static [TypeSymbol] = DependencyType.CLASS;
        getUrl() {
          return getDep(config).URL;
        }
      }
      setDep(config, { URL: 'https://example2.com' });
      const example = await resolveDep(Example);
      expect(example.getUrl()).toBe('https://example2.com');
    });
  });
});
