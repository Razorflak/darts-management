import IChampionship from './IChampionship';
import IChampionshipMatchClubTeam from './IChampionshipMatchClubTeam';
import IMatch from './IMatch';

export default interface IChampionshipMatch {
  id: string;
  championship: IChampionship;
  championshipMatchClubTeam: IChampionshipMatchClubTeam[];
  championship_day: number;
  match_date?: Date;
  scheduled_match_date: Date;
  matches: IMatch[];

  //Data possibly related to the championship match
}
