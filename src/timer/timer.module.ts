import { DynamicModule, Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TimedActionSchema } from "./timed-action.model";
import { TimerService } from "./timer.service";

@Module({
  providers: [TimerService],
  exports: [TimerService],
})
export class TimerModule {
  static register(connectionName?: string, global = true): DynamicModule {
    return {
      module: TimerModule,
      imports: [
        MongooseModule.forFeature(
          [
            {
              name: "TimedAction",
              schema: TimedActionSchema,
              collection: "timed_actions",
            },
          ],
          connectionName
        ),
      ],
      global,
    };
  }
}
