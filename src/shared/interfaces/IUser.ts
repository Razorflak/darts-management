export default interface IUser {
  id: string;
  mail: string;
  password: string;
  //Fields use to validate the email
  emailValidationCode: string;
  isAccountValidated: boolean;
}
