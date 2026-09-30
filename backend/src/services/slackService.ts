import { config } from '../config';
import prisma from '../lib/prisma';

/**
 * Slack notification service.
 *
 * Handles sending messages to a user's connected Slack workspace
 * when their rate limit is hit. Uses the Slack Web API with
 * stored OAuth tokens.
 *
 * If Slack is not connected, notifications are silently skipped.
 */
export class SlackService {
  /**
   * Send a rate-limit notification to a user's Slack.
   * Gracefully does nothing if Slack is not connected.
   */
  static async notifyRateLimitHit(params: {
    userId: string;
    senderEmail: string;
    currentCount: number;
    limit: number;
    hourWindow: string;
  }): Promise<void> {
    try {
      const connection = await prisma.slackConnection.findUnique({
        where: { userId: params.userId },
      });

      if (!connection) {
        // Slack not connected — silently skip
        console.log(`[Slack] No connection for user ${params.userId}, skipping notification`);
        return;
      }

      const message = {
        text: `⚠️ *Email Rate Limit Reached*\n\n` +
          `• *Sender:* ${params.senderEmail}\n` +
          `• *Emails sent:* ${params.currentCount}/${params.limit}\n` +
          `• *Window:* ${params.hourWindow}\n` +
          `• Queued emails will automatically continue in the next available hour window.\n\n` +
          `_Sent by ReachInbox Scheduler_`,
      };

      // If we have a webhook URL, use that (simpler)
      if (connection.webhookUrl) {
        await fetch(connection.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });
        console.log(`[Slack] Rate limit notification sent via webhook for user ${params.userId}`);
        return;
      }

      // Otherwise, use the chat.postMessage API with the access token
      if (connection.accessToken && connection.channelId) {
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${connection.accessToken}`,
          },
          body: JSON.stringify({
            channel: connection.channelId,
            text: message.text,
            mrkdwn: true,
          }),
        });
        console.log(`[Slack] Rate limit notification sent via API for user ${params.userId}`);
      }
    } catch (err: any) {
      // Slack failures should never crash the email pipeline
      console.error(`[Slack] Notification error for user ${params.userId}:`, err.message);
    }
  }

  /**
   * Get the Slack OAuth authorization URL.
   */
  static getAuthUrl(state: string): string {
    const scopes = 'chat:write,incoming-webhook';
    return (
      `https://slack.com/oauth/v2/authorize?` +
      `client_id=${config.slack.clientId}` +
      `&scope=${scopes}` +
      `&redirect_uri=${encodeURIComponent(config.slack.redirectUri)}` +
      `&state=${state}`
    );
  }

  /**
   * Exchange an OAuth code for an access token.
   */
  static async exchangeCode(code: string): Promise<{
    accessToken: string;
    teamId: string;
    teamName: string;
    webhookUrl?: string;
    channelId?: string;
  }> {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.slack.clientId,
        client_secret: config.slack.clientSecret,
        code,
        redirect_uri: config.slack.redirectUri,
      }),
    });

    const data = await response.json() as any;

    if (!data.ok) {
      throw new Error(`Slack OAuth error: ${data.error}`);
    }

    return {
      accessToken: data.access_token,
      teamId: data.team?.id || '',
      teamName: data.team?.name || '',
      webhookUrl: data.incoming_webhook?.url,
      channelId: data.incoming_webhook?.channel_id,
    };
  }
}
