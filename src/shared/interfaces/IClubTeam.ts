import IChampionship_ClubTeam from './IChampionship_ClubTeam';
import IClub from './IClub';

export default interface IClubTeam {
  id: string;
  club: IClub;
  name: string;
  championship_ClubTeam: IChampionship_ClubTeam[];

  //Data possibly related to the team
}
