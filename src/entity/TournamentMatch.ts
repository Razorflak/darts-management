import ITournamentMatch from '@interface/ITournamentMatch';
import { Column, PrimaryGeneratedColumn, Entity, OneToOne, ManyToOne } from 'typeorm';
import Match from './Match';
import TournamentPhase from './TournamentPhase';

@Entity()
export default class TournamentMatch implements ITournamentMatch {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  numMatch: number;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @OneToOne(() => Match, (match) => match.id)
  match: Match;

  @ManyToOne(() => TournamentPhase, (tournamentPhase) => tournamentPhase.id, { onDelete: 'CASCADE' })
  phase: TournamentPhase;
}
