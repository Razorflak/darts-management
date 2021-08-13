import IPlayer from './IPlayer';

export default interface IThrow {
  id: string;
  nbr_darts: number;
  score: number;
  player: IPlayer;
}
