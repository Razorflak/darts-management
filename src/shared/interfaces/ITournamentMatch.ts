import IMatch from '@interface/IMatch';
import ITournamentPhase from './ITournamentPhase';
export default interface ITournamentMatch {
  id: string;
  phase: ITournamentPhase;
  numMatch: number;
  startDate: Date;
  endDate: Date;
  match: IMatch; // If player come from a match with pair numMatch, then he will goes in index 0 of players array, 1 for an odd numMatch
}
