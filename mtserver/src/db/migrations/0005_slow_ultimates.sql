ALTER TABLE "draw_spellers" ADD COLUMN "room_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "draw_judges_sb" ADD COLUMN "room_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "draw_spellers" ADD CONSTRAINT "draw_spellers_room_id_rooms_sb_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms_sb"("room_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_judges_sb" ADD CONSTRAINT "draw_judges_sb_room_id_rooms_sb_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms_sb"("room_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ds_room_id_idx" ON "draw_spellers" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "dj_room_id_idx" ON "draw_judges_sb" USING btree ("room_id");--> statement-breakpoint
ALTER TABLE "draw_spellers" ADD CONSTRAINT "draw_spellers_room_id_speller_id_unique" UNIQUE("room_id","speller_id");--> statement-breakpoint
ALTER TABLE "draw_judges_sb" ADD CONSTRAINT "draw_judges_sb_room_id_judge_id_unique" UNIQUE("room_id","judge_id");