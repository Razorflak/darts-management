import dev from '@apiRoutes/routes/dev';
import { Router } from 'express';

export default () => {
  const app = Router();
  dev(app);
  return app;
};
