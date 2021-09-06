import { FieldError, InvalidData } from '@error/InvalidDataError';
import IUser from '@interface/IUser';
import { validateEmail } from 'helper/string';

class UserValidator {
  PWD_MINIMUM_LENGTH = 8;

  validate(user: IUser) {
    const issues = [];

    !this.isEmailValide(user.mail) && issues.push(new FieldError('User.mail', 'Invalid email adress'));
    !this.isPasswordValide(user.password) && issues.push(new FieldError('User.password', 'Password too short'));

    if (issues.length > 0) {
      throw new InvalidData('Invalid User data', issues);
    }
  }

  validators = [
    {
      function: (user: IUser) => {
        return user.password.length < this.PWD_MINIMUM_LENGTH;
      },
      error: {
        field: 'User.mail',
        message: 'Invalid email adress'
      }
    }
  ];

  private isPasswordValide(pwd: string) {}

  private isEmailValide(email: string): boolean {
    return validateEmail(email);
  }
}

export default new UserValidator();
