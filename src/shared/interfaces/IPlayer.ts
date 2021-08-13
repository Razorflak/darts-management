export default interface IPlayer {
  id: string;
  user_id?: string;
  club_id?: string;
  team_id?: string;
  firstname?: string;
  lastname?: string;
  birth_day?: Date;
  licence_number?: string;

  //Data possibly related to the player
  // team: ITeam;
  // club: IClub;
}
