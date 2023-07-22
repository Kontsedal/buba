import {
  scope,
  DependencyType,
  TypeSymbol,
  DepsSymbol,
  getDep,
  setDep,
  resolveDep,
  mockDep,
} from '../src';

describe('buba', () => {
  it('should instantiate class if it has type symbol class in it', async () => {
    class Example {
      static [TypeSymbol] = DependencyType.CLASS;
      test() {
        return 'test';
      }
    }
    await scope(async () => {
      await resolveDep(Example);
      const result = getDep(Example);
      expect(result.test()).toBe('test');
    });
  });
  it('should not instantiate class if there is no type symbol', async () => {
    class Example {
      test() {
        return 'test';
      }
    }
    await scope(async () => {
      await resolveDep(Example);
      const result = getDep(Example);
      expect(result).toBe(Example);
    });
  });
  it("should call factory if it's type symbol is factory", async () => {
    await scope(async () => {
      const factory = () => {
        return 'test';
      };
      factory[TypeSymbol] = DependencyType.FACTORY;
      await resolveDep(factory);
      const result = getDep(factory);
      expect(result).toBe('test');
    });
  });
  it('should not call function if there is no appropriate type symbol', async () => {
    await scope(async () => {
      const factory = () => {
        return 'test';
      };
      await resolveDep(factory);
      const result = getDep(factory);
      expect(result).toBe(factory);
    });
  });
  it('should inject object value for factory', async () => {
    await scope(async () => {
      const config = { URL: 'https://example.com' };
      const createExample = () => {
        return () => {
          return getDep(config).URL;
        };
      };
      createExample[DepsSymbol] = [config];
      createExample[TypeSymbol] = DependencyType.FACTORY;
      const example = await resolveDep(createExample);
      expect(example()).toBe('https://example.com');
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

  it('should instantiate class with dependencies', async () => {
    await scope(async () => {
      const config = { URL: 'https://example.com' };

      class Api {
        static [DepsSymbol] = [config];
        static [TypeSymbol] = DependencyType.CLASS;
        getUrl() {
          return getDep(config).URL;
        }
      }
      class Example {
        static [DepsSymbol] = [Api];
        static [TypeSymbol] = DependencyType.CLASS;
        test() {
          return getDep(Api).getUrl();
        }
      }
      const example = await resolveDep(Example);
      expect(example.test()).toBe('https://example.com');
    });
  });

  it('should instantiate factory with dependencies', async () => {
    await scope(async () => {
      const config = { URL: 'https://example.com' };

      class Api {
        static [DepsSymbol] = [config];
        static [TypeSymbol] = DependencyType.CLASS;
        getUrl() {
          return getDep(config).URL;
        }
      }
      function buildExample() {
        return {
          test() {
            return getDep(Api).getUrl();
          },
        };
      }
      buildExample[DepsSymbol] = [Api];
      buildExample[TypeSymbol] = DependencyType.FACTORY;
      const example = await resolveDep(buildExample);
      expect(example.test()).toBe('https://example.com');
    });
  });

  it('should resolve plain object dependencies', async () => {
    await scope(async () => {
      const config = { URL: 'https://example.com' };

      class Api {
        static [DepsSymbol] = [config];
        static [TypeSymbol] = DependencyType.CLASS;
        getUrl() {
          return getDep(config).URL;
        }
      }
      const example = {
        test: () => {
          return getDep(Api).getUrl();
        },
        [DepsSymbol]: [Api],
      };
      const result = await resolveDep(example);
      expect(result.test()).toBe('https://example.com');
    });
  });

  it('should detect circular dependencies', async () => {
    await scope(async () => {
      const config = {
        URL: 'https://example.com',
        [DepsSymbol]: [buildExample],
      };

      class Api {
        static [DepsSymbol] = [config];
        static [TypeSymbol] = DependencyType.CLASS;
        getUrl() {
          return getDep(config).URL;
        }
      }
      function buildExample() {
        return {
          test() {
            return getDep(Api).getUrl();
          },
        };
      }
      buildExample[DepsSymbol] = [Api];
      buildExample[TypeSymbol] = DependencyType.FACTORY;
      await expect(resolveDep(buildExample)).rejects.toThrow(
        new Error(
          '@kontsedal/buba error::: Circular dependency detected. Call tree: buildExample -> Api -> {"URL":"https://example.com"} -> buildExample'
        )
      );
    });
  });

  it('should allow to mock dependency', async () => {
    const config = { URL: 'https://example.com' };

    await scope(async () => {
      mockDep(config, { URL: 'MOCKED_URL' });
      await scope(async () => {
        class Api {
          static [DepsSymbol] = [config];
          static [TypeSymbol] = DependencyType.CLASS;
          getUrl() {
            return getDep(config).URL;
          }
        }
        class Example {
          static [DepsSymbol] = [Api];
          static [TypeSymbol] = DependencyType.CLASS;
          test() {
            return getDep(Api).getUrl();
          }
        }
        const example = await resolveDep(Example);
        expect(example.test()).toBe('MOCKED_URL');
      });
    });
  });

  it('should allow to overwrite dependency', async () => {
    const config = { URL: 'https://example.com' };

    await scope(async () => {
      class Api {
        static [DepsSymbol] = [config];
        static [TypeSymbol] = DependencyType.CLASS;
        getUrl() {
          return getDep(config).URL;
        }
      }
      class Example {
        static [DepsSymbol] = [Api];
        static [TypeSymbol] = DependencyType.CLASS;
        test() {
          return getDep(Api).getUrl();
        }
      }
      const example = await resolveDep(Example);
      await scope(() => {
        setDep(config, { URL: 'OVERWRITTEN_URL' });
        expect(example.test()).toBe('OVERWRITTEN_URL');
      });
    });
  });
});
