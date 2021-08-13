import IChampionship from './Championship';
import IChampionshipMatch_ClubTeam from './IChampionshipMatch_ClubTeam';
import IMatch from './IMatch';

export default interface IChampionshipMatch {
  id: string;
  championship: IChampionship;
  championshipMatch_ClubTeam: IChampionshipMatch_ClubTeam[];
  championship_day: number;
  match_date?: Date;
  scheduled_match_date: Date;
  matches?: IMatch[];

  //Data possibly related to the championship match
}
