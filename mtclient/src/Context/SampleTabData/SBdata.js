export const SpellingBeeTab={
  tabID:4,
  eventID:5,
  track:'Spelling Bee',
  title:'The Hive',
  slug:'the-hive',
  schools:[
    {id:1, name:'Greenwood High' ,code:'GH', participants:5},
    {id:2, name:'Lakeside Academy',code:'LA', participants:5},
    {id:3, name:'Hilltop School',code:'HS', participants:4},
    {id:4, name:'Riverside Prep',code:'RP', participants:6},
    {id:5, name:'Maple Leaf School',code:'MLS', participants:5},
  ],
  participants:[
    {id:1, name:'Alice Johnson', schoolCode:'GH'},
    {id:2, name:'Bob Martinez', schoolCode:'LA'},
    {id:3, name:'Charlie Smith', schoolCode:'HS'},
    {id:4, name:'Diana Chen', schoolCode:'RP'},
    {id:5, name:'Ethan Williams', schoolCode:'MLS'},
    {id:6, name:'Fiona Brown', schoolCode:'GH'},
    {id:7, name:'George Davis', schoolCode:'LA'},
    {id:8, name:'Hannah Wilson', schoolCode:'HS'},
    {id:9, name:'Ian Anderson', schoolCode:'RP'},
    {id:10, name:'Julia Taylor', schoolCode:'MLS'},
    {id:11, name:'Kevin Miller', schoolCode:'LA'},
    {id:12, name:'Laura Jackson', schoolCode:'MLS'},
    {id:13, name:'Michael White', schoolCode:'RP'},
    {id:14, name:'Nina Harris', schoolCode:'RP'},
    {id:15, name:'Oscar Martin', schoolCode:'LA'},
    {id:16, name:'Paula Thompson', schoolCode:'GH'},
    {id:17, name:'Quentin Garcia', schoolCode:'HS'},
    {id:18, name:'Rachel Lee', schoolCode:'RP'},
    {id:19, name:'Sam Rodriguez', schoolCode:'MLS'},
    {id:20, name:'Tina Clark', schoolCode:'GH'},
    {id:21, name:'Uma Patel', schoolCode:'HS'},
    {id:22, name:'Victor Lopez', schoolCode:'LA'},
    {id:23, name:'Wendy Turner', schoolCode:'MLS'},
    {id:24, name:'Xavier Phillips', schoolCode:'RP'},
    {id:25, name:'Yvonne Campbell', schoolCode:'GH'},
  ],
  judges:[
    {id:1, name:'Klaus Hoffmann'},
    {id:2, name:'Elijah Woods'},
    {id:3, name:'Rebecca Stone'},
    {id:4, name:'Marcelus Grant'},
    {id:5, name:'Holly Palmer'},
  ],
  rooms:[
    {id:1, name:'Spelling Bee Room 1'},
    {id:2, name:'Spelling Bee Room 2'},
    {id:3, name:'Spelling Bee Room 3'},
    {id:4, name:'Spelling Bee Room 4'},
    {id:5, name:'Spelling Bee Room 5'},
  ],
  prelimRounds: 3,
  rounds:[
    {roundID:1, name:'Round 1',breaks: false, completed: true, type:'Timed', timeLimit:'60 seconds',
      matches:[
        {roomID:1, participantIDs:[1,2,3,4,5], judgeID:1, 
          result:[
            {participantID:1, score:5},
            {participantID:2, score:4},
            {participantID:3, score:8},
            {participantID:4, score:3},
            {participantID:5, score:6},
          ],
        },
        {roomID:2, participantIDs:[6,7,8,9,10], judgeID:2,
          result:[
            {participantID:6, score:7},
            {participantID:7, score:5},
            {participantID:8, score:6},
            {participantID:9, score:4},
            {participantID:10, score:8},
          ],
        },
        {roomID:3, participantIDs:[11,12,13,14,15], judgeID:3,
          result:[
            {participantID:11, score:6},
            {participantID:12, score:7},
            {participantID:13, score:5},
            {participantID:14, score:8},
            {participantID:15, score:4},
          ],
        },
        {roomID:4, participantIDs:[16,17,18,19,20], judgeID:4,
          result:[
            {participantID:16, score:4},
            {participantID:17, score:6},
            {participantID:18, score:7},
            {participantID:19, score:5},
            {participantID:20, score:8},
          ],
        },
        {roomID:5, participantIDs:[21,22,23,24,25], judgeID:5,
          result:[
            {participantID:21, score:5},
            {participantID:22, score:8},
            {participantID:23, score:6},
            {participantID:24, score:7},
            {participantID:25, score:4},
          ],
        },
      ]
    },
    {roundID:2, name:'Round 2',breaks: false, completed: true, type:'WordLimit', wordLimit:'20 words',
      matches:[
        {roomID:1, participantIDs:[1,6,11,16,21], judgeID:1,
          result:[
            {participantID:1, score:7},
            {participantID:6, score:6},
            {participantID:11, score:5},
            {participantID:16, score:8},
            {participantID:21, score:4},
          ],
        },
        {roomID:2, participantIDs:[2,7,12,17,22], judgeID:2,
          result:[
            {participantID:2, score:5},
            {participantID:7, score:7},
            {participantID:12, score:6},
            {participantID:17, score:8},
            {participantID:22, score:4},
          ],
        },
        {roomID:3, participantIDs:[3,8,13,18,23], judgeID:3,
          result:[
            {participantID:3, score:6},
            {participantID:8, score:5},
            {participantID:13, score:7},
            {participantID:18, score:4},
            {participantID:23, score:8},
          ],
        },
        {roomID:4, participantIDs:[4,9,14,19,24], judgeID:4,
          result:[
            {participantID:4, score:8},
            {participantID:9, score:6},
            {participantID:14, score:5},
            {participantID:19, score:7},
            {participantID:24, score:4},
          ],
        },
        {roomID:5, participantIDs:[5,10,15,20,25], judgeID:5,
          result:[
            {participantID:5, score:7},
            {participantID:10, score:8},
            {participantID:15, score:6},
            {participantID:20, score:5},
            {participantID:25, score:4},
          ],
        },
      ]
    },
    {roundID:3, name:'Round 3',breaks: false, completed: true,  type:'Timed', timeLimit:'90 seconds',
      matches:[
        {roomID:1, participantIDs:[1,7,13,19,25], judgeID:1,
          result:[
            {participantID:1, score:8},
            {participantID:7, score:6},
            {participantID:13, score:5},
            {participantID:19, score:7},
            {participantID:25, score:4},
          ],
        },
        {roomID:2, participantIDs:[2,8,14,20,21], judgeID:2,
          result:[
            {participantID:2, score:6},
            {participantID:8, score:7},
            {participantID:14, score:5},
            {participantID:20, score:8},
            {participantID:21, score:4},
          ],
        },
        {roomID:3, participantIDs:[3,9,15,16,22], judgeID:3,
          result:[
            {participantID:3, score:5},
            {participantID:9, score:8},
            {participantID:15, score:6},
            // {participantID:16, score:7},
            {participantID:22, score:4},
          ],
        },
        {roomID:4, participantIDs:[4,10,11,17,23], judgeID:4,
          result:[
            {participantID:4, score:7},
            {participantID:10, score:6},
            {participantID:11, score:7},
            {participantID:17, score:5},
            {participantID:23, score:4},
          ],
        },
        {roomID:5, participantIDs:[5,12,18,24], judgeID:5,
          result:[
            {participantID:5, score:6},
            {participantID:12, score:7},
            {participantID:18, score:8},
            {participantID:24, score:5},
          ],
        },
      ]
    },
    {roundID:4, name:'Semi-Finals',breaks: true, completed: true,  type:'Eliminator',
      matches:[
        {roomID:1, participantIDs:[1,8,15,22], judgeID:1,
          result:[
            {participantID:1, status:'won'},
            {participantID:8, status:'lost'},
            {participantID:15, status:'lost'},
            {participantID:22, status:'lost'},
          ],
        },
        {roomID:2, participantIDs:[2,7,14,19], judgeID:2,
          result:[
            {participantID:2, status:'lost'},
            {participantID:7, status:'won'},
            {participantID:14, status:'lost'},
            {participantID:19, status:'lost'},            
          ]
        }
      ],
    },
    {roundID:5, name:'Finals',breaks: true, completed: true,  type:'Eliminator',
      matches:[
        {roomID:1, participantIDs:[1,7], judgeID:1,
          result:[
            {participantID:1, status:'won'},
            {participantID:7, status:'lost'},
          ],
        },
      ]
    },
  ],
  standings:[],
  words:[
    'abacus','abandon','abbreviate','abdicate','aberration','abhorrent','abide','abject','abolish','abominate','aboriginal','abrasive','abrogate','abrupt','absence','absolute','absolve','absorb','abstain','abstract','abstruse','absurd','abundance','academic','accede','accelerate','accentuate','acceptable','acclaim','acclimate','accolade','accommodate','accomplice','accordance','accumulate','accurate','accusation','acerbic','acoustic','acquaint','acquire','acquittal','acrid','acrimony','activate','actual','acumen','adaptable','addendum','adept','adhere','adjacent','adjudicate','adjunct','administer','admirable','admonish','adolescent','adoptive','adorable','adornment','adroit','adulation','adulterate','advance','adversary','adverse','advertent','advocate','aerial','aerodynamic','aesthetic','affable','affectation','affiliate','affinity','affirmation','affliction','affluent','afford','aficionado','aggravate','aggregate','agile','agitate','agnostic','agrarian','ailment','airborne','alacrity','albeit','albino','alchemy','alcoholic','alcove','alderman','algebra','algorithm','alias','alibi','alienate','alimentary','allegation','alleviate','alliance','alliteration','allocate','alloy','allude','allure','almond','alphabet','alpine','altercation','alternate','altitude','altruism','amalgam','amateur','ambassador','ambiguity','ambition','ambivalent','amble','ameliorate','amenable','amendment','amiable','amicable','amnesty','amorphous','amphibian','ample','amplify','amputate','anachronism','analogy','analyze','anarchy','anatomy','ancestor','ancestry','anchor','anecdote','anemia','anesthetic','angelic','angular','animate','annexation','annihilate','annotate','announce','annuity','anomaly','anonymous','antagonist','antecedent','antediluvian','anthem','anthology','antibiotic','anticipate','antidote','antipathy','antiquity','antiseptic','anvil','anxiety','apathetic','aperture',
'apex','aphorism','apology','apostrophe','apothecary','appall','apparatus','apparel','appease',
'appellation','appendix','appetite','applaud','appliance','applicable','appoint','appraise','apprehend','apprentice','approach','appropriate','approve','aquatic','arbiter','arbitrary','arbitrate','arcade','archaeology','archaic','archive','ardent','arduous','arid','aristocrat','arithmetic','armada','aroma','arraign','arrangement','arrogant','articulate','artifact','artisan','ascend','ascertain','ascribe','aseptic','ashamed','asinine','aspect','aspersion','aspirant','assailant','assassin','assemble','assess','asset','assiduous','assimilate','assist','associate','assorted','assuage','asteroid','astonish','astronomy','astute','asylum','athlete','atlas','atmosphere','atrophy','attain','attempt','attentive','attenuate','attic','attitude','attorney','attract','attribute','atypical','audacious','audible','augment','augury','auspicious','austere','authentic','authorize','autobiography','autocracy','autonomous','autopsy','auxiliary','available','avalanche','avarice','avenue','average','aversion','aviary','avid','avocation','avowal','awkward','axiom','azure','baboon','bachelor','backbone','bacteria','baffling','ballad','ballistic','bamboo','banquet','barbarian','baritone','barricade','barren','basilica','bastion','battery','beacon','behemoth','belated','beleaguer','belittle','belligerent','benefactor','benevolent','benign','bequeath','beryl','beseech','besiege','bestow','betrayal','beverage','bewilder','bibliography','bicycle','bifurcate','bigotry','bilateral','biography','biological','bizarre','blasphemy','blatant','blemish','blizzard','blossom','boisterous','bolster','bombastic','bonanza','botanical','boundary','bourgeois','boycott','bravado','brethren','brevity','brigade','brilliant','brisket','brochure','bronchial','brutality','buccaneer','buffalo','bulwark','bureaucracy','burgeon','burlesque','buttress','cabinet','cacophony','cadence','calamity','calculate','caliber','calligraphy','calorie','camaraderie','camouflage','campaign','canary','candor','canister','cannibal','canonical','canopy','cantankerous','capability','capacious','capacity','capillary','capital','capitulate','caption','captivate','carbohydrate','cardinal','careen','caricature','carnivore','carousel','carpenter','cartilage','cascade','casualty','cataclysm','catalogue','catalyst','catapult','catastrophe','catchment','category','caterpillar','caustic','cavalier','ceaseless','celebrate','celerity','celestial','cenotaph','censure','census','centennial','central','centurion','ceramic','ceremony',
'certain','certificate','cessation','chagrin','chairman','chalice','chameleon','champion','chandelier','chaotic','character','charisma','charlatan','charter','chastise','chauffeur','checkmate','cherish','chicanery','chimera','chivalry','chlorophyll','choreography','chronic','chronicle','circuitous','cinnamon','cipher','citadel','citation','citizen','civilian','clairvoyant','clamor','clandestine','clarify','classify','claustrophobia','clemency','clerical','cliffhanger','climatic','clinical','cloister','clumsy','coalesce','coalition','coarse','cobalt','cobbler','cognition','cognizant','coherent','cohesive','coincide','colander','collaborate','collateral','colleague','collective','colloquial','colonel','colossal','combative','comely','comet','comfort','commandeer','commemorate','commence','commendable','commerce','commiserate','commission','commodious','commonplace','commotion','communicate','commute','compact','companion','comparable','compartment','compassion','compatible','compel','compendium','compensate','competent','compile','complacent','complaint','complement'
  ]
};

// Compute standings from preliminary rounds (roundID 1-3)
(() => {
  const prelimRoundIDs = SpellingBeeTab.rounds.filter((r)=>!r.breaks).map(r=>r.roundID);
  const participants = SpellingBeeTab.participants || [];
  const schools = SpellingBeeTab.schools || [];
  const rounds = SpellingBeeTab.rounds || [];

  const standings = participants.map(p => {
    const school = schools.find(s => s.code === p.schoolCode)?.name || p.schoolCode;
    const rScores = prelimRoundIDs.map(rid => {
      const round = rounds.find(r => r.roundID === rid);
      if (!round) return null;
      for (const match of round.matches || []) {
        const res = (match.result || []).find(rr => rr.participantID === p.id);
        if (res && typeof res.score === 'number') return res.score;
      }
      return null;
    });
    const total = rScores.reduce((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
    return {
      participantID: p.id,
      speller: p.name,
      school,
      // round1: rScores[0],
      // round2: rScores[1],
      // round3: rScores[2],
      scores: [...rScores],
      total,
      rank: null,
    };
  });

  // assign ranks (higher total -> better rank). Ties get same rank, next rank skips accordingly.
  standings.sort((a,b) => b.total - a.total);
  let rank = 0;
  let prevTotal = null;
  let itemsWithPrevRank = 0;
  for (let i = 0; i < standings.length; i++) {
    const s = standings[i];
    if (s.total !== prevTotal) {
      rank = i + 1;
      prevTotal = s.total;
      itemsWithPrevRank = 1;
    } else {
      itemsWithPrevRank++;
    }
    s.rank = rank;
  }

  // attach standings (sorted by rank)
  SpellingBeeTab.standings = standings;
})();
