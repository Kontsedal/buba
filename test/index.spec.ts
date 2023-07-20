import { container } from '../src';
import { asClass, asValue, DEPENDENCIES, dependency } from '../src';

describe('buba', () => {
  it("should throw if plain value isn't registered", async () => {
    await container(async instance => {
      class Example {
        static [DEPENDENCIES] = [asValue('config')];
      }
      await expect(
        instance.resolve(Example, asClass(Example))
      ).rejects.toThrow();
    });
  });

  it('should inject plain value', async () => {
    await container(async instance => {
      type Config = {
        URL: string;
      };
      class Example {
        static [DEPENDENCIES] = [asValue('config')];
        getUrl() {
          return dependency<Config>('config').URL;
        }
      }
      instance.set('config', { URL: 'https://example.com' });
      const example = await instance.resolve<Example>(
        Example,
        asClass(Example)
      );
      expect(example.getUrl()).toBe('https://example.com');
    });
  });
});
