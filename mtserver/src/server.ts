import express from 'express';
import cors from 'cors';
import { corsOptions } from './config/cors';
import userRoutes from './routes/users.route';
import eventRoutes from './routes/events.route';
import sbTabRoutes from './routes/spelling/sb.tab.route';
import sbDrawRoutes from './routes/spelling/sb.draw.route';
import sbResultRoutes from './routes/spelling/sb.result.route';
import psTabRoutes from './routes/publicSpeaking/ps.tab.route';
import psDrawRoutes from './routes/publicSpeaking/ps.draw.route';
import psResultRoutes from './routes/publicSpeaking/ps.result.route';

const app = express();

//middleware
app.use(cors(corsOptions));
app.use(express.json()); //parses JSON request bodies
app.use(express.urlencoded({extended: false})); //parses form data (like HTML forms)

app.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'mtserver' });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

//routes
app.use('/user',userRoutes);
app.use('/event',eventRoutes);
/*Spelling Bee */
app.use('/sb',sbTabRoutes);
app.use('/sb/draw',sbDrawRoutes);
app.use('/sb/result',sbResultRoutes);
// Public Speaking
app.use('/ps', psTabRoutes);
app.use('/ps/draw', psDrawRoutes);
app.use('/ps/result', psResultRoutes);

//run server
app.listen(process.env.PORT ?? 3500, () => {
  console.log('Server running');
});
