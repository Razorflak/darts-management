export class AbstractValidator {
  validators;
  constructor(validators: IValidator[]) {
    this.validators = validators;
  }

  validate() {
    this.validators.forEach((element: IValidator) => {
      element.validatorFunction(data);
    });
  }
}

export interface IValidator {
  validatorFunction(data: unknown): boolean;
  field: string;
  errorMessage: string;
}
