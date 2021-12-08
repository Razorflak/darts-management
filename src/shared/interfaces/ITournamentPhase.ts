import ITournament from './ITournament';

export default interface ITournamentPhase {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  tournament: ITournament;
}
