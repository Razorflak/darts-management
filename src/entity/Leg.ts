import ILeg from '@interface/ILeg';
import ISet from '@interface/ISet';
import ITeam from '@interface/ITeam';
import IThrow from '@interface/IThrow';

export default class Leg implements ILeg {
  id: string;
  set: ISet;
  throws: IThrow[];
  winner: ITeam;
}
