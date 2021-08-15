import 'reflect-metadata';
import { createConnection } from 'typeorm';
import User from '@entity/User';

export default createConnection()
  .then((connection) => {
    connection.createQueryBuilder().delete().from(User).execute();
  })
  .catch((error) => console.log(error));
