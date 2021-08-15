import IPlayer from '@interface/IPlayer';
import IThrow from '@interface/IThrow';

export default class Throw implements IThrow {
  id: string;
  number: number;
  nbr_darts: number;
  score: number;
  player: IPlayer;
}
