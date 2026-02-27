import { Request, Response } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/db";
import { tabsSB, institutionsSB, spellers,tabMastersSB, roomsSB, roundsSB, judgesSB, wordsSB} from "../../db/schema";

function parseBooleanInput(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
}

function parseIntOrNull(value: unknown): number | null {
  if (value === undefined) return null;
  if (value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return Number.NaN;
  return parsed;
}

function validateRoundShape(type: unknown, timeLimit: number | null, wordLimit: number | null) {
  if (type !== "Timed" && type !== "Word Limit" && type !== "Eliminator") {
    return { ok: false as const, message: "Invalid round type" };
  }
  if (type === "Timed") {
    if (!timeLimit) return { ok: false as const, message: "timeLimit is required for Timed rounds" };
    return { ok: true as const, timeLimit, wordLimit: null };
  }
  if (type === "Word Limit") {
    if (!wordLimit) return { ok: false as const, message: "wordLimit is required for Word Limit rounds" };
    return { ok: true as const, timeLimit: null, wordLimit };
  }
  return { ok: true as const, timeLimit: null, wordLimit: null };
}

//tab
export async function getFullTab(req: Request, res: Response) {
  try {
    const { tabId } = req.params as { tabId?: string };

    if (!tabId) {
      return res.status(400).json({ message: "tabId is required" });
    }

    const tabRow = await db
      .select({
        tabId: tabsSB.tabId,
        eventId: tabsSB.eventId,
        title: tabsSB.title,
        slug: tabsSB.slug,
        track: tabsSB.track,
      })
      .from(tabsSB)
      .where(eq(tabsSB.tabId, tabId))
      .limit(1);

    if (!tabRow.length) {
      return res.status(404).json({ message: "Tab not found" });
    }

    const tab = tabRow[0];

    const [institutionsRow, spellingBees, judges, tabMasters, rooms, rounds, words] =
      await Promise.all([
        db
          .select({
            id: institutionsSB.institutionId,
            name: institutionsSB.name,
            code: institutionsSB.code,
          })
          .from(institutionsSB)
          .where(eq(institutionsSB.tabId, tab.tabId)),

        db
          .select({
            id: spellers.spellerId,
            name: spellers.name,
            email: spellers.email,
            institutionId: spellers.institutionId,
          })
          .from(spellers)
          .where(eq(spellers.tabId, tab.tabId)),

        db
          .select({
            id: judgesSB.judgeId,
            name: judgesSB.name,
            email: judgesSB.email,
            institutionId: judgesSB.institutionId,
          })
          .from(judgesSB)
          .where(eq(judgesSB.tabId, tab.tabId)),
        db
          .select({
            id: tabMastersSB.tabMasterId,
            name: tabMastersSB.name,
            email: tabMastersSB.email,
            institutionId: tabMastersSB.institutionId,
          })
          .from(tabMastersSB)
          .where(eq(tabMastersSB.tabId, tab.tabId)),

        db
          .select({
            id: roomsSB.roomId,
            name: roomsSB.name,
          })
          .from(roomsSB)
          .where(eq(roomsSB.tabId, tab.tabId)),

        db
          .select({
            roundId: roundsSB.roundId,
            name: roundsSB.name,
            breaks: roundsSB.breaks,
            completed: roundsSB.completed,
            type: roundsSB.type,
            timeLimit: roundsSB.timeLimit,
            wordLimit: roundsSB.wordLimit,
          })
          .from(roundsSB)
          .where(eq(roundsSB.tabId, tab.tabId)),
        db
          .select({
            id: wordsSB.wordId,
            word: wordsSB.word,
          })
          .from(wordsSB)
          .where(eq(wordsSB.tabId, tab.tabId)),

      ]);
      const institutions= institutionsRow.map((i)=>({
        id: i.id,
        name: i.name,
        code: i.code,
        spellers: spellingBees.filter((s)=>s.institutionId===i.id).length,
      }))


    return res.status(200).json({
      message: "Tab fetched successfully",
      data: {
        tabID: tab.tabId,
        eventID: tab.eventId,
        track: tab.track,
        title: tab.title,
        slug: tab.slug,
        institutions,
        spellingBees,
        judges,
        tabMasters,
        rooms,
        rounds,
        words,
      },
    });
  } catch (error) {
    console.error("getFullTab error:", error);
    return res.status(500).json({ message: "failed to fetch tab" });
  }
}

//institution
export async function addInstitution(req: Request, res: Response) {
    // console.log('Add institution');
    try {
        const {name, code, tabId}=req.body as {
            name: string;
            code: string;
            tabId: string;
        }
        const normalizedCode=code.trim().toUpperCase();
        
        if (!name || !normalizedCode || !tabId) {
            return res
            .status(400)
            .json({ message: "School name and code are required" });
        }
        const existing = await db
                    .select({ code: institutionsSB.code })
                    .from(institutionsSB)
                    .where(and(eq(institutionsSB.code, normalizedCode),eq(institutionsSB.tabId, tabId)))
                    .limit(1);
      
        if (existing.length > 0) {
            return res.status(409).json({ message: "Institute code is already in tab" });
        }
        const added = await db
            .insert(institutionsSB)
            .values({
            name: name,
            code: normalizedCode,
            tabId: tabId,
            })
            .returning({
            name: institutionsSB.name,
            code: institutionsSB.code,
            tabId: institutionsSB.tabId,
            });

        const addedInstitution = added[0];

        return res.status(201).json({
            message: "Institution Added Successfully",
            data: addedInstitution,
        });
        
    } 
    catch(error){
        console.error("addInstitution error:", error);
        return res.status(500).json({ message: "failed to add Instituition" });
    }
}
export async function updateInstitution(req: Request, res: Response) {
    // console.log('Update Institution');
    try {
        const {name, code, tabId, id}=req.body as {
            name: string;
            code: string;
            tabId: string;
            id: number;
        }

        if((!name && !code) || !tabId || !id)
            return res.status(400).json({message:'Provide at least code  or name'});
        const updates:{name?: string; code?: string}={};
        if(name) updates.name=name;
        if(code) updates.code=code.trim().toUpperCase();

        //ensure code is unique in the ssame tab
        if(updates.code){
          const existing=await db
            .select({id: institutionsSB.institutionId})
            .from(institutionsSB)
            .where(and(eq(institutionsSB.tabId, tabId),eq(institutionsSB.code,updates.code )))
            .limit(1);
            if(existing.length && existing[0].id !==id){
              return res.status(409).json({message:'Instituion code is already in tab'});
            }
        }
        const updated= await db
        .update(institutionsSB)
        .set(updates)
        .where(and(eq(institutionsSB.tabId, tabId),eq(institutionsSB.institutionId, id)))
        .returning({
          institutionId: institutionsSB.institutionId,
          name: institutionsSB.name,
          code: institutionsSB.code,
          tabId: institutionsSB.tabId,
        });
        if(!updated.length) return res.status(404).json({message:'Institution not found'});

        return res.status(200).json({message:'Institution updated successfully',
          data: updated[0],
        })

    } 
    catch(error){
    console.error("updateInstitution error:", error);
    return res.status(500).json({ message: "failed to update Instituition" });
    }
}
export async function deleteInstitution(req: Request, res: Response) {
    try {
      // console.log(req.body);
      const {id, tabId}=req.body as{
        id?: number;
        tabId?: string;
      }
      if(!id || !tabId) res.status(400).json({message:'id and tabId required'});
    
    // // Optional: prevent delete if spellers/judges still reference this institution
    // const spellerCount = await db
    //   .select({ id: spellers.spellerId })
    //   .from(spellers)
    //   .where(eq(spellers.institutionId, id))
    //   .limit(1);

    // const judgeCount = await db
    //   .select({ id: judgesSB.judgeId })
    //   .from(judgesSB)
    //   .where(eq(judgesSB.institutionId, id))
    //   .limit(1);

    // if (spellerCount.length || judgeCount.length) {
    //   return res.status(409).json({
    //     message: "Cannot delete institution with linked spellers or judges",
    //   });
    // }

    const deleted = await db
      .delete(institutionsSB)
      .where(and(
        eq(institutionsSB.institutionId, id),
        eq(institutionsSB.tabId, tabId)
      ))
      .returning({
        institutionId: institutionsSB.institutionId,
        name: institutionsSB.name,
        code: institutionsSB.code,
        tabId: institutionsSB.tabId,
      });

    if (!deleted.length) {
      return res.status(404).json({ message: "Institution not found" });
    }

    return res.status(200).json({
      message: "Institution deleted successfully",
      data: deleted[0],
    });
    } 
    catch(error){
    console.error("deleteInstitution error:", error);
    return res.status(500).json({ message: "failed to delete Instituition" });
    }
}
//speller
export async function addSpeller(req: Request, res: Response) {
    // console.log('Add institution');
    try {
        const {name, email, tabId, institutionId}=req.body as {
            name?: string;
            email?: string;
            tabId?: string;
            institutionId?: number;
        }
        const normalizedEmail=email?.trim().toLocaleLowerCase();       
        if (!name || !institutionId || !tabId) {
            return res
            .status(400)
            .json({ message: "Speller name and institution are required" });
        }
        const existing = await db
                    .select({ email: spellers.email })
                    .from(spellers)
                    .where(and(eq(spellers.email, normalizedEmail),eq(spellers.tabId, tabId)))
                    .limit(1);
      
        if (existing.length > 0) {
            return res.status(409).json({ message: "Student with that email is already in tab" });
        }
        const added = await db
            .insert(spellers)
            .values({
            name: name,
            email: normalizedEmail,
            tabId: tabId,
            institutionId: institutionId
            })
            .returning({
            name: spellers.name,
            email: spellers.email,
            tabId: spellers.tabId,
            institutionId: spellers.institutionId
            });

        const addedSpeller = added[0];

        return res.status(201).json({
            message: "Speller Registered Successfully",
            data: addedSpeller,
        });
        
    } 
    catch(error)
    {
    console.error("addSpeller error:", error);
    return res.status(500).json({ message: "failed to add speller" });
    }
}
export async function updateSpeller(req: Request, res: Response) {
    // console.log('Update Institution');
    try {
        const {name, email, tabId, id, institutionId}=req.body as {
            name: string;
            email: string;
            tabId: string;
            id: number;
            institutionId: number;
        }

        if((!id && !tabId) || !tabId || !id)
            return res.status(400).json({message:'Provide tabId and spellerId'});

        const updates:{name?: string; email?: string, institutionId?:number}={};
        if(name) updates.name=name;
        if(email) updates.email=email.trim().toLocaleLowerCase();
        if(institutionId) updates.institutionId=institutionId;

        //ensure email is unique in the same tab
        if(updates.email){
          const existing=await db
            .select({id: spellers.spellerId})
            .from(spellers)
            .where(and(eq(spellers.tabId, tabId),eq(spellers.email,updates.email )))
            .limit(1);
            if(existing.length && existing[0].id !==id){
              return res.status(409).json({message:'Student with that email is already in tab'});
            }
        }
        const updated= await db
        .update(spellers)
        .set(updates)
        .where(and(eq(spellers.tabId, tabId),eq(spellers.spellerId, id)))
        .returning({
          spellerId: spellers.spellerId,
          name: spellers.name,
          email: spellers.email,
          institutionId: spellers.institutionId,
          tabId: institutionsSB.tabId,
        });
        if(!updated.length) return res.status(404).json({message:'Speller not found'});

        return res.status(200).json({message:'Speller updated successfully',
          data: updated[0],
        })
    } 
    catch(error){
    console.error("updateSpeller error:", error);
    return res.status(500).json({ message: "failed to update speller" });
    }
}
export async function deleteSpeller(req: Request, res: Response) {
    try {
      // console.log(req.body);
      const {id, tabId}=req.body as{
        id?: number;
        tabId?: string;
      }
      if(!id || !tabId) res.status(400).json({message:'id and tabId required'});

    const deleted = await db
      .delete(spellers)
      .where(and(
        eq(spellers.spellerId, id),
        eq(spellers.tabId, tabId)
      ))
      .returning({
        spellerId: spellers.spellerId,
        name: spellers.name,
        email: spellers.email,
        institutionId: spellers.institutionId,
        tabId: spellers.tabId,
      });

    if (!deleted.length) {
      return res.status(404).json({ message: "Speller not found" });
    }

    return res.status(200).json({
      message: "Speller removed successfully",
      data: deleted[0],
    });
    } 
    catch(error){
    console.error("deleteSpeller error:", error);
    return res.status(500).json({ message: "failed to delete speller" });
    }
}
//tabMasters
export async function addTabMaster(req: Request, res: Response) {
    try {
        const {name, email, tabId, institutionId}=req.body as {
            name?: string;
            email?: string;
            tabId?: string;
            institutionId?: number;
        }
        const normalizedEmail=email?.trim().toLocaleLowerCase();
        if (!name || !normalizedEmail || !institutionId || !tabId) {
            return res
            .status(400)
            .json({ message: "Tab master name, email and institution are required" });
        }
        const existing = await db
                    .select({ email: tabMastersSB.email })
                    .from(tabMastersSB)
                    .where(and(eq(tabMastersSB.email, normalizedEmail),eq(tabMastersSB.tabId, tabId)))
                    .limit(1);
      
        if (existing.length > 0) {
            return res.status(409).json({ message: "Tab master with that email is already in tab" });
        }
        const added = await db
            .insert(tabMastersSB)
            .values({
            name: name,
            email: normalizedEmail,
            tabId: tabId,
            institutionId: institutionId
            })
            .returning({
            id: tabMastersSB.tabMasterId,
            name: tabMastersSB.name,
            email: tabMastersSB.email,
            tabId: tabMastersSB.tabId,
            institutionId: tabMastersSB.institutionId
            });

        return res.status(201).json({
            message: "Tab Master Added Successfully",
            data: added[0],
        });
    } 
    catch(error){
    console.error("addTabMaster error:", error);
    return res.status(500).json({ message: "failed to add Tab Master" });
    }
}
export async function updateTabMaster(req: Request, res: Response) {
    try {
        const {name, email, tabId, id, institutionId}=req.body as {
            name?: string;
            email?: string;
            tabId?: string;
            id?: number;
            institutionId?: number;
        }

        if(!tabId || !id)
            return res.status(400).json({message:'Provide tabId and tabMasterId'});

        const updates:{name?: string; email?: string; institutionId?:number}={};
        if(name) updates.name=name;
        if(email) updates.email=email.trim().toLocaleLowerCase();
        if(institutionId) updates.institutionId=institutionId;

        if(updates.email){
          const existing=await db
            .select({id: tabMastersSB.tabMasterId})
            .from(tabMastersSB)
            .where(and(eq(tabMastersSB.tabId, tabId),eq(tabMastersSB.email,updates.email )))
            .limit(1);
            if(existing.length && existing[0].id !==id){
              return res.status(409).json({message:'Tab master with that email is already in tab'});
            }
        }
        const updated= await db
        .update(tabMastersSB)
        .set(updates)
        .where(and(eq(tabMastersSB.tabId, tabId),eq(tabMastersSB.tabMasterId, id)))
        .returning({
          id: tabMastersSB.tabMasterId,
          name: tabMastersSB.name,
          email: tabMastersSB.email,
          institutionId: tabMastersSB.institutionId,
          tabId: tabMastersSB.tabId,
        });
        if(!updated.length) return res.status(404).json({message:'Tab Master not found'});

        return res.status(200).json({
          message:'Tab Master updated successfully',
          data: updated[0],
        });
    } 
    catch(error){
    console.error("updateTabMaster error:", error);
    return res.status(500).json({ message: "failed to update Tab Master" });
    }
}
export async function deleteTabMaster(req: Request, res: Response) {
    try {
      const {id, tabId}=req.body as{
        id?: number;
        tabId?: string;
      }
      if(!id || !tabId) return res.status(400).json({message:'id and tabId required'});

      const deleted = await db
        .delete(tabMastersSB)
        .where(and(
          eq(tabMastersSB.tabMasterId, id),
          eq(tabMastersSB.tabId, tabId)
        ))
        .returning({
          id: tabMastersSB.tabMasterId,
          name: tabMastersSB.name,
          email: tabMastersSB.email,
          institutionId: tabMastersSB.institutionId,
          tabId: tabMastersSB.tabId,
        });

      if (!deleted.length) {
        return res.status(404).json({ message: "Tab Master not found" });
      }

      return res.status(200).json({
        message: "Tab Master removed successfully",
        data: deleted[0],
      });
    } 
    catch(error){
    console.error("deleteTabMaster error:", error);
    return res.status(500).json({ message: "failed to delete Tab Master" });
    }
}
//judge
export async function addJudge(req: Request, res: Response) {
    try {
        const {name, email, tabId, institutionId}=req.body as {
            name?: string;
            email?: string;
            tabId?: string;
            institutionId?: number;
        }
        const normalizedEmail=email?.trim().toLocaleLowerCase();
        if (!name || !institutionId || !tabId) {
            return res
            .status(400)
            .json({ message: "Judge name and institution are required" });
        }
        if (normalizedEmail) {
          const existing = await db
                      .select({ email: judgesSB.email })
                      .from(judgesSB)
                      .where(and(eq(judgesSB.email, normalizedEmail),eq(judgesSB.tabId, tabId)))
                      .limit(1);
        
          if (existing.length > 0) {
              return res.status(409).json({ message: "Judge with that email is already in tab" });
          }
        }
        const added = await db
            .insert(judgesSB)
            .values({
            name: name,
            email: normalizedEmail,
            tabId: tabId,
            institutionId: institutionId
            })
            .returning({
            id: judgesSB.judgeId,
            name: judgesSB.name,
            email: judgesSB.email,
            tabId: judgesSB.tabId,
            institutionId: judgesSB.institutionId
            });

        return res.status(201).json({
            message: "Judge Added Successfully",
            data: added[0],
        });
    } 
    catch(error){
    console.error("addJudge error:", error);
    return res.status(500).json({ message: "failed to add judge" });
    }
}
export async function updateJudge(req: Request, res: Response) {
    try {
        const {name, email, tabId, id, institutionId}=req.body as {
            name?: string;
            email?: string;
            tabId?: string;
            id?: number;
            institutionId?: number;
        }

        if(!tabId || !id)
            return res.status(400).json({message:'Provide tabId and judgeId'});

        const updates:{name?: string; email?: string; institutionId?:number}={};
        if(name) updates.name=name;
        if(email) updates.email=email.trim().toLocaleLowerCase();
        if(institutionId) updates.institutionId=institutionId;

        if(updates.email){
          const existing=await db
            .select({id: judgesSB.judgeId})
            .from(judgesSB)
            .where(and(eq(judgesSB.tabId, tabId),eq(judgesSB.email,updates.email )))
            .limit(1);
            if(existing.length && existing[0].id !==id){
              return res.status(409).json({message:'Judge with that email is already in tab'});
            }
        }
        const updated= await db
        .update(judgesSB)
        .set(updates)
        .where(and(eq(judgesSB.tabId, tabId),eq(judgesSB.judgeId, id)))
        .returning({
          id: judgesSB.judgeId,
          name: judgesSB.name,
          email: judgesSB.email,
          institutionId: judgesSB.institutionId,
          tabId: judgesSB.tabId,
        });
        if(!updated.length) return res.status(404).json({message:'Judge not found'});

        return res.status(200).json({
          message:'Judge updated successfully',
          data: updated[0],
        });
    } 
    catch(error){
    console.error("updateJudge error:", error);
    return res.status(500).json({ message: "failed to update judge" });
    }
}
export async function deleteJudge(req: Request, res: Response) {
    try {
      const {id, tabId}=req.body as{
        id?: number;
        tabId?: string;
      }
      if(!id || !tabId) return res.status(400).json({message:'id and tabId required'});

      const deleted = await db
        .delete(judgesSB)
        .where(and(
          eq(judgesSB.judgeId, id),
          eq(judgesSB.tabId, tabId)
        ))
        .returning({
          id: judgesSB.judgeId,
          name: judgesSB.name,
          email: judgesSB.email,
          institutionId: judgesSB.institutionId,
          tabId: judgesSB.tabId,
        });

      if (!deleted.length) {
        return res.status(404).json({ message: "Judge not found" });
      }

      return res.status(200).json({
        message: "Judge removed successfully",
        data: deleted[0],
      });
    } 
    catch(error){
    console.error("deleteJudge error:", error);
    return res.status(500).json({ message: "failed to delete judge" });
    }
}
//room
export async function addRoom(req: Request, res: Response) {
    try {
        const {name, tabId}=req.body as {
            name?: string;
            tabId?: string;
        }
        const normalizedName=name?.trim();
        if (!normalizedName || !tabId) {
            return res.status(400).json({ message: "Room name and tabId are required" });
        }
        const existing = await db
                    .select({ id: roomsSB.roomId })
                    .from(roomsSB)
                    .where(and(eq(roomsSB.name, normalizedName),eq(roomsSB.tabId, tabId)))
                    .limit(1);
      
        if (existing.length > 0) {
            return res.status(409).json({ message: "Room with that name is already in tab" });
        }
        const added = await db
            .insert(roomsSB)
            .values({
            name: normalizedName,
            tabId: tabId,
            })
            .returning({
            id: roomsSB.roomId,
            name: roomsSB.name,
            tabId: roomsSB.tabId,
            });

        return res.status(201).json({
            message: "Room Added Successfully",
            data: added[0],
        });
    } 
    catch(error){
    console.error("addRoom error:", error);
    return res.status(500).json({ message: "failed to add room" });
    }
}
export async function updateRoom(req: Request, res: Response) {
    try {
        const {name, tabId, id}=req.body as {
            name?: string;
            tabId?: string;
            id?: number;
        }

        if(!tabId || !id)
            return res.status(400).json({message:'Provide tabId and roomId'});

        const updates:{name?: string}={};
        if(name) updates.name=name.trim();

        if(updates.name){
          const existing=await db
            .select({id: roomsSB.roomId})
            .from(roomsSB)
            .where(and(eq(roomsSB.tabId, tabId),eq(roomsSB.name,updates.name )))
            .limit(1);
            if(existing.length && existing[0].id !==id){
              return res.status(409).json({message:'Room with that name is already in tab'});
            }
        }
        const updated= await db
        .update(roomsSB)
        .set(updates)
        .where(and(eq(roomsSB.tabId, tabId),eq(roomsSB.roomId, id)))
        .returning({
          id: roomsSB.roomId,
          name: roomsSB.name,
          tabId: roomsSB.tabId,
        });
        if(!updated.length) return res.status(404).json({message:'Room not found'});

        return res.status(200).json({
          message:'Room updated successfully',
          data: updated[0],
        });
    } 
    catch(error){
    console.error("updateRoom error:", error);
    return res.status(500).json({ message: "failed to update room" });
    }
}
export async function deleteRoom(req: Request, res: Response) {
    try {
      const {id, tabId}=req.body as{
        id?: number;
        tabId?: string;
      }
      if(!id || !tabId) return res.status(400).json({message:'id and tabId required'});

      const deleted = await db
        .delete(roomsSB)
        .where(and(
          eq(roomsSB.roomId, id),
          eq(roomsSB.tabId, tabId)
        ))
        .returning({
          id: roomsSB.roomId,
          name: roomsSB.name,
          tabId: roomsSB.tabId,
        });

      if (!deleted.length) {
        return res.status(404).json({ message: "Room not found" });
      }

      return res.status(200).json({
        message: "Room removed successfully",
        data: deleted[0],
      });
    } 
    catch(error){
    console.error("deleteRoom error:", error);
    return res.status(500).json({ message: "failed to delete room" });
    }
}
//round
export async function addRound(req: Request, res: Response) {
    try {
        const {name, tabId, type, breaks, timeLimit, wordLimit}=req.body as {
            name?: string;
            tabId?: string;
            type?: string;
            breaks?: boolean | string;
            timeLimit?: number | string | null;
            wordLimit?: number | string | null;
        }
        const normalizedName=name?.trim();
        if (!normalizedName || !tabId || !type) {
            return res.status(400).json({ message: "Round name, tabId and type are required" });
        }

        const parsedTime = parseIntOrNull(timeLimit);
        const parsedWord = parseIntOrNull(wordLimit);
        if (Number.isNaN(parsedTime) || Number.isNaN(parsedWord)) {
          return res.status(400).json({ message: "timeLimit/wordLimit must be positive integers" });
        }

        const validated = validateRoundShape(type, parsedTime, parsedWord);
        if (!validated.ok) return res.status(400).json({ message: validated.message });

        const parsedBreaks = parseBooleanInput(breaks) ?? false;

        const added = await db
          .insert(roundsSB)
          .values({
            name: normalizedName,
            tabId,
            breaks: parsedBreaks,
            type: type as "Timed" | "Word Limit" | "Eliminator",
            timeLimit: validated.timeLimit,
            wordLimit: validated.wordLimit,
          })
          .returning({
            roundId: roundsSB.roundId,
            name: roundsSB.name,
            tabId: roundsSB.tabId,
            breaks: roundsSB.breaks,
            completed: roundsSB.completed,
            type: roundsSB.type,
            timeLimit: roundsSB.timeLimit,
            wordLimit: roundsSB.wordLimit,
          });

        return res.status(201).json({
          message: "Round Added Successfully",
          data: added[0],
        });
    } 
    catch(error){
    console.error("addRound error:", error);
    return res.status(500).json({ message: "failed to add round" });
    }
}
export async function updateRound(req: Request, res: Response) {
    try {
        const {id, roundId, tabId, name, type, breaks, completed, timeLimit, wordLimit}=req.body as {
            id?: number;
            roundId?: number;
            tabId?: string;
            name?: string;
            type?: string;
            breaks?: boolean | string;
            completed?: boolean | string;
            timeLimit?: number | string | null;
            wordLimit?: number | string | null;
        }
        const targetRoundId = roundId ?? id;
        if(!tabId || !targetRoundId){
            return res.status(400).json({message:'Provide tabId and roundId'});
        }

        const existing = await db
          .select({
            roundId: roundsSB.roundId,
            name: roundsSB.name,
            breaks: roundsSB.breaks,
            completed: roundsSB.completed,
            type: roundsSB.type,
            timeLimit: roundsSB.timeLimit,
            wordLimit: roundsSB.wordLimit,
          })
          .from(roundsSB)
          .where(and(eq(roundsSB.tabId, tabId), eq(roundsSB.roundId, targetRoundId)))
          .limit(1);
        if (!existing.length) return res.status(404).json({ message: "Round not found" });

        const prev = existing[0];
        const nextType = type ?? prev.type;
        const nextBreaks = parseBooleanInput(breaks) ?? prev.breaks;
        const nextCompleted = parseBooleanInput(completed) ?? prev.completed;
        const nextName = name?.trim() || prev.name;

        const parsedTime = parseIntOrNull(timeLimit);
        const parsedWord = parseIntOrNull(wordLimit);
        if (Number.isNaN(parsedTime) || Number.isNaN(parsedWord)) {
          return res.status(400).json({ message: "timeLimit/wordLimit must be positive integers" });
        }

        const proposedTime = timeLimit !== undefined ? parsedTime ?? null : prev.timeLimit;
        const proposedWord = wordLimit !== undefined ? parsedWord ?? null : prev.wordLimit;
        const validated = validateRoundShape(nextType, proposedTime, proposedWord);
        if (!validated.ok) return res.status(400).json({ message: validated.message });

        const updated= await db
        .update(roundsSB)
        .set({
          name: nextName,
          breaks: nextBreaks,
          completed: nextCompleted,
          type: nextType as "Timed" | "Word Limit" | "Eliminator",
          timeLimit: validated.timeLimit,
          wordLimit: validated.wordLimit,
        })
        .where(and(eq(roundsSB.tabId, tabId),eq(roundsSB.roundId, targetRoundId)))
        .returning({
          roundId: roundsSB.roundId,
          name: roundsSB.name,
          tabId: roundsSB.tabId,
          breaks: roundsSB.breaks,
          completed: roundsSB.completed,
          type: roundsSB.type,
          timeLimit: roundsSB.timeLimit,
          wordLimit: roundsSB.wordLimit,
        });

        return res.status(200).json({
          message:'Round updated successfully',
          data: updated[0],
        });
    } 
    catch(error){
    console.error("updateRound error:", error);
    return res.status(500).json({ message: "failed to update round" });
    }
}
export async function deleteRound(req: Request, res: Response) {
    try {
      const {id, roundId, tabId}=req.body as{
        id?: number;
        roundId?: number;
        tabId?: string;
      }
      const targetRoundId = roundId ?? id;
      if(!targetRoundId || !tabId) return res.status(400).json({message:'roundId and tabId required'});

      const deleted = await db
        .delete(roundsSB)
        .where(and(
          eq(roundsSB.roundId, targetRoundId),
          eq(roundsSB.tabId, tabId)
        ))
        .returning({
          roundId: roundsSB.roundId,
          name: roundsSB.name,
          tabId: roundsSB.tabId,
          breaks: roundsSB.breaks,
          completed: roundsSB.completed,
          type: roundsSB.type,
          timeLimit: roundsSB.timeLimit,
          wordLimit: roundsSB.wordLimit,
        });

      if (!deleted.length) {
        return res.status(404).json({ message: "Round not found" });
      }

      return res.status(200).json({
        message: "Round removed successfully",
        data: deleted[0],
      });
    } 
    catch(error){
    console.error("deleteRound error:", error);
    return res.status(500).json({ message: "failed to delete round" });
    }
}
//word
export async function addWord(req: Request, res: Response) {
    try {
        const {word, tabId}=req.body as {
            word?: string;
            tabId?: string;
        }
        const normalizedWord=word?.trim();
        if (!normalizedWord || !tabId) {
            return res.status(400).json({ message: "Word and tabId are required" });
        }
        const existing = await db
                    .select({ id: wordsSB.wordId })
                    .from(wordsSB)
                    .where(and(eq(wordsSB.word, normalizedWord),eq(wordsSB.tabId, tabId)))
                    .limit(1);
      
        if (existing.length > 0) {
            return res.status(409).json({ message: "Word already exists in tab" });
        }
        const added = await db
            .insert(wordsSB)
            .values({
            word: normalizedWord,
            tabId: tabId,
            })
            .returning({
            id: wordsSB.wordId,
            word: wordsSB.word,
            tabId: wordsSB.tabId,
            });

        return res.status(201).json({
            message: "Word Added Successfully",
            data: added[0],
        });
    } 
    catch(error){
    console.error("addWord error:", error);
    return res.status(500).json({ message: "failed to add word" });
    }
}
export async function updateWord(req: Request, res: Response) {
    try {
      const {id, tabId, word}=req.body as{
        id?: number;
        tabId?: string;
        word?: string;
      }
      const normalizedWord = word?.trim();
      if(!id || !tabId || !normalizedWord) return res.status(400).json({message:'id, tabId and word required'});

      const existing=await db
        .select({id: wordsSB.wordId})
        .from(wordsSB)
        .where(and(eq(wordsSB.tabId, tabId),eq(wordsSB.word, normalizedWord )))
        .limit(1);
      if(existing.length && existing[0].id !==id){
        return res.status(409).json({message:'Word already exists in tab'});
      }

      const updated = await db
        .update(wordsSB)
        .set({ word: normalizedWord })
        .where(and(
          eq(wordsSB.wordId, id),
          eq(wordsSB.tabId, tabId)
        ))
        .returning({
          id: wordsSB.wordId,
          word: wordsSB.word,
          tabId: wordsSB.tabId,
        });

      if (!updated.length) {
        return res.status(404).json({ message: "Word not found" });
      }

      return res.status(200).json({
        message: "Word updated successfully",
        data: updated[0],
      });
    } 
    catch(error){
    console.error("updateWord error:", error);
    return res.status(500).json({ message: "failed to update word" });
    }
}
export async function deleteWord(req: Request, res: Response) {
    try {
      const {id, tabId}=req.body as{
        id?: number;
        tabId?: string;
      }
      if(!id || !tabId) return res.status(400).json({message:'id and tabId required'});

      const deleted = await db
        .delete(wordsSB)
        .where(and(
          eq(wordsSB.wordId, id),
          eq(wordsSB.tabId, tabId)
        ))
        .returning({
          id: wordsSB.wordId,
          word: wordsSB.word,
          tabId: wordsSB.tabId,
        });

      if (!deleted.length) {
        return res.status(404).json({ message: "Word not found" });
      }

      return res.status(200).json({
        message: "Word removed successfully",
        data: deleted[0],
      });
    } 
    catch(error){
    console.error("deletWord error:", error);
    return res.status(500).json({ message: "failed to delete word" });
    }
}
//Draw
export async function generateDraw(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("generateDraw error:", error);
    return res.status(500).json({ message: "failed to generate draw" });
    }
}
export async function updateDraw(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("updateDraw error:", error);
    return res.status(500).json({ message: "failed to update draw" });
    }
}
export async function deleteDraw(req: Request, res: Response) {
    try {
        
    } 
    catch(error){
    console.error("deleteDraw error:", error);
    return res.status(500).json({ message: "failed to delete draw" });
    }
}
