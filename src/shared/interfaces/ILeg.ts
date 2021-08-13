import ISet from './ISet';
import ITeam from './ITeam';
import IThrow from './IThrow';

export default interface ILeg {
  id: string;
  set: ISet;
  throws: IThrow[];
  winner: ITeam;
}
