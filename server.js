const Database = require("./database");
const fs=require('fs');
const bcrypt = require('bcrypt')
const express = require('express');
const passport = require("passport");
const { Strategy: LocalStrategy } = require("passport-local");;
const { Server: SocketServer} = require('socket.io');
const { Server: HttpServer} = require('http');
const yargsParse = require('yargs');

const fork = require('child_process')
const messages = require("./messages.json");
const db = new Database;
const path = require("path");
const {MongoConnection} = require("./MongoDB/mongoConnection");
MongoConnection();
const MockContenedor =require('./src/mocks/MockContenedor');
const UsersContenedor =require('./src/contenedores/UserContenedorMongo');

const Users = new UsersContenedor;
const {normalize, denormalize, schema} = require("normalizr");
const {inspect} =require('util');
require('dotenv').config()
//const PORT = 8080;
const LOGIN_URL = process.env.LOGIN_URL


const session = require('express-session');
const MongoStore = require('connect-mongo');

const advancedOptions = { useNewUrlParser: true, useUnifiedTopology: true };

const mockContenedor = new MockContenedor;

const MensajesArchivo = require('./src/contenedores/MessageContenedorArchivo');

const mensajesArchivo = new MensajesArchivo;

const MessageContenedorSqlite = require('./src/contenedores/MessageContenedorSqlite');

const messageSqlite = new MessageContenedorSqlite('mensajes');


const Mensajes = require('./src/contenedores/MessageContenedorMongo');

const messageMongo = new Mensajes;

//const productRouter = require('./src/routers/products');
const productMockRouter = require('./src/routers/productsMocks');
const randomsRouter = require('./src/routers/randoms');

const yargs = require("yargs");



/* ------------------ PASSPORT -------------------- */

passport.use(
  "register",
  new LocalStrategy(
    {
      passReqToCallback: true,
    },
    async (req, username, password, done) => {

      const usuario = await Users.find(username); 
      if ( usuario) {
  
        return done(null, false);
      }

      password= bcrypt.hashSync(password, bcrypt.genSaltSync(10,null));

      const user = {
        username,
        password
      };
      Users.save(user);

      return done(null, user);
    }
  )
);

passport.use(
  "login",
  new LocalStrategy(async (username, password, done) => {
    const user = await  Users.find(username);
    
    if (!user) {

      return done(null, false);
      
    }

    

    if (!bcrypt.compareSync(password,user.password)) {
      
      return done(null, false);
     
    }

    return done(null, user);
  })
);

passport.serializeUser(function (user, done) {
  done(null, user.username);
});

passport.deserializeUser(async function (username, done) {
  const usuario = await Users.find(username);
  done(null, usuario.username);
});


const app = express();



app.use(express.urlencoded({ extended: true }));
app.use(express.json());


const httpServer = new HttpServer(app);

const io = new SocketServer(httpServer);



//app.use(express.static('public'))

//app.use('/api/products', productRouter);

//app.use('/api/productos-test', productMockRouter);
//app.use('/api/productos-tests', express.static(path.join(__dirname, 'public/test.html')));

//app.use('/api/productos-testss', express.static(path.join(__dirname, 'public/test.html')));

app.use('/api/randoms', randomsRouter);

io.on('connection',  async (socket) => {
    console.log("socket id: ", socket.id);

    socket.emit('products', db.getAll());

    socket.emit('productsMock', mockContenedor.products() );


    const database =  await mensajesArchivo.getAll()

    const authorSchema = new schema.Entity("authors", { idAttribute: (value) => value.id});
    //const valueSchema = new schema.Values(authorSchema)
    /*const textSchema = new schema.Entity("texts");

    const messagesSchema = new schema.Entity("messages", {
        author: authorSchema,
        text: textSchema,
       
      }
      
      ,
      );*/

    function print(objeto) {
        console.log("resultado normalizado",inspect(objeto, false, 12, true))
      }
    
    
    const normalizedMessages = normalize(database, [authorSchema]);
    //print(normalizedMessages)
    const denormalizedMessages = denormalize(normalizedMessages.result, [authorSchema], normalizedMessages.entities);
    //print(denormalizedMessages)

    const arrayNormalizado = Object.values(normalizedMessages.entities.authors)

    //console.log("array", arrayNormalizado )
    const longO = JSON.stringify(database).length;


    //console.log("Longitud objeto original: ", longO);

    const longN = JSON.stringify(normalizedMessages).length;
    //console.log("Longitud objeto normalizado: ", longN);

    const longD = JSON.stringify(denormalizedMessages).length;
    //console.log("Longitud objeto desnormalizado: ", longD);

    const porcentajeC = `${((longN * 100) / longO).toFixed(2)} %`
    //console.log("Porcentaje de compresión: ", porcentajeC);
    
    socket.emit('conversation', arrayNormalizado);

    socket.emit('compresion',porcentajeC);

    socket.on('new-message', (newMessage)=> {
        console.log({newMessage});
        mensajesArchivo.post(newMessage)
        console.log("mensajes nuevos",   arrayNormalizado)
        io.sockets.emit('conversation', arrayNormalizado);
       

    });

  

    
});


app.set('view engine', 'ejs');



app.use(
  session({

    store: new MongoStore({
      mongoUrl: LOGIN_URL,
      ttl: 6000,
    }),

    secret: "shhhhhhhhhhhhhhhhhhhhh",
    resave: false,
    saveUninitialized: true  ,

  })
);


app.use(passport.initialize());
app.use(passport.session());

/* --------------------- AUTH --------------------------- */


// REGISTER

app.get("/register", (req, res) => {
  res.render('pages/register');
});

app.post(
  "/register",
  passport.authenticate("register", {
    failureRedirect: "/failregister",
    successRedirect: "/login",
  })
);

// FAIL

app.get("/failregister", (req, res) => {
  res.render('pages/failregister');
});

app.get("/faillogin", (req, res) => {
  res.render('pages/faillogin');
});

// BACK

app.post("/backRegister", (req,res) => {
  res.redirect('/register')
})

app.post("/backLogin", (req,res) => {
  res.redirect('/login')
})

// LOGIN

app.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    res.render('pages/index', {usuario: req.user});
} else {
  res.render('pages/login');
}
});


app.post('/login',
  passport.authenticate("login", {
    failureRedirect: "/faillogin",
    successRedirect: "/login",
  })
);

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (!err)  res.render('pages/logOut', {usuario:req.user});    
    else console.log({ status: "Logout ERROR", body: err });
  });
});



app.post('/', (req, res) => {
  console.log(req.body);
  db.save(req.body);
  
  io.sockets.emit('products', db.getAll())

  res.redirect('/');
});


app.get('/productos', (req, res) => {
    res.json(db.getAll());
});




const parsedArgs = yargsParse(process.argv.slice(2))
  .default({
    debug: false,
    PORT: 8080,
  })
  .alias({
    p: "PORT",
    
  })
  .boolean("debug").argv;

console.log(parsedArgs)

app.get('/info', (req,res) => {
    
  res.json(
    {
      "Puerto": parsedArgs.p,
      "Sistema operativo": process.platform,
      "Versión de NodeJs": process.version,
      "Memoria total reservada (rss)": process.memoryUsage().rss,
      "Path de ejecución": process.execPath,
      "Process id": process.pid,
      "Carpeta del proyecto": process.cwd(),

    })
})



const connectedServer = httpServer.listen(parsedArgs.p, () => {
    console.log(`Servidor Http con Websockets escuchando en el puerto ${parsedArgs.p}`)
  })
  connectedServer.on('error', error => console.log(`Error en servidor ${error}`))
  

