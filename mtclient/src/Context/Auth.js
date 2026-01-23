export const Auth={
  isAuthenticated: true,
  user: {
    id: 1,
    name: "John Doe",
    email:'JohnDoe@test.com',
    events:[1, 3],
    // events:[],
  },
}

export const events=[
  {id:1, title:'Illouwa 3.0', organizer:'JDS', date:'2024-07-01', tracks: ['BP Debate', 'Chess', 'Spelling Bee'], url:'illouwa3'},
  {id:2, title:'Tech Symposium', organizer:'Tech Club', date:'2024-08-15', tracks: ['Chess', 'Worlds Debate'], url:'Spelling Bee'},
  {id:3, title:'Art Festival', organizer:'Art Society', date:'2024-09-10', tracks: ['BP Debate'], url:'artfest24'},
];
