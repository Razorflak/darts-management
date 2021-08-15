import ILeg from '@interface/ILeg';
import IMatch from '@interface/IMatch';
import ISet from '@interface/ISet';
import ITeam from '@interface/ITeam';

export default class Set implements ISet {
  id: string;
  match: IMatch;
  legs: ILeg[];
  winner: ITeam;
}
