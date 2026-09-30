import prisma from './lib/prisma';
import { createEtherealAccount } from './services/emailService';
import { indexEmail } from './lib/elasticsearch';

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Create Demo User
  const user = await prisma.user.upsert({
    where: { email: 'demo@reachinbox.ai' },
    update: {},
    create: {
      googleId: 'demo-user-12345',
      name: 'ReachInbox Demo User',
      email: 'demo@reachinbox.ai',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
  });

  console.log(`👤 User ready: ${user.name} (${user.email})`);

  // 2. Create Ethereal Sender
  let sender = await prisma.sender.findFirst({
    where: { userId: user.id },
  });

  if (!sender) {
    try {
      const ethereal = await createEtherealAccount();
      sender = await prisma.sender.create({
        data: {
          userId: user.id,
          email: ethereal.email,
          etherealUser: ethereal.user,
          etherealPass: ethereal.pass,
          displayName: 'Demo Growth Lead',
        },
      });
      console.log(`📫 Ethereal sender created: ${sender.email}`);
    } catch {
      sender = await prisma.sender.create({
        data: {
          userId: user.id,
          email: 'outreach@reachinbox.ai',
          etherealUser: 'test_user',
          etherealPass: 'test_pass',
          displayName: 'Demo Growth Lead',
        },
      });
      console.log(`📫 Fallback sender created: ${sender.email}`);
    }
  }

  // 3. Seed sample scheduled and sent emails if table is empty
  const emailCount = await prisma.email.count({ where: { userId: user.id } });
  if (emailCount === 0) {
    const now = new Date();
    const sampleEmails = [
      {
        recipient: 'alex.rivera@techcorp.io',
        subject: 'Quick question regarding Outbox Labs AI outreach',
        body: '<p>Hi Alex,</p><p>Loved your recent post on AI agent workflows. Would love to share how ReachInbox scales personalized outreach.</p><p>Best,<br>Growth Team</p>',
        scheduledAt: new Date(now.getTime() + 1000 * 60 * 15), // 15 mins in future
        status: 'SCHEDULED' as const,
        idempotencyKey: 'seed-email-1',
      },
      {
        recipient: 'sarah.chen@innovate.co',
        subject: 'ReachInbox <> Innovate partnership discussion',
        body: '<p>Hi Sarah,</p><p>Are you open to exploring a quick pilot for our outbound email scheduler?</p><p>Cheers,<br>ReachInbox</p>',
        scheduledAt: new Date(now.getTime() + 1000 * 60 * 45), // 45 mins in future
        status: 'SCHEDULED' as const,
        idempotencyKey: 'seed-email-2',
      },
      {
        recipient: 'marcus.vance@ventureflow.net',
        subject: 'Introducing ReachInbox: Autonomous cold email engine',
        body: '<p>Hi Marcus,</p><p>Reaching out following your company newsletter feature.</p>',
        scheduledAt: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2 hrs ago
        sentAt: new Date(now.getTime() - 1000 * 60 * 60 * 2 + 1000 * 3),
        status: 'SENT' as const,
        idempotencyKey: 'seed-email-3',
      },
      {
        recipient: 'elena.rostova@hypergrowth.ai',
        subject: 'Follow-up on product demo for HyperGrowth team',
        body: '<p>Hi Elena,</p><p>Following up on our product demo from earlier this week.</p>',
        scheduledAt: new Date(now.getTime() - 1000 * 60 * 60 * 5),
        sentAt: new Date(now.getTime() - 1000 * 60 * 60 * 5 + 1000 * 4),
        status: 'SENT' as const,
        idempotencyKey: 'seed-email-4',
      },
    ];

    for (const em of sampleEmails) {
      const created = await prisma.email.create({
        data: {
          userId: user.id,
          senderId: sender.id,
          recipient: em.recipient,
          subject: em.subject,
          body: em.body,
          scheduledAt: em.scheduledAt,
          sentAt: em.sentAt,
          status: em.status,
          idempotencyKey: em.idempotencyKey,
        },
      });

      // Try index in Elasticsearch if alive
      try {
        await indexEmail({
          id: created.id,
          userId: user.id,
          senderId: sender.id,
          senderEmail: sender.email,
          recipient: created.recipient,
          subject: created.subject,
          body: created.body,
          status: created.status,
          scheduledAt: created.scheduledAt.toISOString(),
          sentAt: created.sentAt?.toISOString(),
          createdAt: created.createdAt.toISOString(),
        });
      } catch { /* ignore ES */ }
    }
    console.log(`✉️ Seeded ${sampleEmails.length} sample emails!`);
  }

  console.log('✅ Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
