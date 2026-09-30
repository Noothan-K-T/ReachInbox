import { Client } from '@elastic/elasticsearch';
import { config } from '../config';

export const esClient = new Client({
  node: config.elasticsearch.url,
});

const EMAIL_INDEX = 'emails';

export async function initElasticsearch(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: EMAIL_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: EMAIL_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              senderEmail: { type: 'keyword' },
              recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              subject: { type: 'text' },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              batchId: { type: 'keyword' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      console.log('Elasticsearch "emails" index initialized');
    }
  } catch (err: any) {
    console.warn('Elasticsearch initialization skipped or failed:', err.message);
  }
}

export async function indexEmail(doc: {
  id: string;
  userId: string;
  senderId: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt?: string | null;
  batchId?: string | null;
  createdAt: string;
}): Promise<void> {
  try {
    await esClient.index({
      index: EMAIL_INDEX,
      id: doc.id,
      document: doc,
    });
  } catch (err: any) {
    console.error('Failed to index email in Elasticsearch:', err.message);
  }
}

export async function searchEmails(
  userId: string,
  query: string,
  status?: string,
  from = 0,
  size = 50
) {
  try {
    const must: any[] = [{ term: { userId } }];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['recipient', 'subject', 'body', 'senderEmail'],
          fuzziness: 'AUTO',
        },
      });
    }

    if (status) {
      must.push({ term: { status } });
    }

    const result = await esClient.search({
      index: EMAIL_INDEX,
      body: {
        query: { bool: { must } },
        sort: [{ scheduledAt: { order: 'desc' } }],
        from,
        size,
      },
    });

    return {
      total: (result.hits.total as any)?.value || 0,
      hits: result.hits.hits.map((hit: any) => ({
        ...hit._source,
        _score: hit._score,
      })),
    };
  } catch (err: any) {
    console.error('Elasticsearch search error:', err.message);
    return { total: 0, hits: [] };
  }
}
