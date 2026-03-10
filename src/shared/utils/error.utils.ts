import { InvalidInputError, PermissionNotGrantedError } from '../typings/error.typings';

export function checkStringAndIfEmptyThrowPermissionError(value: string | undefined, fieldName: string) {
  if (value === undefined || value.trim() === '') {
    throw new PermissionNotGrantedError(`Invalid ${fieldName}: value is required and cannot be empty`);
  }
}

export function checkStringAndIfEmptyThrowInvalidInputError(value: string | undefined, fieldName: string) {
  if (value === undefined || value.trim() === '') {
    throw new InvalidInputError(`Invalid ${fieldName}: value is required and cannot be empty`);
  }
}
