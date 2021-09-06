export class InvalidData extends Error {
  fields: FieldError[];

  constructor(message: string, fields: FieldError[]) {
    super(message);
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
