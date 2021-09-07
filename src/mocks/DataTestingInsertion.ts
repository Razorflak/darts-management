import User from '@entity/User';
import Committe from '@entity/Committe';
import { Connection } from 'typeorm';
import Club from '@entity/Club';
import Championship from '@entity/Championship';
import IChampionship from '@interface/IChampionship';
import Player from '@entity/Player';
import { logInfo, typeMessage } from '@error/Logger';
import fs from 'fs';

export default async function (connection: Connection) {
  const manager = connection.manager;
  connection.createQueryBuilder().delete().from(Committe).execute();
  connection.createQueryBuilder().delete().from(Player).execute();

  manager.insert(User, {
    mail: 'test@gmail.com',
    password: 'pwd',
    emailValidationCode: 'efunzoefnsomeinf',
    isAccountValidated: false
  } as User);

  const committe = await manager.insert(Committe, {});
  const committeID = committe.identifiers[0];

  manager.insert(Championship, {
    name: 'Division 1',
    start_date: new Date('03/09/2021'),
    committe: committeID,
    end_date: new Date('03/09/2021')
  } as IChampionship);

  if (fs.existsSync('../data/clubs44.json')) {
    const raw = fs.readFileSync('../data/clubs44.json', 'utf8');
    const clubsRaw = JSON.parse(raw);
    clubsRaw.forEach((element) => {
      manager.insert(Club, {
        name: element.name,
        city: element.city,
        postcode: element.postcode.toString(),
        committe: committeID
      });
    });
  }

  if (fs.existsSync('../data/playerData44.json')) {
    const raw = fs.readFileSync('../data/playerData44.json', 'utf8');
    const playersRaw = JSON.parse(raw);
    playersRaw.forEach(async (element) => {
      const club = await manager.findOne(Club, {
        where: {
          name: element.club
        }
      });
      const dateParts = element.birthDay.split('/');
      const dateObject = new Date(+dateParts[2], +dateParts[1] - 1, +dateParts[0]);
      if (club) {
        manager
          .insert(Player, {
            firstname: element.firstname,
            lastname: element.lastname,
            club: club,
            birthCity: element.birthCity,
            birthDay: dateObject,
            mail: element.mail,
            licenceNumber: element.licenceNumber?.toString()
          })
          .catch((error) => {
            logInfo('Error when inserting player data \n' + error, typeMessage.Error);
          });
      }
    });
  }
}
