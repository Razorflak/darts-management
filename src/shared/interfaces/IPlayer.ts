import IChampionshipMatchClubTeam from './IChampionshipMatchClubTeam';
import IChampionshipClubTeam from './IChampionshipClubTeam';
import IClub from './IClub';
import ITeam from './ITeam';

export default interface IPlayer {
  id: string;
  club: IClub;
  team: ITeam;
  firstname: string;
  lastname: string;
  birthDay: Date;
  birthCity: string;
  licenceNumber: string;
  mail: string;
  championshipClubTeam: IChampionshipClubTeam[];
  championshipMatchClubTeam: IChampionshipMatchClubTeam[];
  //Data possibly related to the player
}
