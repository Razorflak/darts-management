import IChampionship from './IChampionship';
import IClubTeam from './IClubTeam';
import IPlayer from './IPlayer';

export default interface IChampionshipClubTeam {
  id: string;
  clubteam: IClubTeam;
  championship: IChampionship;
  players: IPlayer[];
  points: number;
  goalaverage: number;
  number_match_played: number;
}
