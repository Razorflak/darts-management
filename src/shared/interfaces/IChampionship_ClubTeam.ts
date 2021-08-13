import IChampionship from './Championship';
import IClubTeam from './IClubTeam';

export default interface IChampionship_ClubTeam {
  id: string;
  clubteam: IClubTeam;
  championship: IChampionship;
  points: number;
  goalaverage: number;
  number_match_played: number;
}
