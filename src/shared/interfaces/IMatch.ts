import ISet from './ISet';
import ITeam from './ITeam';

export default interface IMatch {
  id: string;
  teams: ITeam[];
  sets: ISet[];
}
