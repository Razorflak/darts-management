import UserErrorMessage from '@error/messages/UserErrorMessage.json';
import listEmailTemplate from '@mailTemplate/mails.json';
import User from '@entity/User';
import { logError } from '@error/Logger';
import IUser from '@interface/IUser';
import { getManager } from 'typeorm';
import mailer from './MailerService';
import { genereteRandomString } from 'helper/string';
import UserValidator from 'shared/validators/UserValidator';
import { InvalidDataError, FieldError } from '@error/InvalidDataError';
import bcrypt from 'bcryptjs';
import { generateTokenForUser } from './AuthentificationService';

class UserService {
  /**
   * Create a new User
   * Send the validation email
   * @param user User data
   * @returns {Promise<IUser>}
   */
  async createUser(user: IUser): Promise<IUser> {
    try {
      //Validate user data
      UserValidator.validate(user);

      const userRepository = getManager().getRepository(User);
      //Check if email adress already used
      const existingUser = await userRepository.findOne({
        where: {
          mail: user.mail
        }
      });

      if (existingUser) {
        throw new InvalidDataError('User', [
          new FieldError(UserErrorMessage.emailField, UserErrorMessage.mailAdressAlreadyUsed)
        ]);
      }

      //Generate Validation code
      user.isAccountValidated = false;
      user.emailValidationCode = genereteRandomString(12);

      //Encrypt password
      user.password = await bcrypt.hash(user.password, await bcrypt.genSalt());

      //Creation of the new user
      const createdUser = await userRepository.save(userRepository.create(user));

      //Send validation email adress
      mailer.sendMail(
        createdUser.mail,
        listEmailTemplate.validationEmail.subject,
        listEmailTemplate.validationEmail.template,
        createdUser
      );
      // remove those because they are sensitive data and useless for the Front
      delete createdUser.password;
      delete createdUser.emailValidationCode;

      return createdUser;
    } catch (error) {
      logError(error);
      throw error;
    }
  }
  /**
   * Check user infos and return an auth token
   * @param {IUser} user
   * @returns {Promise<string>}
   */
  async loginUser(user: IUser): Promise<string> {
    try {
      // If rules work for register, they work for login
      UserValidator.validate(user);

      const userDb = await getManager()
        .getRepository(User)
        .findOneOrFail({
          where: {
            mail: user.mail
          }
        });
      //Check if acount mail adress is validated
      if (!userDb.isAccountValidated) throw new Error();
      // Compare password to the hash
      if (!bcrypt.compare(user.password, userDb.password)) throw new Error();

      return generateTokenForUser(userDb);
    } catch (error) {
      throw new Error(UserErrorMessage.loginError);
    }
  }
}

export default new UserService();
