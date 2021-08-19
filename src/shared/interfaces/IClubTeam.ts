import IChampionshipClubTeam from './IChampionshipClubTeam';
import IClub from './IClub';

export default interface IClubTeam {
  id: string;
  club: IClub;
  name: string;
  championshipClubTeam: IChampionshipClubTeam[];

  //Data possibly related to the team
}
