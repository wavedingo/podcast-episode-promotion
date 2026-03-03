import type { SocialPlatform } from '@/types/generation';

const BUFFER_API_URL = 'https://api.buffer.com/graphql';

function getToken(): string {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  if (!token) throw new Error('BUFFER_ACCESS_TOKEN is not configured');
  return token;
}

async function gql<T>(query: string): Promise<T> {
  const res = await fetch(BUFFER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Buffer API ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e: { message: string }) => e.message).join('; '));
  }

  return json.data as T;
}

// ─── Channel helpers ────────────────────────────────────────────────────────

export interface BufferChannel {
  id: string;
  name: string;
  displayName: string;
  service: string;
  avatar: string;
  isQueuePaused: boolean;
}

/** Fetches all channels across all organizations for the authenticated account. */
export async function listBufferChannels(): Promise<BufferChannel[]> {
  const orgData = await gql<{ account: { organizations: { id: string; name: string }[] } }>(`
    query GetOrganizations {
      account {
        organizations {
          id
          name
        }
      }
    }
  `);

  const orgs = orgData.account.organizations;
  if (!orgs.length) throw new Error('No Buffer organizations found');

  const allChannels: BufferChannel[] = [];
  for (const org of orgs) {
    // Inline the org ID — avoids needing the OrganizationId! custom scalar type in variable decls
    const channelData = await gql<{ channels: BufferChannel[] }>(`
      query GetChannels {
        channels(input: { organizationId: ${JSON.stringify(org.id)} }) {
          id
          name
          displayName
          service
          avatar
          isQueuePaused
        }
      }
    `);
    allChannels.push(...channelData.channels);
  }

  return allChannels;
}

// ─── Platform → channel ID mapping ─────────────────────────────────────────

export function getChannelId(platform: SocialPlatform): string | undefined {
  // Read at call time so Next.js module caching doesn't freeze an empty value
  const map: Record<SocialPlatform, string | undefined> = {
    instagram: process.env.BUFFER_CHANNEL_INSTAGRAM,
    facebook: process.env.BUFFER_CHANNEL_FACEBOOK,
    twitter: process.env.BUFFER_CHANNEL_TWITTER,
    tiktok: process.env.BUFFER_CHANNEL_TIKTOK,
  };
  return map[platform] || undefined;
}

// ─── Post creation ──────────────────────────────────────────────────────────

/** Creates a scheduled post in Buffer via the GraphQL API. */
export async function createBufferPost({
  channelId,
  text,
  scheduledAt,
  imageUrl,
}: {
  channelId: string;
  text: string;
  scheduledAt: string; // ISO 8601 datetime
  imageUrl?: string;   // absolute URL; if provided, attached as an image asset
}): Promise<void> {
  // Inline all values using JSON.stringify to handle special chars in text.
  // This avoids declaring custom scalar types (ChannelId!, DateTime!, etc.) as variables.
  const assetsFragment = imageUrl
    ? `, assets: { images: [{ url: ${JSON.stringify(imageUrl)} }] }`
    : '';

  const result = await gql<{
    createPost:
      | { __typename: 'PostActionSuccess'; post: { id: string } }
      | { __typename: 'MutationError'; message: string };
  }>(`
    mutation CreatePost {
      createPost(input: {
        channelId: ${JSON.stringify(channelId)},
        text: ${JSON.stringify(text)},
        schedulingType: automatic,
        mode: customScheduled,
        dueAt: ${JSON.stringify(scheduledAt)}${assetsFragment}
      }) {
        ... on PostActionSuccess {
          post {
            id
          }
        }
        ... on MutationError {
          message
        }
      }
    }
  `);

  const outcome = result.createPost;
  if (outcome.__typename === 'MutationError') {
    throw new Error(outcome.message);
  }
}
