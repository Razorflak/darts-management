import IChampionshipMatch_ClubTeam from './IChampionshipMatch_ClubTeam';
import IChampionship_ClubTeam from './IChampionship_ClubTeam';

export default interface IPlayer {
  id: string;
  user_id?: string;
  club_id?: string;
  team_id?: string;
  firstname?: string;
  lastname?: string;
  birth_day?: Date;
  licence_number?: string;
  championship_ClubTeam: IChampionship_ClubTeam[];
  championshipMatch_ClubTeam: IChampionshipMatch_ClubTeam[];
  //Data possibly related to the player
}
