import ICommitte from './ICommitte';

export default interface IClub {
  id: string;
  committe: ICommitte;
  name: string;
  adress: string;
  city: string;
  postcode: string;
  logo: string; // path to the logo photo

  //Data possibly related to the club
}
