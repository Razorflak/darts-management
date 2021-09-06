import { Router } from 'express';
import UserService from 'services/userService';

const route = Router();
export default (app: Router) => {
  app.use('/register', route);

  route.put('/', async (req, res) => {
    try {
      const result = await UserService.createUser(req.body);
      res.send(result);
    } catch (error) {
      console.log(error);
      console.log(new Error('TOTOJTA'));
      res.status(500).send(error);
    }
  });
};
