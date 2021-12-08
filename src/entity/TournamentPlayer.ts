import Tournament from '@entity/Tournament';
import IPlayer from '@interface/IPlayer';
import ITournament from '@interface/ITournament';
import ITournamentPlayer from '@interface/ITournamentPlayer';
import { Column, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import Player from './Player';

@Entity()
export default class TournamentPlayer implements ITournamentPlayer {
  @PrimaryGeneratedColumn()
  id: string;

  @OneToOne(() => Player, (player) => player.id, { onDelete: 'SET NULL' })
  player: IPlayer;

  @ManyToOne(() => Tournament, (tournament) => tournament.id, { onDelete: 'CASCADE' })
  tournament: ITournament;

  @Column()
  registrationDate: Date;

  @Column()
  isCheckedIn: boolean;
}
