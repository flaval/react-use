import { Dispatch, SetStateAction, useCallback, useLayoutEffect, useState } from 'react';
import isDeepEqual from './misc/isDeepEqual';

type parserOptions<StoredObject> = {
  onThrow?: (error: Error) => void;
} & (
  | {
      raw: true;
    }
  | {
      raw: false;
      serializer: (rawObject: StoredObject | undefined) => string;
      deserializer: (serializedStoredObject: string) => StoredObject | undefined;
    }
);

const defaultOptions = {
  serializer: <StoredObject>(rawObject: StoredObject | undefined): string =>
    JSON.stringify(rawObject),
  deserializer: <StoredObject>(serializedStoredObject: string): StoredObject | undefined =>
    JSON.parse(serializedStoredObject) as StoredObject | undefined,
};

const defaultRawOptions = {
  serializer: String,
  deserializer: <StoredObject>(serializedStoredObject: string): StoredObject | undefined =>
    serializedStoredObject as unknown as StoredObject | undefined,
};

const useStorage = <StoredObject>(
  key: string,
  storage: Storage,
  initialValue?: StoredObject,
  options?: parserOptions<StoredObject>
): [StoredObject | undefined, Dispatch<SetStateAction<StoredObject>>, () => void] => {
  if (!key) {
    throw new Error('useStorage key may not be falsy');
  }

  const { onThrow, raw, serializer, deserializer } = options?.raw
    ? { ...options, ...defaultRawOptions }
    : { ...defaultOptions, ...options, raw: false };

  const initializer = useCallback<(key: string) => StoredObject | undefined>(
    (key) => {
      try {
        const storedObject = storage.getItem(key);
        if (storedObject !== null) {
          return deserializer<StoredObject>(storedObject);
        } else {
          initialValue && storage.setItem(key, serializer<StoredObject>(initialValue));
          return initialValue;
        }
      } catch (error) {
        // If user is in private mode or has storage restriction
        // localStorage can throw. JSON.parse and JSON.stringify
        // can throw, too.
        onThrow?.(error);
        return initialValue;
      }
    },
    [deserializer, initialValue, onThrow, serializer, storage]
  );

  const [storedObject, setStoredObject] = useState<StoredObject | undefined>(() =>
    initializer(key)
  );
  console.log(storedObject);

  useLayoutEffect(() => {
    const newValue = initializer(key);
    !isDeepEqual(newValue, storedObject) && setStoredObject(newValue);
  }, [initializer, key, storedObject]);

  const set: Dispatch<SetStateAction<StoredObject>> = useCallback(
    (valueOrFunction) => {
      try {
        const newValue =
          typeof valueOrFunction === 'function'
            ? (valueOrFunction as <S>(prevState: S) => S)(storedObject)
            : valueOrFunction;

        if (typeof newValue === 'undefined') return;

        const transformedNewValue = !raw
          ? serializer<StoredObject>(newValue)
          : typeof newValue !== 'string'
          ? JSON.stringify(newValue)
          : newValue;

        storage.setItem(key, transformedNewValue);
        setStoredObject(raw ? newValue : deserializer<StoredObject>(transformedNewValue));
      } catch (error) {
        // If user is in private mode or has storage restriction
        // storage can throw. Also JSON.stringify can throw.
        onThrow?.(error);
      }
    },
    [storedObject, storage, key, raw, serializer, deserializer, onThrow]
  );

  const remove = useCallback(() => {
    try {
      storage.removeItem(key);
      setStoredObject(undefined);
    } catch (error) {
      // If user is in private mode or has storage restriction
      // storage can throw.
      onThrow?.(error);
    }
  }, [key, onThrow, storage]);

  return [storedObject, set, remove];
};

export default useStorage;
