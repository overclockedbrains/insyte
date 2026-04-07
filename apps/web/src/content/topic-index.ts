// Topic catalog — all 24 pre-built simulations
// Used by the Explore page, search, and FeaturedSimulations.

import type { SceneType } from '@insyte/scene-engine'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TopicCategory =
  | 'Data Structures & Algorithms'
  | 'System Design'
  | 'Networking'
  | 'Low Level Design'
  | 'Concepts'

export interface TopicEntry {
  slug: string
  title: string
  description: string
  category: TopicCategory
  tags: string[]
  type: SceneType
  isFeatured: boolean
  isPrebuilt: boolean
}

// ─── Catalog ──────────────────────────────────────────────────────────────────

export const topicIndex: TopicEntry[] = [
  // ── Concept Explorer (5) ──────────────────────────────────────────────────

  {
    slug: 'hash-tables',
    title: 'How does a Hash Table work?',
    description:
      'Visualize key insertion, hash collisions, and chaining strategies in real time.',
    category: 'Data Structures & Algorithms',
    tags: ['hash table', 'hashmap', 'collision', 'chaining', 'data structure'],
    type: 'concept',
    isFeatured: true,
    isPrebuilt: true,
  },
  {
    slug: 'js-event-loop',
    title: 'How does the JS Event Loop work?',
    description:
      'Watch the call stack, task queue, and microtask queue orchestrate JavaScript execution.',
    category: 'Concepts',
    tags: ['javascript', 'event loop', 'call stack', 'async', 'microtask', 'queue'],
    type: 'concept',
    isFeatured: true,
    isPrebuilt: true,
  },
  {
    slug: 'load-balancer',
    title: 'How does Load Balancing work?',
    description:
      'See round-robin and weighted routing distribute traffic across servers live.',
    category: 'System Design',
    tags: ['load balancer', 'round robin', 'system design', 'traffic', 'routing'],
    type: 'concept',
    isFeatured: false,
    isPrebuilt: true,
  },
  {
    slug: 'dns-resolution',
    title: 'How does DNS Resolution work?',
    description:
      'Follow a DNS query from browser to root nameserver and back, step by step.',
    category: 'Networking',
    tags: ['dns', 'domain', 'nameserver', 'networking', 'resolution', 'ip'],
    type: 'concept',
    isFeatured: true,
    isPrebuilt: true,
  },
  {
    slug: 'git-branching',
    title: 'How does Git Branching work?',
    description:
      'Create branches, commit, merge, and resolve conflicts in a visual commit graph.',
    category: 'Concepts',
    tags: ['git', 'branch', 'merge', 'commit', 'version control'],
    type: 'concept',
    isFeatured: false,
    isPrebuilt: true,
  },

  // ── DSA Visualizer (10) ───────────────────────────────────────────────────

  {
    slug: 'two-sum',
    title: 'Two Sum',
    description:
      'HashMap-based O(n) solution with step-by-step trace highlighting lookups and insertions.',
    category: 'Data Structures & Algorithms',
    tags: ['two sum', 'array', 'hashmap', 'leetcode', 'dsa'],
    type: 'dsa-trace',
    isFeatured: false,
    isPrebuilt: true,
  },
  {
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    description:
      'Trace a stack-based bracket matching algorithm with push/pop animations.',
    category: 'Data Structures & Algorithms',
    tags: ['stack', 'parentheses', 'brackets', 'leetcode', 'dsa'],
    type: 'dsa-trace',
    isFeatured: false,
    isPrebuilt: true,
  },
  {
    slug: 'binary-search',
    title: 'Binary Search',
    description:
      'Watch two-pointer narrowing on a sorted array, cutting the search space in half each step.',
    category: 'Data Structures & Algorithms',
    tags: ['binary search', 'array', 'two pointers', 'sorted', 'leetcode', 'dsa'],
    type: 'dsa-trace',
    isFeatured: false,
    isPrebuilt: true,
  },
  {
    slug: 'reverse-linked-list',
    title: 'Reverse Linked List',
    description:
      'Animate pointer rewiring to reverse a singly linked list in-place.',
    category: 'Data Structures & Algorithms',
    tags: ['linked list', 'reverse', 'pointers', 'leetcode', 'dsa'],
    type: 'dsa-trace',
    isFeatured: false,
    isPrebuilt: true,
  },
  {
    slug: 'climbing-stairs',
    title: 'Climbing Stairs (DP)',
    description:
      'Fill a 1D DP table step by step to count distinct ways to reach the top.',
    category: 'Data Structures & Algorithms',
    tags: ['dynamic programming', 'dp', 'fibonacci', 'leetcode', 'dsa'],
    type: 'dsa-trace',
    isFeatured: false,
    isPrebuilt: true,
  },
  {
    slug: 'merge-sort',
    title: 'Merge Sort',
    description:
      'Watch recursive divide-and-conquer splitting and merging subarrays with O(n log n) proof.',
    category: 'Data Structures & Algorithms',
    tags: ['merge sort', 'sorting', 'divide and conquer', 'recursion', 'dsa'],
    type: 'dsa-trace',
    isFeatured: false,
    isPrebuilt: true,
  },
  {
    slug: 'level-order-bfs',
    title: 'Binary Tree Level Order',
    description:
      'BFS traversal of a binary tree using a queue — see each level highlighted in sequence.',
    category: 'Data Structures & Algorithms',
    tags: ['bfs', 'binary tree', 'level order', 'queue', 'tree', 'leetcode', 'dsa'],
    type: 'dsa-trace',
    isFeatured: false,
    isPrebuilt: true,
  },
  {
    slug: 'number-of-islands',
    title: 'Number of Islands',
    description:
      'Grid DFS flood-fill visualized on a matrix — watch connected land cells get explored.',
    category: 'Data Structures & Algorithms',
    tags: ['dfs', 'grid', 'matrix', 'flood fill', 'graph', 'leetcode', 'dsa'],
    type: 'dsa-trace',
    isFeatured: false,
    isPrebuilt: true,
  },
  {
    slug: 'sliding-window-max',
    title: 'Sliding Window Maximum',
    description:
      'Deque-based sliding window with animated window highlight and max tracking.',
    category: 'Data Structures & Algorithms',
    tags: ['sliding window', 'deque', 'array', 'monotonic', 'leetcode', 'dsa'],
    type: 'dsa-trace',
    isFeatured: false,
    isPrebuilt: true,
  },
  {
    slug: 'fibonacci-recursive',
    title: 'Fibonacci (Memoization)',
    description:
      'Expanding recursion tree with memoization pruning — see redundant calls vanish.',
    category: 'Data Structures & Algorithms',
    tags: ['fibonacci', 'memoization', 'recursion', 'dp', 'tree', 'dsa'],
    type: 'dsa-trace',
    isFeatured: false,
    isPrebuilt: true,
  },

  // ── LLD Simulations (5) ───────────────────────────────────────────────────

  {
    slug: 'lru-cache',
    title: 'LRU Cache',
    description:
      'Least Recently Used cache implemented with a doubly linked list + hashmap.',
    category: 'Low Level Design',
    tags: ['lru cache', 'cache', 'linked list', 'hashmap', 'lld', 'design'],
    type: 'lld',
    isFeatured: false,
    isPrebuilt: true,
  },
  {
    slug: 'rate-limiter',
    title: 'Rate Limiter (Token Bucket)',
    description:
      'Token bucket algorithm with live token refills and request rejection visualization.',
    category: 'Low Level Design',
    tags: ['rate limiter', 'token bucket', 'throttling', 'lld', 'design'],
    type: 'lld',
    isFeatured: false,
    isPrebuilt: true,
  },
  {
    slug: 'min-stack',
    title: 'MinStack',
    description:
      'Dual-stack implementation that retrieves the minimum element in O(1) time.',
    category: 'Low Level Design',
    tags: ['stack', 'min stack', 'lld', 'design', 'data structure'],
    type: 'lld',
    isFeatured: false,
    isPrebuilt: true,
  },
  {
    slug: 'trie',
    title: 'Trie',
    description:
      'Prefix tree with animated character-by-character insert and search traversal.',
    category: 'Low Level Design',
    tags: ['trie', 'prefix tree', 'string', 'search', 'lld', 'design'],
    type: 'lld',
    isFeatured: false,
    isPrebuilt: true,
  },
  {
    slug: 'design-hashmap',
    title: 'Design HashMap from Scratch',
    description:
      'Build a hashmap with custom hashing, bucket arrays, and collision resolution.',
    category: 'Low Level Design',
    tags: ['hashmap', 'design', 'hash function', 'collision', 'lld'],
    type: 'lld',
    isFeatured: false,
    isPrebuilt: true,
  },

  // ── HLD Interactive Architectures (4) ────────────────────────────────────

  {
    slug: 'url-shortener',
    title: 'URL Shortener',
    description:
      'End-to-end architecture: hashing, redirect DB, CDN, and analytics pipeline.',
    category: 'System Design',
    tags: ['url shortener', 'system design', 'hld', 'caching', 'database'],
    type: 'hld',
    isFeatured: false,
    isPrebuilt: true,
  },
  {
    slug: 'twitter-feed',
    title: 'Twitter Feed (Fanout)',
    description:
      'Fanout-on-write vs fanout-on-read strategies with live feed population.',
    category: 'System Design',
    tags: ['twitter', 'fanout', 'feed', 'system design', 'hld', 'social'],
    type: 'hld',
    isFeatured: true,
    isPrebuilt: true,
  },
  {
    slug: 'consistent-hashing',
    title: 'Consistent Hashing',
    description:
      'Virtual nodes on a hash ring — watch data redistribution when servers join/leave.',
    category: 'System Design',
    tags: ['consistent hashing', 'distributed', 'hash ring', 'system design', 'hld'],
    type: 'hld',
    isFeatured: false,
    isPrebuilt: true,
  },
  {
    slug: 'chat-system',
    title: 'Chat System (WebSocket)',
    description:
      'Real-time message routing via WebSocket connections, presence service, and message queue.',
    category: 'System Design',
    tags: ['chat', 'websocket', 'real-time', 'system design', 'hld', 'messaging'],
    type: 'hld',
    isFeatured: false,
    isPrebuilt: true,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getTopicsByCategory(category: TopicCategory): TopicEntry[] {
  return topicIndex.filter((t) => t.category === category)
}

export function getTopicBySlug(slug: string): TopicEntry | null {
  return topicIndex.find((t) => t.slug === slug) ?? null
}

export function getFeaturedTopics(): TopicEntry[] {
  return topicIndex.filter((t) => t.isFeatured)
}

export function searchTopics(query: string): TopicEntry[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  return topicIndex.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      t.description.toLowerCase().includes(q),
  )
}
