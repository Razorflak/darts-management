import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import IPlayer from '@interface/IPlayer';
import IClub from '@interface/IClub';
import ITeam from '@interface/ITeam';
import ChampionshipClubTeam from './ChampionshipClubTeam';
import ChampionshipMatchClubTeam from './ChampionshipMatchClubTeam';
import Club from './Club';
import Team from './Team';

@Entity()
export default class Player implements IPlayer {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToOne(() => Club, (club) => club.id)
  club: IClub;

  @ManyToMany(() => Team)
  @JoinTable()
  team: ITeam;

  @Column()
  firstname: string;

  @Column()
  lastname: string;

  @Column()
  birth_day: Date;

  @Column()
  licenceNumber: string;

  @ManyToMany(() => ChampionshipClubTeam, { cascade: true })
  @JoinTable()
  championshipClubTeam: ChampionshipClubTeam[];

  @ManyToMany(() => ChampionshipMatchClubTeam, { cascade: true })
  @JoinTable()
  championshipMatchClubTeam: ChampionshipMatchClubTeam[];
}
