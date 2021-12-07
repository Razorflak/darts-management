import IPlayer from './IPlayer';
import ITournament from './ITournament';

export default interface ITournamentPlayer {
  id: string;
  player: IPlayer;
  tournament: ITournament;
  registrationDate: Date;
  isCheckedIn: boolean;
}
