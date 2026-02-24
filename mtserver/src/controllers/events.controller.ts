import type { Request, Response } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/db";
import { events, users, tabsBP, tabsChess, tabsPS, tabsSB, tabsWSDC} from "../db/schema";
import bcrypt from 'bcryptjs';

export async function createEvent(req: Request, res: Response){
    // console.log('Create Event Called');
    // console.log(req.body);
    try{
      const { title, slug, organizer, ownerId } = req.body as {
        title?: string;
        slug?: string;
        organizer?: string;
        ownerId?:string;
        };

      const normalizedSlug = slug?.trim().toLowerCase();
      if (!title || !normalizedSlug || !organizer || !ownerId) {
        return res
          .status(400)
          .json({ message: "title, url, and organizer are required" });
      }

      const existing = await db
            .select({ slug: events.slug })
            .from(events)
            .where(eq(events.slug, normalizedSlug))
            .limit(1);
      
      if (existing.length > 0) {
        return res.status(409).json({ message: "url is already in use" });
      }
    const created = await db
      .insert(events)
      .values({
        title: title,
        slug: normalizedSlug,
        organizer: organizer,
        ownerId: ownerId,
      })
      .returning({
        eventId: events.eventId,
        title: events.title,
        organizer: events.organizer,
        slug: events.slug,
        ownerId: events.ownerId,
      });

    const createdEvent = created[0];

    return res.status(201).json({
      message: "Event Created Successfully",
      data: createdEvent,
    });
    }
    catch(error){
    console.error("Event creation error:", error);
    return res.status(500).json({ message: "failed to create event" });
    }
}

export async function getUserEvents(req: Request, res: Response){
  // console.log('User Events called');
  // console.log(req.params);
  try{
    const {ownerId}= req.params;

    if(!ownerId){
      return res.status(400).json({message: 'ownerId is required'});
    }

    const ownedEvents= await db
    .select({
      eventId: events.eventId,
      title: events.title,
      organizer: events.organizer,
      slug: events.slug,
      ownerId: events.ownerId,
      createdAt: events.createdAt,
    })
    .from(events)
    .where(eq(events.ownerId, ownerId));

    if(!ownedEvents.length){
      return res.status(200).json({
        message: "User events fetched successfully",
        data: [],
      });
    }

    //Add tabs
    const eventIds = ownedEvents.map((e) => e.eventId);
    const [sb, wsdc, chess, ps, bp] = await Promise.all([
      db.select({
        eventId: tabsSB.eventId,
        tabId: tabsSB.tabId,
        title: tabsSB.title,
        slug: tabsSB.slug,
      }).from(tabsSB).where(inArray(tabsSB.eventId, eventIds)),

      db.select({
        eventId: tabsWSDC.eventId,
        tabId: tabsWSDC.tabId,
        title: tabsWSDC.title,
        slug: tabsWSDC.slug,
      }).from(tabsWSDC).where(inArray(tabsWSDC.eventId, eventIds)),

      db.select({
        eventId: tabsChess.eventId,
        tabId: tabsChess.tabId,
        title: tabsChess.title,
        slug: tabsChess.slug,
      }).from(tabsChess).where(inArray(tabsChess.eventId, eventIds)),

      db.select({
        eventId: tabsPS.eventId,
        tabId: tabsPS.tabId,
        title: tabsPS.title,
        slug: tabsPS.slug,
      }).from(tabsPS).where(inArray(tabsPS.eventId, eventIds)),

      db.select({
        eventId: tabsBP.eventId,
        tabId: tabsBP.tabId,
        title: tabsBP.title,
        slug: tabsBP.slug,
      }).from(tabsBP).where(inArray(tabsBP.eventId, eventIds)),
    ]);

    const allTabs = [
      ...sb.map((t) => ({ ...t, track: "Spelling Bee" })),
      ...wsdc.map((t) => ({ ...t, track: "WSDC Debate" })),
      ...chess.map((t) => ({ ...t, track: "Chess" })),
      ...ps.map((t) => ({ ...t, track: "Public Speaking" })),
      ...bp.map((t) => ({ ...t, track: "BP Debate" })),
    ];

    const tabsByEventId = new Map<string, typeof allTabs>();
    for (const tab of allTabs) {
      const arr = tabsByEventId.get(tab.eventId) ?? [];
      arr.push(tab);
      tabsByEventId.set(tab.eventId, arr);
    }

    const data = ownedEvents.map((event) => ({
      ...event,
      tabs: tabsByEventId.get(event.eventId) ?? [],
    }));

    return res.status(200).json({
      message: "User events fetched successfully",
      data,
    });
  }
  catch(error){
    console.error('getUserEvents error:', error);
    return res.status(500).json({message:'Failed to fetch user events'});
  }
}

 export async function findEvent(req: Request, res: Response){
  // console.log('Find Event called');
  // console.log(req.params);
  try{
    const {slug}= req.params as {
      slug?: string;
    };
    
    const normalizedSlug=slug?.trim().toLowerCase();
    if(!normalizedSlug){
      return res.status(400).json({message: 'Event url is required'});
    }
    const foundEvent= await db
    .select({
      eventId: events.eventId,
      title: events.title,
      organizer: events.organizer,
      slug: events.slug,
      ownerId: events.ownerId,
      createdAt: events.createdAt,
    })
    .from(events)
    .where(eq(events.slug, normalizedSlug))
    .limit(1);

    if(!foundEvent.length) 
      return res.status(404).json({message:'Event not found'});
    
    const event = foundEvent[0];

    const [sb, wsdc, chess, ps, bp] = await Promise.all([
      db.select({ tabId: tabsSB.tabId, title: tabsSB.title, slug: tabsSB.slug })
        .from(tabsSB)
        .where(eq(tabsSB.eventId, event.eventId)),

      db.select({ tabId: tabsWSDC.tabId, title: tabsWSDC.title, slug: tabsWSDC.slug })
        .from(tabsWSDC)
        .where(eq(tabsWSDC.eventId, event.eventId)),

      db.select({ tabId: tabsChess.tabId, title: tabsChess.title, slug: tabsChess.slug })
        .from(tabsChess)
        .where(eq(tabsChess.eventId, event.eventId)),

      db.select({ tabId: tabsPS.tabId, title: tabsPS.title, slug: tabsPS.slug })
        .from(tabsPS)
        .where(eq(tabsPS.eventId, event.eventId)),

      db.select({ tabId: tabsBP.tabId, title: tabsBP.title, slug: tabsBP.slug })
        .from(tabsBP)
        .where(eq(tabsBP.eventId, event.eventId)),
    ]);

    const tabs = [
      ...sb.map((t) => ({ ...t, track: "Spelling Bee" })),
      ...wsdc.map((t) => ({ ...t, track: "WSDC Debate" })),
      ...chess.map((t) => ({ ...t, track: "Chess" })),
      ...ps.map((t) => ({ ...t, track: "Public Speaking" })),
      ...bp.map((t) => ({ ...t, track: "BP Debate" })),
    ];

    return res.status(200).json({
      message: "Event found successfully",
      data: { ...event, tabs: tabs },
    });    
  }
  catch(error){
    console.error('findEvent error:', error);
    return res.status(500).json({message:'Failed to find event'});
  }  
}

export async function deleteEvent(req: Request, res: Response){
  // console.log('Delete Event called');
  try{
    const {slug, ownerId, password}=req.body as{
      slug?: string;
      ownerId?: string;
      password?: string;
    };

    const normalizedSlug= slug?.trim().toLowerCase();
    if(!normalizedSlug || !password || !ownerId){
      return res.status(400).json({message: 'Event url and user password are required'});
    }

    const foundUser = await db
      .select({ userId: users.userId, passwordHash: users.password_hash })
      .from(users)
      .where(eq(users.userId, ownerId))
      .limit(1);

    if (!foundUser.length || !(await bcrypt.compare(password, foundUser[0].passwordHash))) {
      return res.status(401).json({ message: "Invalid password" });
    }

   const foundEvent = await db
      .select({
        eventId: events.eventId,
        title: events.title,
        organizer: events.organizer,
        slug: events.slug,
        ownerId: events.ownerId,
      })
      .from(events)
      .where(and(eq(events.slug, normalizedSlug), eq(events.ownerId, ownerId)))
      .limit(1);

    if (!foundEvent.length) {
      return res.status(404).json({ message: "Event not found. Is this yours?" });
    }

    const deleted = await db
      .delete(events)
      .where(eq(events.eventId, foundEvent[0].eventId))
      .returning({
        eventId: events.eventId,
        title: events.title,
        organizer: events.organizer,
        slug: events.slug,
        ownerId: events.ownerId,
      });

    return res.status(200).json({
      message: "Event deleted successfully",
      data: deleted[0],
    });
  }
  catch(error){
    console.error('deleteEvent error:', error);
    return res.status(500).json({message:'Failed to delete event'});
  }
}

export async function addEventTab(req: Request, res:Response){
  console.log('add tab called');
  try{
  const {eventId, title, slug, track}= req.body as{
    ownerId?: string;
    eventId?: string;
    title?: string;
    slug?: string;
    track?: string;
  };

  const normalizedSlug= slug?.trim().toLowerCase();
  if(!normalizedSlug || !title || !track){
    return res.status(400).json({message: 'Tab url and title are required'});
  }
  const tabs= track==='BP Debate'? tabsBP: track==='WSDC Debate'? tabsWSDC: track==='Public Speaking'? tabsPS: track==='Spelling Bee'? tabsSB: track==='Chess'? tabsChess: tabsSB;
  
  const existing = await db
      .select({ slug: tabs.slug })
      .from(tabs)
      .where(and(eq(tabs.slug, normalizedSlug), eq(tabs.eventId, eventId)))
      .limit(1);
  
  if (existing.length > 0) {
    return res.status(409).json({ message: "You already have a tab with that url" });
  }
  const created = await db
    .insert(tabs)
    .values({
      title: title,
      slug: normalizedSlug,
      eventId: eventId,
    })
    .returning({
      eventId: tabs.eventId,
      title: tabs.title,
      slug: tabs.slug,
    });

  const createdTab = created[0];

  return res.status(201).json({
    message: "Tab added Successfully",
    data: {...createdTab, track: track},
  });  
  
  } 
  catch(error){
    console.error("addEventTab error:", error);
    return res.status(500).json({ message: "failed to add tab" });
    }
}

export async function deleteEventTab(req: Request, res:Response) {
  // console.log('Delete Event called');
  try{
    const {slug, ownerId,eventId, password, track}=req.body as{
      slug?: string;
      ownerId?: string;
      eventId?: string;
      password?: string;
      track?: string;
    };

    const normalizedSlug= slug?.trim().toLowerCase();
    if(!normalizedSlug || !password || !ownerId){
      return res.status(400).json({message: 'Event url, track and user password are required'});
    }

    const foundUser = await db
      .select({ userId: users.userId, passwordHash: users.password_hash })
      .from(users)
      .where(eq(users.userId, ownerId))
      .limit(1);

    if (!foundUser.length || !(await bcrypt.compare(password, foundUser[0].passwordHash))) {
      return res.status(401).json({ message: "Invalid password" });
    }

  const ownedEvent = await db.select({ eventId: events.eventId })
  .from(events)
  .where(and(eq(events.eventId, eventId), eq(events.ownerId, ownerId)))
  .limit(1);
  if (!ownedEvent.length) return res.status(403).json({ message: 'Not allowed' });

  const trackMap = { 'Spelling Bee': tabsSB, 'BP Debate': tabsBP, 'WSDC Debate': tabsWSDC, 'Public Speaking': tabsPS, 'Chess': tabsChess } as const;
  const tab = trackMap[track as keyof typeof trackMap];
  if (!tab) return res.status(400).json({ message: 'Invalid track' });

   const foundTab = await db
      .select({
        eventId: tab.eventId,
        title: tab.title,
        slug: tab.slug,
        tabId: tab.tabId,
      })
      .from(tab)
      .where(and(eq(tab.slug, normalizedSlug), eq(tab.eventId, eventId)))
      .limit(1);

    if (!foundTab.length) {
      return res.status(404).json({ message: "Tab not found. Is the url correct?" });
    }

    const deleted = await db
      .delete(tab)
      .where(eq(tab.tabId, foundTab[0].tabId))
      .returning({
        tabId: tab.tabId,
        title: tab.title,
        slug: tab.slug,
        eventId: tab.eventId,
      });

    return res.status(200).json({
      message: "Tab deleted successfully",
      data: deleted[0],
    });
  }
  catch(error){
    console.error('deleteEventTab error:', error);
    return res.status(500).json({message:'Failed to delete tab'});
  }
}
