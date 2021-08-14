import IPlayer from './IPlayer';

export default interface IUser {
  id: string;
  mail: string;
  password: string;
  player: IPlayer;
  //Fields use to validate the email
  emailValidationCode: string;
  isAccountValidated: boolean;
}
