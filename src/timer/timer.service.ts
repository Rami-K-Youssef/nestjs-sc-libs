import { Propagation } from "../transaction-helper/transactional/Propagation";
import { Transactional } from "../transaction-helper/transactional/Transactional";
import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import moment from "moment";
import { Model, Types } from "mongoose";
import { TimedAction, TimedActionDocument } from "./timed-action.model";

type GenericFunc = (...args: any[]) => unknown;
const TIMER_SERVICE_CRON_BUNCH_GETTER = "TIMER_SERVICE_CRON_BUNCH_GETTER";

export type TimerConfig = {
  fnKey: string;
  execTime: Date;
  timerId: Types.ObjectId;
  args: any[];
};

@Injectable()
export class TimerService {
  private readonly fnMap: Map<string, GenericFunc> = new Map<
    string,
    GenericFunc
  >();
  private readonly timeoutMap: Map<string, NodeJS.Timeout> = new Map<
    string,
    NodeJS.Timeout
  >();

  private job: CronJob;
  private logger: Logger = new Logger("Timer");

  constructor(
    @InjectModel("TimedAction")
    private readonly timedActionModel: Model<TimedAction>,
    private readonly scheduleRegistry: SchedulerRegistry
  ) {}

  public setFunction(fnKey: string, fn: GenericFunc) {
    this.fnMap.set(fnKey, fn);
  }

  @Transactional({ propagation: Propagation.SUPPORTS })
  public async runTimer(
    fnKey: string,
    execTime: Date,
    timerId: Types.ObjectId,
    ...args: any[]
  ) {
    const action = new this.timedActionModel({
      _id: timerId,
      fnKey,
      execTime,
      args,
    });
    await action.save();
    if (execTime <= this.job.nextDate().toJSDate()) {
      this._startActionTimeout(action);
    }
  }

  @Transactional({ propagation: Propagation.SUPPORTS })
  public async runTimers(configs: TimerConfig[]) {
    const actions = await this.timedActionModel.create(configs);
    actions.forEach((action) => {
      if (action.execTime <= this.job.nextDate().toJSDate()) {
        this._startActionTimeout(action);
      }
    });
  }

  private _startActionTimeout(action: TimedActionDocument) {
    if (!this.timeoutMap.has(action.id)) {
      const delayMS = Math.max(
        0,
        action.execTime.getTime() - new Date().getTime()
      );
      const timeout = setTimeout(async () => {
        const fn = this.fnMap.get(action.fnKey);
        if (!fn) {
          this.logger.error(`${action.fnKey} is not registered!`);
        } else {
          await fn.call(undefined, ...action.args);
        }
        await action.deleteOne();
        this.timeoutMap.delete(action.id);
      }, delayMS);
      this.timeoutMap.set(action.id, timeout);
    }
  }

  public async startUp() {
    this.job = this.scheduleRegistry.getCronJob(
      TIMER_SERVICE_CRON_BUNCH_GETTER
    );
    if (moment(this.job.nextDate().toJSDate()).diff(moment(), "seconds") > 5)
      this.getNextBunch().catch(this.logger.error);
  }

  @Cron("* * * * *", { name: TIMER_SERVICE_CRON_BUNCH_GETTER })
  private async getNextBunch() {
    const nextDate = this.job.nextDate();
    const nextActions = await this.timedActionModel.find({
      execTime: {
        $lte: nextDate.toJSDate(),
      },
    });
    nextActions.forEach((action) => this._startActionTimeout(action));
  }

  @Transactional({ propagation: Propagation.SUPPORTS })
  public async clearTimer(timerId: Types.ObjectId) {
    const timerIdString = timerId.toHexString();
    await this.timedActionModel.deleteOne({ _id: timerId });
    if (this.timeoutMap.has(timerIdString)) {
      const timeout = this.timeoutMap.get(timerIdString);
      this.timeoutMap.delete(timerIdString);
      clearTimeout(timeout);
    }
  }

  @Transactional({ propagation: Propagation.SUPPORTS })
  public async clearTimers(timerIds: Types.ObjectId[]) {
    const timerIdsStrings = timerIds.map((item) => item.toHexString());
    await this.timedActionModel.deleteMany({ _id: { $in: timerIds } });
    timerIdsStrings.forEach((timerIdString) => {
      if (this.timeoutMap.has(timerIdString)) {
        const timeout = this.timeoutMap.get(timerIdString);
        this.timeoutMap.delete(timerIdString);
        clearTimeout(timeout);
      }
    });
  }
}
