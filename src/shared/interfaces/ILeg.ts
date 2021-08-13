import ITeam from './ITeam';
import IThrow from './IThrow';

export default interface ILeg {
  id: string;
  throws: IThrow[];
  winner: ITeam;
}
