import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, SchemaTypes } from "mongoose";

@Schema({
  timestamps: { updatedAt: false, createdAt: true },
  collection: "timed_actions",
})
export class TimedAction {
  @Prop({ required: true })
  fnKey: string;

  @Prop({ required: true, default: [], type: SchemaTypes.Mixed })
  args: any[];

  @Prop()
  createdAt: Date;
  @Prop({ required: true })
  execTime: Date;
}

export type TimedActionDocument = Document & TimedAction;
export const TimedActionSchema = SchemaFactory.createForClass(TimedAction);

TimedActionSchema.index({ execTime: 1 });
