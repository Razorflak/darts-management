import IMatch from '@interface/IMatch';
import ITeam from '@interface/ITeam';

export default class Team implements ITeam {
  id: string;
  matches: IMatch[];
}
