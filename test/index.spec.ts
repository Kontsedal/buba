import { container, DependencyType, DependentFactory, TYPE } from '../src';
import { DEPENDENCIES, dependency } from '../src';

describe('buba', () => {
  it("should throw if plain value isn't registered for class", async () => {
    await container(async instance => {
      class Example {
        static [DEPENDENCIES] = ['config'];
        static [TYPE] = DependencyType.CLASS;
      }
      await expect(instance.resolve(Example)).rejects.toThrow();
    });
  });

  it("should throw if plain value isn't registered for factory", async () => {
    await container(async instance => {
      const createExample = (() => {}) as DependentFactory;
      createExample[DEPENDENCIES] = ['config'];
      createExample[TYPE] = DependencyType.FACTORY;
      await expect(instance.resolve(createExample)).rejects.toThrow();
    });
  });

  it('should inject plain value for class', async () => {
    await container(async instance => {
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
      instance.set('config', { URL: 'https://example.com' });
      const example = await instance.resolve<Example>(Example);
      expect(example.getUrl()).toBe('https://example.com');
    });
  });

  it('should inject plain value for factory', async () => {
    await container(async instance => {
      type Config = {
        URL: string;
      };
      const createExample = (() => {
        return () => {
          return dependency<Config>('config').URL;
        };
      }) as DependentFactory;
      createExample[DEPENDENCIES] = ['config'];
      createExample[TYPE] = DependencyType.FACTORY;
      instance.set('config', { URL: 'https://example.com' });
      const example = await instance.resolve<() => string>(createExample);
      expect(example()).toBe('https://example.com');
    });
  });
});
