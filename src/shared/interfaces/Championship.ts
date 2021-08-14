import ITeam from './IClubTeam';
import ICommitte from './ICommitte';

export default interface IChampionship {
  id: string;
  committe: ICommitte;
  name: string;
  start_date: Date;
  end_date: Date;
  teams: ITeam;
}
