import express from 'express';
import cors from 'cors';
import { corsOptions } from './config/cors'; 

const app = express();

//middleware
app.use(cors(corsOptions));
app.use(express.json()); //parses JSON request bodies
app.use(express.urlencoded({extended: false})); //parses form data (liek HTML forms)

//routes


//run server
app.listen(process.env.PORT ?? 3500, () => {
  console.log('Server running');
});
