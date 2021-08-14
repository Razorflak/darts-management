import IChampionshipMatch from './IChampionshipMatch';
import IClubTeam from './IClubTeam';
import IPlayer from './IPlayer';

export default interface IChampionshipMatch_ClubTeam {
  id: string;
  clubteam: IClubTeam;
  championshipMatch: IChampionshipMatch;
  players: IPlayer[];
  score: number;
}
