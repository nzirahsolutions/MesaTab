import express from 'express';
import cors from 'cors';
import { corsOptions } from './config/cors';
import userRoutes from './routes/users.route';
import eventRoutes from './routes/events.route';
import sbTabRoutes from './routes/spelling/sb.tab.route';
import sbDrawRoutes from './routes/spelling/sb.draw.route';
import sbResultRoutes from './routes/spelling/sb.result.route';

const app = express();

//middleware
app.use(cors(corsOptions));
app.use(express.json()); //parses JSON request bodies
app.use(express.urlencoded({extended: false})); //parses form data (like HTML forms)

//routes
app.use('/user',userRoutes);
app.use('/event',eventRoutes);
/*Spelling Bee */
app.use('/sb',sbTabRoutes);
app.use('/sb/draw',sbDrawRoutes);
app.use('/sb/result',sbResultRoutes);

//run server
app.listen(process.env.PORT ?? 3500, () => {
  console.log('Server running');
});
