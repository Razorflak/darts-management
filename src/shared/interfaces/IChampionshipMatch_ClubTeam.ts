import IChampionshipMatch from './IChampionshipMatch';
import IClubTeam from './IClubTeam';

export default interface IChampionshipMatch_ClubTeam {
  id: string;
  clubteam: IClubTeam;
  championshipMatch: IChampionshipMatch;
  score: number;
}
