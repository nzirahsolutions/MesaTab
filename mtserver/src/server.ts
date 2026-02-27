import express from 'express';
import cors from 'cors';
import { corsOptions } from './config/cors';
import userRoutes from './routes/users.route';
import eventRoutes from './routes/events.route';
import sbRoutes from './routes/spelling/sb.tab.route';

const app = express();

//middleware
app.use(cors(corsOptions));
app.use(express.json()); //parses JSON request bodies
app.use(express.urlencoded({extended: false})); //parses form data (like HTML forms)

//routes
app.use('/user',userRoutes);
app.use('/event',eventRoutes);
app.use('/sb',sbRoutes);

//run server
app.listen(process.env.PORT ?? 3500, () => {
  console.log('Server running');
});
