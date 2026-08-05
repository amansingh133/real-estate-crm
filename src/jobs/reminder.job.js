import cron from "node-cron";
import { Lead } from "../models/lead.model.js";
import { sendPushNotification } from "../services/fcm.service.js";
import { env } from "../config/env.js";
import { LEAD_STATUS } from "../utils/constants.js";

/**
 * Reminder rules (per spec):
 * - Start reminding 30 minutes before nextFollowUpDate.
 * - Keep reminding "at regular intervals" until the scheduled time.
 * - A lead with status VISIT_PLANNED reuses the same nextFollowUpDate as its
 *   visit time, so this single job covers both follow-up and visit reminders.
 *
 * Implementation: every `cronIntervalMinutes` (default 5), find leads whose
 * nextFollowUpDate falls within the next `leadMinutes` (default 30) window
 * and that haven't been reminded in the last `cronIntervalMinutes`, then
 * push a notification to the assigned user's registered devices.
 */
const runReminderSweep = async () => {
  const now = new Date();
  const windowEnd = new Date(
    now.getTime() + env.reminder.leadMinutes * 60 * 1000,
  );
  const debounceThreshold = new Date(
    now.getTime() - env.reminder.cronIntervalMinutes * 60 * 1000,
  );

  const dueLeads = await Lead.find({
    nextFollowUpDate: { $gte: now, $lte: windowEnd },
    status: { $nin: [LEAD_STATUS.CONVERTED, LEAD_STATUS.DROPPED] },
    $or: [
      { lastReminderSentAt: null },
      { lastReminderSentAt: { $lte: debounceThreshold } },
    ],
  }).populate("assignedTo", "fcmTokens name");

  for (const lead of dueLeads) {
    const isVisit = lead.status === LEAD_STATUS.VISIT_PLANNED;
    const title = isVisit ? "Upcoming site visit" : "Upcoming follow-up";
    const body = `${lead.name} - ${isVisit ? "visit" : "follow-up"} scheduled at ${new Date(
      lead.nextFollowUpDate,
    ).toLocaleString()}`;

    try {
      await sendPushNotification({
        tokens: lead.assignedTo?.fcmTokens || [],
        title,
        body,
        data: {
          leadId: lead._id.toString(),
          type: isVisit ? "VISIT" : "FOLLOWUP",
        },
      });
    } finally {
      lead.lastReminderSentAt = now;
      // eslint-disable-next-line no-await-in-loop
      await lead.save();
    }
  }

  return dueLeads.length;
};

export const startReminderJob = () => {
  const cronExpression = `*/${env.reminder.cronIntervalMinutes} * * * *`;
  cron.schedule(cronExpression, async () => {
    try {
      const count = await runReminderSweep();
      if (count > 0) {
        // eslint-disable-next-line no-console
        console.log(`🔔 Reminder job: sent ${count} reminder(s)`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Reminder job failed:", error.message);
    }
  });
  // eslint-disable-next-line no-console
  console.log(
    `⏰ Reminder cron job scheduled (every ${env.reminder.cronIntervalMinutes} min)`,
  );
};

// Exported for testing / manual trigger via a debug route if ever needed.
export { runReminderSweep };
