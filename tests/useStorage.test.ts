import useStorage from '../src/useStorage';
import { act, renderHook } from '@testing-library/react-hooks';
import Mocked = jest.Mocked;

const getMockStorage = (): Mocked<Storage> => ({
  length: 0,
  clear: jest.fn(),
  getItem: jest.fn().mockReturnValue(null),
  key: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
});

describe(useStorage, () => {
  it('retrieves an existing value from Storage', () => {
    const mockStorage = getMockStorage();
    mockStorage.getItem.mockReturnValue('"bar"');

    const { result } = renderHook(() => useStorage('foo', mockStorage));
    const [state] = result.current;

    expect(state).toEqual('bar');
  });

  it('should return initialValue if Storage empty and set that to Storage', () => {
    const mockStorage = getMockStorage();

    const { result } = renderHook(() => useStorage('foo', mockStorage, 'bar'));
    const [state] = result.current;

    expect(state).toEqual('bar');
    expect(mockStorage.setItem).toHaveBeenCalledWith('foo', '"bar"');
  });

  it('prefers existing value over initial state', () => {
    const mockStorage = getMockStorage();

    mockStorage.getItem.mockReturnValue('"bar"');

    const { result } = renderHook(() => useStorage('foo', mockStorage, 'baz'));
    const [state] = result.current;

    expect(state).toEqual('bar');
  });

  it('does not clobber existing Storage with initialState', () => {
    const mockStorage = getMockStorage();

    mockStorage.getItem.mockReturnValue('"bar"');

    const { result } = renderHook(() => useStorage('foo', mockStorage, 'buzz'));
    expect(result.current).toBeTruthy();

    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it('should return undefined if no initialValue provided and Storage empty', () => {
    const mockStorage = getMockStorage();

    mockStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useStorage('some_key', mockStorage));

    expect(result.current[0]).toBeUndefined();
  });

  it('returns and allows null setting', () => {
    const mockStorage = getMockStorage();
    mockStorage.getItem.mockReturnValue('null');

    const { result, rerender } = renderHook(() => useStorage('foo', mockStorage));
    const [foo1, setFoo] = result.current;
    act(() => setFoo(null));
    expect(mockStorage.setItem).toHaveBeenCalledWith('foo', 'null');
    rerender();

    const [foo2] = result.current;
    expect(foo1).toEqual(null);
    expect(foo2).toEqual(null);
  });

  it('sets initialState if initialState is an object', () => {
    const mockStorage = getMockStorage();

    renderHook(() => useStorage('foo', mockStorage, { bar: true }));
    expect(mockStorage.setItem).toHaveBeenCalledWith('foo', '{"bar":true}');
  });

  it('correctly and promptly returns a new value', () => {
    const mockStorage = getMockStorage();

    const { result, rerender } = renderHook(() => useStorage('foo', mockStorage, 'bar'));

    const [, setFoo] = result.current;
    act(() => setFoo('baz'));
    expect(mockStorage.setItem).toHaveBeenCalledWith('foo', '"baz"');

    mockStorage.getItem.mockReturnValue('"baz"');
    rerender();

    const [foo] = result.current;
    expect(foo).toEqual('baz');
  });

  it('reinitializes state when key changes', () => {
    const mockStorage = getMockStorage();

    let key = 'foo';
    const { result, rerender } = renderHook(() => useStorage(key, mockStorage, 'bar'));

    const [, setState] = result.current;
    act(() => setState('baz'));
    expect(mockStorage.setItem).toHaveBeenCalledWith(key, '"baz"');

    key = 'bar';
    rerender();

    const [state] = result.current;
    expect(state).toEqual('bar');
    expect(mockStorage.setItem).toHaveBeenCalledWith(key, '"bar"');
  });

  /*
  it('keeps multiple hooks accessing the same key in sync', () => {
    Storage.setItem('foo', 'bar');
    const { result: r1, rerender: rerender1 } = renderHook(() => useStorage('foo'));
    const { result: r2, rerender: rerender2 } = renderHook(() => useStorage('foo'));

    const [, setFoo] = r1.current;
    act(() => setFoo('potato'));
    rerender1();
    rerender2();

    const [val1] = r1.current;
    const [val2] = r2.current;

    expect(val1).toEqual(val2);
    expect(val1).toEqual('potato');
    expect(val2).toEqual('potato');
  });
  */

  it('parses out objects from Storage', () => {
    const mockStorage = getMockStorage();

    mockStorage.getItem.mockReturnValue(JSON.stringify({ ok: true }));

    const { result } = renderHook(() => useStorage<{ ok: boolean }>('foo', mockStorage));
    const [foo] = result.current;
    expect(foo?.ok).toEqual(true);
  });

  it('safely initializes objects to Storage', () => {
    const mockStorage = getMockStorage();

    const { result } = renderHook(() =>
      useStorage<{ ok: boolean }>('foo', mockStorage, { ok: true })
    );

    expect(mockStorage.setItem).toHaveBeenCalledWith('foo', '{"ok":true}');

    const [foo] = result.current;
    expect(foo?.ok).toEqual(true);
  });

  it('safely sets objects to Storage', () => {
    const mockStorage = getMockStorage();

    const { result, rerender } = renderHook(() =>
      useStorage<{ ok: any }>('foo', mockStorage, { ok: true })
    );

    const [, setFoo] = result.current;
    act(() => setFoo({ ok: 'bar' }));
    expect(mockStorage.setItem).toHaveBeenCalledWith('foo', '{"ok":"bar"}');

    mockStorage.getItem.mockReturnValue('{"ok":"bar"}');
    rerender();

    const [foo] = result.current;
    expect(foo?.ok).toEqual('bar');
  });

  it('safely returns objects from updates', () => {
    const mockStorage = getMockStorage();

    const { result, rerender } = renderHook(() =>
      useStorage<{ ok: any }>('foo', mockStorage, { ok: true })
    );

    const [, setFoo] = result.current;
    act(() => setFoo({ ok: 'bar' }));
    expect(mockStorage.setItem).toHaveBeenCalledWith('foo', '{"ok":"bar"}');

    mockStorage.getItem.mockReturnValue('{"ok":"bar"}');
    rerender();

    const [foo] = result.current;
    expect(foo).toBeInstanceOf(Object);
    expect(foo?.ok).toEqual('bar');
  });

  it('sets Storage from the function updater', () => {
    const mockStorage = getMockStorage();

    const { result, rerender } = renderHook(() =>
      useStorage<{ foo: string; fizz?: string }>('foo', mockStorage, { foo: 'bar' })
    );

    const [, setFoo] = result.current;
    act(() => setFoo((state) => ({ ...state!, fizz: 'buzz' })));
    expect(mockStorage.setItem).toHaveBeenCalledWith('foo', '{"foo":"bar","fizz":"buzz"}');

    mockStorage.getItem.mockReturnValue('{"foo":"bar","fizz":"buzz"}');
    rerender();

    const [value] = result.current;
    expect(value!.foo).toEqual('bar');
    expect(value!.fizz).toEqual('buzz');
  });

  it('rejects nullish or undefined keys', () => {
    const { mockStorage } = getMockStorage();

    const { result } = renderHook(() => useStorage(null as any, mockStorage));
    try {
      (() => {
        return result.current;
      })();
      fail('hook should have thrown');
    } catch (e) {
      expect(String(e)).toMatch(/key may not be/i);
    }
  });

  /* Enforces proper eslint react-hooks/rules-of-hooks usage */
  describe('eslint react-hooks/rules-of-hooks', () => {
    const { mockStorage } = getMockStorage();

    it('memoizes an object between rerenders', () => {
      const { result, rerender } = renderHook(() => useStorage('foo', mockStorage, { ok: true }));
      (() => {
        return result.current; // if Storage isn't set then r1 and r2 will be different
      })();
      rerender();
      const [r2] = result.current;
      rerender();
      const [r3] = result.current;
      expect(r2).toBe(r3);
    });

    it('memoizes an object immediately if Storage is already set', () => {
      const mockStorage = getMockStorage();

      mockStorage.getItem.mockReturnValue(JSON.stringify({ ok: true }));
      const { result, rerender } = renderHook(() => useStorage('foo', mockStorage, { ok: true }));

      const [r1] = result.current; // if Storage isn't set then r1 and r2 will be different
      rerender();
      const [r2] = result.current;
      expect(r1).toBe(r2);
    });

    it('memoizes the setState function', () => {
      const mockStorage = getMockStorage();

      mockStorage.getItem.mockReturnValue(JSON.stringify({ ok: true }));

      const { result, rerender } = renderHook(() => useStorage('foo', mockStorage, { ok: true }));
      const [, s1] = result.current;
      rerender();
      const [, s2] = result.current;
      expect(s1).toBe(s2);
    });
  });

  describe('Options: raw', () => {
    it('returns a string when Storage is a stringified object', () => {
      const mockStorage = getMockStorage();

      mockStorage.getItem.mockReturnValue(JSON.stringify({ fizz: 'buzz' }));

      const { result } = renderHook(() => useStorage('foo', mockStorage, null, { raw: true }));
      const [foo] = result.current;
      expect(typeof foo).toBe('string');
    });

    it('returns a string after an update', () => {
      const mockStorage = getMockStorage();

      const { result, rerender } = renderHook(() =>
        useStorage('foo', mockStorage, null, { raw: true })
      );

      const [, setFoo] = result.current;

      act(() => setFoo({ fizz: 'bang' } as any));
      expect(mockStorage.setItem).toHaveBeenCalledWith('foo', '{"fizz":"bang"}');

      mockStorage.getItem.mockReturnValue(JSON.stringify({ fizz: 'bang' }));
      rerender();

      const [foo] = result.current;
      expect(typeof foo).toBe('string');

      expect(JSON.parse(foo!)).toBeInstanceOf(Object);

      // expect(JSON.parse(foo!).fizz).toEqual('bang');
    });

    it('still forces setState to a string', () => {
      const mockStorage = getMockStorage();

      mockStorage.getItem.mockReturnValue(JSON.stringify({ fizz: 'buzz' }));
      const { result, rerender } = renderHook(() =>
        useStorage('foo', mockStorage, null, { raw: true })
      );

      const [, setFoo] = result.current;

      act(() => setFoo({ fizz: 'bang' } as any));
      expect(mockStorage.setItem).toHaveBeenCalledWith('foo', '{"fizz":"bang"}');

      mockStorage.getItem.mockReturnValue(JSON.stringify({ fizz: 'bang' }));
      rerender();

      const [value] = result.current;

      expect(JSON.parse(value!).fizz).toEqual('bang');
    });
  });
});
