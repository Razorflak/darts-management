import IClub from '@interface/IClub';
import ICommitte from '@interface/ICommitte';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import Committe from './Committe';

@Entity()
export default class Club implements IClub {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToOne(() => Committe, (committe) => committe.id, { onDelete: 'CASCADE' })
  committe: ICommitte;

  @Column()
  name: string;

  @Column()
  adress: string;

  @Column()
  city: string;

  @Column()
  postcode: string;

  @Column()
  logo: string;
}
