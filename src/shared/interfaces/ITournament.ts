import ITournamentEvent from './ITournamentEvent';
import ITournamentPhase from './ITournamentPhase';

export default interface ITournament {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  event: ITournamentEvent;
  phases: ITournamentPhase[];
}
