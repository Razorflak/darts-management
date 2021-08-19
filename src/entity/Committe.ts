import ICommitte from '@interface/ICommitte';
import { Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export default class Committe implements ICommitte {
  @PrimaryGeneratedColumn()
  id: string;
}
