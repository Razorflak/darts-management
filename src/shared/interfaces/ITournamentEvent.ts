import ITournament from './ITournament';

export default interface ITournamentEvent {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  place: string;
  tournaments: ITournament[];
}
