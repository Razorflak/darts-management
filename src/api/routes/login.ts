import { Router } from 'express';
import UserService from 'services/userService';

const route = Router();
export default (app: Router) => {
  app.use('/login', route);

  route.post('/', async (req, res) => {
    try {
      const result = await UserService.loginUser(req.body);
      res.send(result);
    } catch (error) {
      res.status(500).send({ message: error.message, error: error });
    }
  });
};
