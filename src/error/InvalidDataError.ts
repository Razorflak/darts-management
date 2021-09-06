export class InvalidDataError extends Error {
  fields: FieldError[];

  constructor(entity: string, fields: FieldError[]) {
    super(`Invalid ${entity} data`);
    this.fields = fields;
  }
}

export class FieldError extends Error {
  field: string;
  error: string;
  constructor(field: string, error: string) {
    super();
    this.field = field;
    this.error = error;
  }
}
