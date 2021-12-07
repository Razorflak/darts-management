import TournamentPhase from './TournamentPhase';
import ITournament from '@interface/ITournament';
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import TournamentEvent from './TournamentEvent';
import TournamentPlayer from './TournamentPlayer';

@Entity()
export default class Tournament implements ITournament {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @OneToMany(() => TournamentPhase, (tournamentPhase) => tournamentPhase.id)
  phases: TournamentPhase[];

  @ManyToOne(() => TournamentEvent, (tournamentEvent) => tournamentEvent.id, { onDelete: 'CASCADE' })
  event: TournamentEvent;

  @OneToMany(() => TournamentPlayer, (tournamentPlayer) => tournamentPlayer.id)
  players: TournamentPlayer[];
}
