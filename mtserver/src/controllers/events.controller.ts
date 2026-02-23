import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/db";
import { events } from "../db/schema";

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

    return res.status(200).json({
      message: "User events fetched successfully",
      data: ownedEvents,
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
    const {slug}= req.params;

    if(!slug){
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
    .where(eq(events.slug, slug))
    .limit(1);

    if(foundEvent.length<1) 
      return res.status(404).json({message:'Event not found'});

    return res.status(200).json({
      message: "Events found successfully",
      data: foundEvent,
    });    
  }
  catch(error){
    console.error('findEvent error:', error);
    return res.status(500).json({message:'Failed to find event'});
  }  
 }