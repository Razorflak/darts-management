import IUser from '@interface/IUser';
import { validateEmail } from 'helper/string';
import { AbstractValidator, IValidator } from './AbstractValidator';
import UserErrorMessage from '@error/messages/UserErrorMessage.json';

class UserValidator extends AbstractValidator {
  PWD_MINIMUM_LENGTH = 8;
  //Define Validator functions associated with the problematic field and an error message
  validators: IValidator[] = [
    {
      validatorFunction: (user: IUser): boolean => {
        return user.password.length > this.PWD_MINIMUM_LENGTH;
      },
      field: UserErrorMessage.passwordField,
      errorMessage: UserErrorMessage.passwordTooShort
    },
    {
      validatorFunction: (user: IUser): boolean => {
        return validateEmail(user.mail);
      },
      field: UserErrorMessage.emailField,
      errorMessage: UserErrorMessage.invalidEmailAdress
    }
  ];
}

export default new UserValidator();
