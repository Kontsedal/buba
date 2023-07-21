import {
  dependencyScope,
  DependencyType,
  TYPE,
  getContainer,
  DEPENDENCIES,
  dependency,
} from '../src';

describe('buba', () => {
  it("should throw if plain value isn't registered for class", async () => {
    await dependencyScope(async () => {
      const container = getContainer();
      class Example {
        static [DEPENDENCIES] = ['config'];
        static [TYPE] = DependencyType.CLASS;
      }
      await expect(container.resolve(Example)).rejects.toThrow();
    });
  });

  it("should throw if plain value isn't registered for factory", async () => {
    await dependencyScope(async () => {
      const container = getContainer();
      const createExample = () => {};
      createExample[DEPENDENCIES] = ['config'];
      createExample[TYPE] = DependencyType.FACTORY;
      await expect(container.resolve(createExample)).rejects.toThrow();
    });
  });

  it('should inject plain value for class', async () => {
    await dependencyScope(async () => {
      const container = getContainer();
      type Config = {
        URL: string;
      };
      class Example {
        static [DEPENDENCIES] = ['config'];
        static [TYPE] = DependencyType.CLASS;
        getUrl() {
          return dependency<Config>('config').URL;
        }
      }
      container.set('config', { URL: 'https://example.com' });
      const example = await container.resolve(Example);
      expect(example.getUrl()).toBe('https://example.com');
    });
  });

  it('should inject plain value for factory', async () => {
    await dependencyScope(async () => {
      const container = getContainer();
      type Config = {
        URL: string;
      };
      const createExample = () => {
        return () => {
          return dependency<Config>('config').URL;
        };
      };
      createExample[DEPENDENCIES] = ['config'];
      createExample[TYPE] = DependencyType.FACTORY;
      container.set('config', { URL: 'https://example.com' });
      const example = await container.resolve(createExample);
      expect(example()).toBe('https://example.com');
    });
  });
});
