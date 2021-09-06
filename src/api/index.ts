import dev from '@apiRoutes/routes/dev';
import register from '@apiRoutes/routes/register';
import { Router } from 'express';

export default () => {
  const app = Router();
  dev(app);
  register(app);
  return app;
};
