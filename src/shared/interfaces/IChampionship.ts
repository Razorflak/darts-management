import IChampionship_ClubTeam from './IChampionship_ClubTeam';
import ICommitte from './ICommitte';

export default interface IChampionship {
  id: string;
  committe: ICommitte;
  name: string;
  start_date: Date;
  end_date: Date;
  championship_ClubTeam: IChampionship_ClubTeam[];
}
