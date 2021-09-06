import { FieldError, InvalidDataError } from '@error/InvalidDataError';

export class AbstractValidator {
  validators; // MUST BE OVERWRITE

  validate(data: unknown) {
    const issues = [];
    this.validators.forEach((element: IValidator) => {
      if (!element.validatorFunction(data)) {
        issues.push(new FieldError(element.field, element.errorMessage));
      }
    });
    if (issues.length > 0) {
      throw new InvalidDataError('User', issues);
    }
  }
}

export interface IValidator {
  validatorFunction(data: unknown): boolean;
  field: string;
  errorMessage: string;
}
