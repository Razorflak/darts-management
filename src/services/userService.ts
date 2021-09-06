import listEmailTemplate from '@mailTemplate/mails.json';
import User from '@entity/User';
import { logError } from '@error/logger';
import IUser from '@interface/IUser';
import { getManager } from 'typeorm';
import mailer from './mailer';
import { genereteRandomString } from 'helper/string';
import UserValidator from 'shared/validators/UserValidator';

class UserService {
  /**
   * Create a new User
   * Send the validation email
   * @param user User data
   * @returns {Promise<IUser>}
   */
  async createUser(user: IUser): Promise<IUser> {
    try {
      UserValidator.validate(user);

      user.isAccountValidated = false;
      user.emailValidationCode = genereteRandomString(12);
      const userRepository = getManager().getRepository(User);
      const newUser = userRepository.create(user);
      const createdUser = await userRepository.save(newUser);
      mailer.sendMail(
        createdUser.mail,
        listEmailTemplate.validationEmail.subject,
        listEmailTemplate.validationEmail.template,
        createdUser
      );
      // remove those because there are sensitive data, and useless for the Front
      delete createdUser.password;
      delete createdUser.emailValidationCode;

      return createdUser;
    } catch (error) {
      logError(error);
      throw error;
    }
  }
}

export default new UserService();
