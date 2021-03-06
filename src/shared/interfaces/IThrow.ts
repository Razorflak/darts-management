import ILeg from './ILeg';
import IPlayer from './IPlayer';

export default interface IThrow {
  id: string;
  number: number;
  nbr_darts: number;
  score: number;
  leg: ILeg;
  player: IPlayer;
}
