import ICommitte from '@interface/ICommitte';
import User from '@entity/User';
import Committe from '@entity/Committe';
import IUser from '@interface/IUser';
import { Connection } from 'typeorm';
import Club from '@entity/Club';
import IClub from '@interface/IClub';
import Championship from '@entity/Championship';
import IChampionship from '@interface/IChampionship';

export default async function (connection: Connection) {
  const manager = connection.manager;
  connection.createQueryBuilder().delete().from(Committe).execute();

  manager.insert(User, {
    mail: 'test@gmail.com',
    password: 'pwd',
    emailValidationCode: 'efunzoefnsomeinf',
    isAccountValidated: false
  } as User);

  const committe = await manager.insert(Committe, {});

  manager.insert(Club, {
    committe: committe.identifiers[0],
    logo: 'path/to/a/logo.jpg',
    name: 'LeDard',
    postcode: '44230',
    adress: 'Le vieux mille club de merde',
    city: 'Haute Goulaine'
  } as IClub);

  manager.insert(Championship, {
    name: 'Division 1',
    start_date: new Date('03/09/2021'),
    committe: committe.identifiers[0],
    end_date: new Date('03/09/2021')
  } as IChampionship);
}
