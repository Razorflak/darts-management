import ILeg from './ILeg';
import ITeam from './ITeam';

export default interface ISet {
  id: string;
  legs: ILeg[];
  winner: ITeam;
}
