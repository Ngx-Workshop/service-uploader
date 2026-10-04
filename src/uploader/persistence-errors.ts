import { mongo } from 'mongoose';

export function isDuplicateKey(error: unknown, field: string): boolean {
  const keyPattern: unknown =
    error instanceof mongo.MongoServerError ? error.keyPattern : undefined;
  return (
    error instanceof mongo.MongoServerError &&
    error.code === 11000 &&
    typeof keyPattern === 'object' &&
    keyPattern !== null &&
    field in keyPattern &&
    Reflect.get(keyPattern, field) === 1
  );
}
