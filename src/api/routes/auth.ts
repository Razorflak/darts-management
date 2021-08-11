// const route = Router();
// export default (app: Router) => {

// 	//Initialisation des instance de controleur
// 	var ctrlUser: UserCtrl = new UserCtrl();
// 	var ctrlAuth: AuthCtrl = new AuthCtrl();

// 	app.use('/auth', route);

// 	route.post("/register",(req: Request, res: Response) => {

// 		const userPromise = ctrlUser.register(req.body);
// 		userPromise.then(newUser =>{
// 			return res.status(200).json(newUser);
// 		}).catch (err =>{
// 			return res.status(err.httpCodeError).json(err.message);
// 		});
// 	});

// 	route.post("/login", async (req: Request, res: Response) => {
// 		try {

// 			const {user, token} = await ctrlUser.login(req.body as IUser);
// 			return res.status(200).json({
// 				user: user,
// 				token: token
// 			})
// 		} catch (error) {
// 			return res.status(error.httpCodeError).json(error.message);
// 		}

// 		/*loginPromise.then(token =>{
// 			return res.status(200).json(token);
// 		}).catch(error => {
// 			return res.status(500).json(error.message);
// 		})*/
// 	});

// 	route.get('/isSessionValid', async(req, res) => {
// 		// TODO:m peut être interessant de déplacer tout ça pour le réutiliser.
// 		var headerAuth:String = req.get('authorization');
// 		const token = (headerAuth != null ) ? headerAuth.replace('Bearer ', '') : null;
// 		if(!token){
// 			throw new Error ("Missing TOKEN !");
// 		};
// 		//Validation du TOKEN
// 		var jwtToken = jwt.verify(token, config.jwtSecret);
// 		if (jwtToken){
// 			res.status(HttpStatus.OK).send({token: token, userId: jwtToken["userId"]});
// 			//TODO si le token est valid, sans doute bien de le prolongé d'une certaine durée
// 		}else{
// 			throw new Error ("TOKEN invalid");
// 		}
// 	})

// 	/*app.get("/profil",async(req: Request, res: Response) => {
// 		try {
// 			const userProfil:User = await ctrlUser.getProfil(req);
// 			return res.status(200).json(userProfil);
// 		} catch (error) {
// 			return res.status(500).json(error.message);
// 		}
// 	});*/

// }
