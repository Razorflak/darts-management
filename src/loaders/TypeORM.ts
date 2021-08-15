import 'reflect-metadata';
import { createConnection } from 'typeorm';
import DataTestingInsertion from 'mocks/DataTestingInsertion';

export default createConnection()
  .then((connection) => {
    DataTestingInsertion(connection);
  })
  .catch((error) => console.log(error));
