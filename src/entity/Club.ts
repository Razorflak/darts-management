import IClub from '@interface/IClub';
import ICommitte from '@interface/ICommitte';

export default class Club implements IClub {
  id: string;
  committe: ICommitte;
  name: string;
  adress: string;
  city: string;
  postcode: string;
  logo: string;
}
