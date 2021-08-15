import IMatch from '@interface/IMatch';
import ISet from '@interface/ISet';
import ITeam from '@interface/ITeam';

export default class Match implements IMatch {
  id: string;
  teams: ITeam[];
  sets: ISet[];
  winner: ITeam;
}
