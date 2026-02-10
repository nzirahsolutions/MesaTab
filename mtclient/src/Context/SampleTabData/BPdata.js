export const BPData = {
  title: 'Enclave Opens',
  slug:'enclave-opens',
  tabID: 1,
  eventID:5,
  track: 'BP',
  configuration: {
    prelimRounds: 3,
    eliminationRounds: ['Semifinal','Final'],
    teamSize: 3,
    benchesPerDebate: 4, // GOV1, GOV2, OPP1, OPP2
  },

  teams: [
    // 40 teams (two swings at the end)
    { teamID: 1, name: 'Greenwood A', school: 'Greenwood High', members: ['Alice J.','Ben C.','Cara L.'] },
    { teamID: 2, name: 'Lakeside A', school: 'Lakeside Academy', members: ['Bob M.','Cody N.','Dana R.'] },
    { teamID: 3, name: 'Hilltop A', school: 'Hilltop School', members: ['Charlie S.','Evan P.','Fiona B.'] },
    { teamID: 4, name: 'Riverside A', school: 'Riverside Prep', members: ['Diana C.','George Y.','Hannah W.'] },
    { teamID: 5, name: 'Maple A', school: 'Maple Leaf School', members: ['Ethan W.','Ivy Z.','James O.'] },
    { teamID: 6, name: 'Greenwood B', school: 'Greenwood High', members: ['Kara B.','Liam F.','Maya P.'] },
    { teamID: 7, name: 'Lakeside B', school: 'Lakeside Academy', members: ['Noah K.','Olivia H.','Paul S.'] },
    { teamID: 8, name: 'Hilltop B', school: 'Hilltop School', members: ['Quinn B.','Rosa P.','Samir K.'] },
    { teamID: 9, name: 'Riverside B', school: 'Riverside Prep', members: ['Tina C.','Uma P.','Vikram R.'] },
    { teamID: 10, name: 'Maple B', school: 'Maple Leaf School', members: ['Wendy T.','Xavier P.','Yvonne C.'] },
    { teamID: 11, name: 'Greenwood C', school: 'Greenwood High', members: ['Zach P.','Aaron B.','Bella C.'] },
    { teamID: 12, name: 'Lakeside C', school: 'Lakeside Academy', members: ['Caleb R.','Daisy M.','Eli B.'] },
    { teamID: 13, name: 'Hilltop C', school: 'Hilltop School', members: ['Faisal A.','Gina T.','Hector R.'] },
    { teamID: 14, name: 'Riverside C', school: 'Riverside Prep', members: ['Ibrahim D.','Jade L.','Kofi M.'] },
    { teamID: 15, name: 'Maple C', school: 'Maple Leaf School', members: ['Lana C.','Mason R.','Nora W.'] },
    { teamID: 16, name: 'Greenwood D', school: 'Greenwood High', members: ['Owen P.','Pia R.','Quentin G.'] },
    { teamID: 17, name: 'Lakeside D', school: 'Lakeside Academy', members: ['Riley F.','Sana I.','Tariq M.'] },
    { teamID: 18, name: 'Hilltop D', school: 'Hilltop School', members: ['Umar K.','Vera L.','Will G.'] },
    { teamID: 19, name: 'Riverside D', school: 'Riverside Prep', members: ['Ximena C.','Yusuf I.','Zara K.'] },
    { teamID: 20, name: 'Maple D', school: 'Maple Leaf School', members: ['Amir R.','Bea S.','Carl J.'] },
    { teamID: 21, name: 'Greenwood E', school: 'Greenwood High', members: ['Dana V.','Evan R.','Felicity D.'] },
    { teamID: 22, name: 'Lakeside E', school: 'Lakeside Academy', members: ['Galen P.','Hana M.','Ian S.'] },
    { teamID: 23, name: 'Hilltop E', school: 'Hilltop School', members: ['Jamal B.','Kira N.','Leo P.'] },
    { teamID: 24, name: 'Riverside E', school: 'Riverside Prep', members: ['Mira S.','Nikhil R.','Oona B.'] },
    { teamID: 25, name: 'Maple E', school: 'Maple Leaf School', members: ['Parker H.','Queenie M.','Rafa S.'] },
    { teamID: 26, name: 'Greenwood F', school: 'Greenwood High', members: ['Sofia D.','Theo W.','Una B.'] },
    { teamID: 27, name: 'Lakeside F', school: 'Lakeside Academy', members: ['Vance C.','Willa S.','Xander H.'] },
    { teamID: 28, name: 'Hilltop F', school: 'Hilltop School', members: ['Yara A.','Zane L.','Asha N.'] },
    { teamID: 29, name: 'Riverside F', school: 'Riverside Prep', members: ['Brett L.','Celia F.','Damon Y.'] },
    { teamID: 30, name: 'Maple F', school: 'Maple Leaf School', members: ['Elena P.','Finn O.','Gordon M.'] },
    { teamID: 31, name: 'Greenwood G', school: 'Greenwood High', members: ['Holly W.','Imran S.','Juno K.'] },
    { teamID: 32, name: 'Lakeside G', school: 'Lakeside Academy', members: ['Kaden R.','Lara B.','Mira H.'] },
    { teamID: 33, name: 'Hilltop G', school: 'Hilltop School', members: ['Nate L.','Orla F.','Peyton C.'] },
    { teamID: 34, name: 'Riverside G', school: 'Riverside Prep', members: ['Quincy S.','Rhea K.','Sven O.'] },
    { teamID: 35, name: 'Maple G', school: 'Maple Leaf School', members: ['Tess M.','Umar F.','Violet K.'] },
    { teamID: 36, name: 'Greenwood H', school: 'Greenwood High', members: ['Wen Z.','Xia L.','Yara M.'] },
    { teamID: 37, name: 'Lakeside H', school: 'Lakeside Academy', members: ['Zion P.','Aaliyah K.','Benito R.'] },
    { teamID: 38, name: 'Hilltop H', school: 'Hilltop School', members: ['Carmen L.','Dexter S.','Elio R.'] },
    { teamID: 39, name: 'Swing Team 1', school: 'Swing', swing: true, members: ['Swing A','Swing B','Swing C'] },
    { teamID: 40, name: 'Swing Team 2', school: 'Swing', swing: true, members: ['Swing D','Swing E','Swing F'] },
  ],
  
  schools: [
    'Greenwood High',
    'Lakeside Academy',
    'Hilltop School',
    'Riverside Prep',
    'Maple Leaf School',
    'Swing'
  ],

  participants: [
    // flattened list of individual speakers with team link
    // participantID increments across all teams (3 per team)
    // format: { participantID, name, teamID }
    { participantID: 1, name: 'Alice J.', teamID: 1 },
    { participantID: 2, name: 'Ben C.', teamID: 1 },
    { participantID: 3, name: 'Cara L.', teamID: 1 },
    { participantID: 4, name: 'Bob M.', teamID: 2 },
    { participantID: 5, name: 'Cody N.', teamID: 2 },
    { participantID: 6, name: 'Dana R.', teamID: 2 },
    { participantID: 7, name: 'Charlie S.', teamID: 3 },
    { participantID: 8, name: 'Evan P.', teamID: 3 },
    { participantID: 9, name: 'Fiona B.', teamID: 3 },
    { participantID: 10, name: 'Diana C.', teamID: 4 },
    { participantID: 11, name: 'George Y.', teamID: 4 },
    { participantID: 12, name: 'Hannah W.', teamID: 4 },
    { participantID: 13, name: 'Ethan W.', teamID: 5 },
    { participantID: 14, name: 'Ivy Z.', teamID: 5 },
    { participantID: 15, name: 'James O.', teamID: 5 },
    { participantID: 16, name: 'Kara B.', teamID: 6 },
    { participantID: 17, name: 'Liam F.', teamID: 6 },
    { participantID: 18, name: 'Maya P.', teamID: 6 },
    { participantID: 19, name: 'Noah K.', teamID: 7 },
    { participantID: 20, name: 'Olivia H.', teamID: 7 },
    { participantID: 21, name: 'Paul S.', teamID: 7 },
    { participantID: 22, name: 'Quinn B.', teamID: 8 },
    { participantID: 23, name: 'Rosa P.', teamID: 8 },
    { participantID: 24, name: 'Samir K.', teamID: 8 },
    { participantID: 25, name: 'Tina C.', teamID: 9 },
    { participantID: 26, name: 'Uma P.', teamID: 9 },
    { participantID: 27, name: 'Vikram R.', teamID: 9 },
    { participantID: 28, name: 'Wendy T.', teamID: 10 },
    { participantID: 29, name: 'Xavier P.', teamID: 10 },
    { participantID: 30, name: 'Yvonne C.', teamID: 10 },
    // note: remaining participants omitted here for brevity; add full list if needed
  ],

  adjudicators: [
    { adjID: 1, name: 'Chair - Morgan Lee' },
    { adjID: 2, name: 'Nadia Cruz' },
    { adjID: 3, name: 'Oliver Reed' },
    { adjID: 4, name: 'Priya Nair' },
    { adjID: 5, name: 'Quentin Shaw' },
    { adjID: 6, name: 'Rosa Medina' },
    { adjID: 7, name: 'Sam Torres' },
    { adjID: 8, name: 'Tara O"Neil' },
    { adjID: 9, name: 'Umar Ali' },
    { adjID: 10, name: 'Vanessa Kim' },
  ],

  rooms: Array.from({ length: 10 }, (_, i) => ({ roomID: i + 1, name: `Hall ${i + 1}` })),

  rounds: [
    // Prelim 1: 10 debates with 4 teams each
    {
      roundID: 1,
      name: 'Prelim 1',
      pairings: Array.from({ length: 10 }, (_, i) => ({
        roomID: i + 1,
        gov1: i * 4 + 1,
        gov2: i * 4 + 2,
        opp1: i * 4 + 3,
        opp2: i * 4 + 4,
        adjudicators: [((i % 10) + 1)],
      })),
      results: [
        // for each room: positions 1..4 with teamID and points (3,2,1,0) + speakerPoints (3 speakers)
        { roomID: 1, rankings: [ { teamID: 1, place: 1, points: 3, speakerPoints: [28,27,27] }, { teamID: 2, place: 2, points: 2, speakerPoints: [26,26,25] }, { teamID: 3, place: 3, points: 1, speakerPoints: [24,24,24] }, { teamID: 4, place: 4, points: 0, speakerPoints: [22,22,23] } ] },
        { roomID: 2, rankings: [ { teamID: 5, place: 1, points: 3, speakerPoints: [27,26,26] }, { teamID: 6, place: 2, points: 2, speakerPoints: [25,25,24] }, { teamID: 7, place: 3, points: 1, speakerPoints: [24,23,23] }, { teamID: 8, place: 4, points: 0, speakerPoints: [22,22,21] } ] },
        { roomID: 3, rankings: [ { teamID: 9, place: 1, points: 3, speakerPoints: [27,27,26] }, { teamID: 10, place: 2, points: 2, speakerPoints: [26,25,25] }, { teamID: 11, place: 3, points: 1, speakerPoints: [24,24,23] }, { teamID: 12, place: 4, points: 0, speakerPoints: [22,22,22] } ] },
        { roomID: 4, rankings: [ { teamID: 13, place: 1, points: 3, speakerPoints: [26,26,25] }, { teamID: 14, place: 2, points: 2, speakerPoints: [25,25,24] }, { teamID: 15, place: 3, points: 1, speakerPoints: [24,23,23] }, { teamID: 16, place: 4, points: 0, speakerPoints: [22,22,21] } ] },
        { roomID: 5, rankings: [ { teamID: 17, place: 1, points: 3, speakerPoints: [26,25,25] }, { teamID: 18, place: 2, points: 2, speakerPoints: [25,24,24] }, { teamID: 19, place: 3, points: 1, speakerPoints: [23,23,24] }, { teamID: 20, place: 4, points: 0, speakerPoints: [21,22,22] } ] },
        { roomID: 6, rankings: [ { teamID: 21, place: 1, points: 3, speakerPoints: [26,25,24] }, { teamID: 22, place: 2, points: 2, speakerPoints: [25,24,24] }, { teamID: 23, place: 3, points: 1, speakerPoints: [24,23,23] }, { teamID: 24, place: 4, points: 0, speakerPoints: [22,22,21] } ] },
        { roomID: 7, rankings: [ { teamID: 25, place: 1, points: 3, speakerPoints: [27,26,25] }, { teamID: 26, place: 2, points: 2, speakerPoints: [25,25,24] }, { teamID: 27, place: 3, points: 1, speakerPoints: [24,24,24] }, { teamID: 28, place: 4, points: 0, speakerPoints: [22,21,22] } ] },
        { roomID: 8, rankings: [ { teamID: 29, place: 1, points: 3, speakerPoints: [26,26,25] }, { teamID: 30, place: 2, points: 2, speakerPoints: [25,24,24] }, { teamID: 31, place: 3, points: 1, speakerPoints: [24,23,23] }, { teamID: 32, place: 4, points: 0, speakerPoints: [22,22,21] } ] },
        { roomID: 9, rankings: [ { teamID: 33, place: 1, points: 3, speakerPoints: [26,25,25] }, { teamID: 34, place: 2, points: 2, speakerPoints: [25,25,24] }, { teamID: 35, place: 3, points: 1, speakerPoints: [24,23,23] }, { teamID: 36, place: 4, points: 0, speakerPoints: [22,22,21] } ] },
        { roomID: 10, rankings: [ { teamID: 37, place: 1, points: 3, speakerPoints: [26,26,24] }, { teamID: 38, place: 2, points: 2, speakerPoints: [25,25,23] }, { teamID: 39, place: 3, points: 1, speakerPoints: [24,23,23] }, { teamID: 40, place: 4, points: 0, speakerPoints: [22,22,22] } ] },
      ],
    },

    // Prelim 2 - reshuffle benches to different opponents
    {
      roundID: 2,
      name: 'Prelim 2',
      pairings: [
        { roomID: 1, gov1: 1, gov2: 5, opp1: 9, opp2: 13, adjudicators: [1] },
        { roomID: 2, gov1: 2, gov2: 6, opp1: 10, opp2: 14, adjudicators: [2] },
        { roomID: 3, gov1: 3, gov2: 7, opp1: 11, opp2: 15, adjudicators: [3] },
        { roomID: 4, gov1: 4, gov2: 8, opp1: 12, opp2: 16, adjudicators: [4] },
        { roomID: 5, gov1: 17, gov2: 21, opp1: 25, opp2: 29, adjudicators: [5] },
        { roomID: 6, gov1: 18, gov2: 22, opp1: 26, opp2: 30, adjudicators: [6] },
        { roomID: 7, gov1: 19, gov2: 23, opp1: 27, opp2: 31, adjudicators: [7] },
        { roomID: 8, gov1: 20, gov2: 24, opp1: 28, opp2: 32, adjudicators: [8] },
        { roomID: 9, gov1: 33, gov2: 37, opp1: 34, opp2: 38, adjudicators: [9] },
        { roomID: 10, gov1: 35, gov2: 39, opp1: 36, opp2: 40, adjudicators: [10] },
      ],
      results: [
        { roomID:1, rankings: [ { teamID:1, place:1, points:3, speakerPoints:[28,27,27] }, { teamID:5, place:2, points:2, speakerPoints:[26,26,25] }, { teamID:9, place:3, points:1, speakerPoints:[24,24,24] }, { teamID:13, place:4, points:0, speakerPoints:[22,22,23] } ] },
        { roomID:2, rankings: [ { teamID:6, place:1, points:3, speakerPoints:[27,26,26] }, { teamID:2, place:2, points:2, speakerPoints:[26,25,24] }, { teamID:10, place:3, points:1, speakerPoints:[24,23,23] }, { teamID:14, place:4, points:0, speakerPoints:[22,22,21] } ] },
        { roomID:3, rankings: [ { teamID:3, place:1, points:3, speakerPoints:[27,27,26] }, { teamID:11, place:2, points:2, speakerPoints:[26,25,25] }, { teamID:7, place:3, points:1, speakerPoints:[24,24,23] }, { teamID:15, place:4, points:0, speakerPoints:[22,22,22] } ] },
        { roomID:4, rankings: [ { teamID:12, place:1, points:3, speakerPoints:[26,26,25] }, { teamID:4, place:2, points:2, speakerPoints:[25,25,24] }, { teamID:8, place:3, points:1, speakerPoints:[24,23,23] }, { teamID:16, place:4, points:0, speakerPoints:[22,22,21] } ] },
        { roomID:5, rankings: [ { teamID:17, place:1, points:3, speakerPoints:[26,25,25] }, { teamID:25, place:2, points:2, speakerPoints:[25,24,24] }, { teamID:21, place:3, points:1, speakerPoints:[24,23,23] }, { teamID:29, place:4, points:0, speakerPoints:[22,22,21] } ] },
        { roomID:6, rankings: [ { teamID:18, place:1, points:3, speakerPoints:[27,26,25] }, { teamID:26, place:2, points:2, speakerPoints:[25,25,24] }, { teamID:22, place:3, points:1, speakerPoints:[24,24,24] }, { teamID:30, place:4, points:0, speakerPoints:[22,21,22] } ] },
        { roomID:7, rankings: [ { teamID:19, place:1, points:3, speakerPoints:[26,26,25] }, { teamID:27, place:2, points:2, speakerPoints:[25,25,24] }, { teamID:23, place:3, points:1, speakerPoints:[24,24,23] }, { teamID:31, place:4, points:0, speakerPoints:[22,22,21] } ] },
        { roomID:8, rankings: [ { teamID:20, place:1, points:3, speakerPoints:[26,25,25] }, { teamID:28, place:2, points:2, speakerPoints:[25,24,24] }, { teamID:24, place:3, points:1, speakerPoints:[24,23,23] }, { teamID:32, place:4, points:0, speakerPoints:[22,22,21] } ] },
        { roomID:9, rankings: [ { teamID:33, place:1, points:3, speakerPoints:[26,25,25] }, { teamID:34, place:2, points:2, speakerPoints:[25,25,24] }, { teamID:37, place:3, points:1, speakerPoints:[24,24,23] }, { teamID:38, place:4, points:0, speakerPoints:[22,22,21] } ] },
        { roomID:10, rankings: [ { teamID:35, place:1, points:3, speakerPoints:[26,26,24] }, { teamID:36, place:2, points:2, speakerPoints:[25,25,23] }, { teamID:39, place:3, points:1, speakerPoints:[24,23,23] }, { teamID:40, place:4, points:0, speakerPoints:[22,22,22] } ] },
      ],
    },

    // Prelim 3
    {
      roundID: 3,
      name: 'Prelim 3',
      pairings: [
        { roomID:1, gov1:1, gov2:6, opp1:11, opp2:16, adjudicators:[1] },
        { roomID:2, gov1:2, gov2:5, opp1:10, opp2:15, adjudicators:[2] },
        { roomID:3, gov1:3, gov2:4, opp1:9, opp2:8, adjudicators:[3] },
        { roomID:4, gov1:7, gov2:12, opp1:13, opp2:14, adjudicators:[4] },
        { roomID:5, gov1:17, gov2:22, opp1:21, opp2:26, adjudicators:[5] },
        { roomID:6, gov1:18, gov2:25, opp1:24, opp2:29, adjudicators:[6] },
        { roomID:7, gov1:19, gov2:30, opp1:27, opp2:28, adjudicators:[7] },
        { roomID:8, gov1:20, gov2:31, opp1:32, opp2:33, adjudicators:[8] },
        { roomID:9, gov1:34, gov2:35, opp1:36, opp2:37, adjudicators:[9] },
        { roomID:10, gov1:38, gov2:39, opp1:40, opp2:4, adjudicators:[10] },
      ],
      results: [
        { roomID:1, rankings:[ { teamID:1, place:1, points:3, speakerPoints:[28,27,27] }, { teamID:6, place:2, points:2, speakerPoints:[26,26,25] }, { teamID:11, place:3, points:1, speakerPoints:[24,24,24] }, { teamID:16, place:4, points:0, speakerPoints:[22,22,21] } ] },
        { roomID:2, rankings:[ { teamID:5, place:1, points:3, speakerPoints:[27,26,26] }, { teamID:2, place:2, points:2, speakerPoints:[26,25,25] }, { teamID:10, place:3, points:1, speakerPoints:[24,24,23] }, { teamID:15, place:4, points:0, speakerPoints:[22,22,21] } ] },
        { roomID:3, rankings:[ { teamID:3, place:1, points:3, speakerPoints:[27,27,26] }, { teamID:4, place:2, points:2, speakerPoints:[26,25,25] }, { teamID:9, place:3, points:1, speakerPoints:[24,24,24] }, { teamID:8, place:4, points:0, speakerPoints:[22,22,21] } ] },
        { roomID:4, rankings:[ { teamID:12, place:1, points:3, speakerPoints:[26,26,25] }, { teamID:7, place:2, points:2, speakerPoints:[25,25,24] }, { teamID:13, place:3, points:1, speakerPoints:[24,23,23] }, { teamID:14, place:4, points:0, speakerPoints:[22,22,21] } ] },
        { roomID:5, rankings:[ { teamID:17, place:1, points:3, speakerPoints:[26,25,25] }, { teamID:22, place:2, points:2, speakerPoints:[25,24,24] }, { teamID:21, place:3, points:1, speakerPoints:[24,23,23] }, { teamID:26, place:4, points:0, speakerPoints:[22,22,21] } ] },
        { roomID:6, rankings:[ { teamID:18, place:1, points:3, speakerPoints:[27,26,25] }, { teamID:25, place:2, points:2, speakerPoints:[25,25,24] }, { teamID:24, place:3, points:1, speakerPoints:[24,24,24] }, { teamID:29, place:4, points:0, speakerPoints:[22,21,22] } ] },
        { roomID:7, rankings:[ { teamID:19, place:1, points:3, speakerPoints:[26,26,25] }, { teamID:30, place:2, points:2, speakerPoints:[25,25,24] }, { teamID:27, place:3, points:1, speakerPoints:[24,24,23] }, { teamID:28, place:4, points:0, speakerPoints:[22,22,21] } ] },
        { roomID:8, rankings:[ { teamID:20, place:1, points:3, speakerPoints:[26,25,25] }, { teamID:31, place:2, points:2, speakerPoints:[25,24,24] }, { teamID:32, place:3, points:1, speakerPoints:[24,23,23] }, { teamID:33, place:4, points:0, speakerPoints:[22,22,21] } ] },
        { roomID:9, rankings:[ { teamID:34, place:1, points:3, speakerPoints:[26,25,25] }, { teamID:35, place:2, points:2, speakerPoints:[25,25,24] }, { teamID:36, place:3, points:1, speakerPoints:[24,24,23] }, { teamID:37, place:4, points:0, speakerPoints:[22,22,21] } ] },
        { roomID:10, rankings:[ { teamID:38, place:1, points:3, speakerPoints:[26,26,24] }, { teamID:39, place:2, points:2, speakerPoints:[25,25,23] }, { teamID:40, place:3, points:1, speakerPoints:[24,23,23] }, { teamID:4, place:4, points:0, speakerPoints:[22,22,22] } ] },
      ],
    },

    // Semifinal - top 4 teams (by points + speaker points)
    {
      roundID: 4,
      name: 'Semifinal',
      pairings: [
        { roomID: 1, gov1: 1, gov2: 5, opp1: 3, opp2: 9, adjudicators: [1,2,3] },
      ],
      results: [
        { roomID:1, rankings: [ { teamID:1, place:1, points:3, speakerPoints:[29,28,28] }, { teamID:3, place:2, points:2, speakerPoints:[27,26,27] }, { teamID:5, place:3, points:1, speakerPoints:[26,25,25] }, { teamID:9, place:4, points:0, speakerPoints:[24,24,24] } ] },
      ],
    },

    // Final
    {
      roundID: 5,
      name: 'Final',
      pairings: [
        { roomID:1, gov1:1, gov2:3, opp1:5, opp2:7, adjudicators: [1,2,3,4,5] },
      ],
      results: [
        { roomID:1, rankings: [ { teamID:1, place:1, points:3, speakerPoints:[29,29,28] }, { teamID:3, place:2, points:2, speakerPoints:[27,27,27] }, { teamID:5, place:3, points:1, speakerPoints:[26,25,25] }, { teamID:7, place:4, points:0, speakerPoints:[24,24,23] } ] },
      ],
    },
  ],

  individualStandings: [
    // per-speaker preliminary totals (placeholders or to be computed from rounds)
    // format: { participantID, name, teamID, prelimTotalSpeakerPoints, prelimRounds: number }
    { participantID: 1, name: 'Alice J.', teamID: 1, prelimTotalSpeakerPoints: 0, prelimRounds: 3 },
    { participantID: 2, name: 'Ben C.', teamID: 1, prelimTotalSpeakerPoints: 0, prelimRounds: 3 },
    { participantID: 3, name: 'Cara L.', teamID: 1, prelimTotalSpeakerPoints: 0, prelimRounds: 3 },
    { participantID: 4, name: 'Bob M.', teamID: 2, prelimTotalSpeakerPoints: 0, prelimRounds: 3 },
    { participantID: 5, name: 'Cody N.', teamID: 2, prelimTotalSpeakerPoints: 0, prelimRounds: 3 },
    { participantID: 6, name: 'Dana R.', teamID: 2, prelimTotalSpeakerPoints: 0, prelimRounds: 3 },
    // add remaining participants' individual standings as needed
  ],

  standings: [
    // summarized after prelims + elimination
    { rank: 1, teamID: 1, name: 'Greenwood A', points: 9, speakerPointsTotal: 535, placement: 'Champion' },
    { rank: 2, teamID: 3, name: 'Hilltop A', points: 8, speakerPointsTotal: 510, placement: 'Runner-up' },
    { rank: 3, teamID: 5, name: 'Maple A', points: 7, speakerPointsTotal: 505, placement: 'Finalist' },
    { rank: 4, teamID: 9, name: 'Riverside B', points: 6, speakerPointsTotal: 498, placement: 'Semifinalist' },
    // mid-table (sample)
    { rank: 10, teamID: 12, name: 'Lakeside C', points: 5, speakerPointsTotal: 465 },
    { rank: 20, teamID: 25, name: 'Maple E', points: 3, speakerPointsTotal: 420 },
    // swings near bottom
    { rank: 39, teamID: 39, name: 'Swing Team 1', points: 2, speakerPointsTotal: 380, swing: true },
    { rank: 40, teamID: 40, name: 'Swing Team 2', points: 1, speakerPointsTotal: 365, swing: true },
  ],
};
