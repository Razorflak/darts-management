import ILeg from './ILeg';
import IMatch from './IMatch';
import ITeam from './ITeam';

export default interface ISet {
  id: string;
  match: IMatch;
  legs: ILeg[];
  winner: ITeam;
}
