import dev from '@apiRoutes/routes/dev';
import register from '@apiRoutes/routes/register';
import { Router } from 'express';
import login from './routes/login';

export default () => {
  const app = Router();
  dev(app);
  register(app);
  login(app);
  return app;
};
