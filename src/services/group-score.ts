// Pure group-recommendation scoring. No React / RN / async imports so it can be
// unit-tested directly with `tsx`.
import { Dish, GroupMatch, GroupResult, RoomSwipe, SwipeChoice } from '@/types';

export type GroupMemberInput = { userId: string; completed: boolean };

export type GroupScoreInput = {
  deck: Dish[];
  members: GroupMemberInput[];
  swipes: RoomSwipe[];
  // dishId -> combined personal recommendation score (any scale). Optional; used
  // only as a lower-priority tie-breaker and never surfaced to users.
  personalScores?: Record<string, number>;
};

export type DishTally = { likes: number; passes: number; voters: number };

export type GroupTallyInput = {
  deck: Dish[];
  totalMembers: number;
  finishedMembers: number;
  tallies: Record<string, DishTally>;
  personalScores?: Record<string, number>;
};

// Latest swipe per (user, dish) wins, so re-swipes and duplicate realtime events
// collapse to one vote.
function dedupeSwipes(swipes: RoomSwipe[]): Map<string, Map<string, SwipeChoice>> {
  const latestAt = new Map<string, number>();
  const byDish = new Map<string, Map<string, SwipeChoice>>();
  for (const swipe of swipes) {
    const key = `${swipe.userId}::${swipe.dishId}`;
    if ((latestAt.get(key) ?? -Infinity) > swipe.swipedAt) continue;
    latestAt.set(key, swipe.swipedAt);
    if (!byDish.has(swipe.dishId)) byDish.set(swipe.dishId, new Map());
    byDish.get(swipe.dishId)!.set(swipe.userId, swipe.choice);
  }
  return byDish;
}

function explain(likes: number, total: number, unanimous: boolean): string {
  if (total === 0) return 'No votes yet';
  if (likes === 0) return 'No friends liked this yet';
  if (unanimous) return total === 1 ? 'You liked this' : 'Everyone liked this';
  return `${likes} of ${total} ${total === 1 ? 'friend' : 'friends'} liked this`;
}

// Shared ranking used by both the raw-swipe and pre-aggregated (RPC) paths.
function buildResult(
  deck: Dish[],
  totalMembers: number,
  finishedMembers: number,
  tally: (dishId: string) => DishTally,
  personalScores: Record<string, number> | undefined,
): GroupResult {
  const everyoneFinished = totalMembers > 0 && finishedMembers === totalMembers;
  const rawPersonal = personalScores ?? {};
  const personalValues = deck.map((d) => rawPersonal[d.id]).filter((v): v is number => typeof v === 'number');
  const pMin = personalValues.length ? Math.min(...personalValues) : 0;
  const pMax = personalValues.length ? Math.max(...personalValues) : 1;
  const personalNorm = (id: string) => {
    const value = rawPersonal[id];
    if (typeof value !== 'number' || pMax === pMin) return 0;
    return (value - pMin) / (pMax - pMin);
  };

  const matches: GroupMatch[] = deck.map((dish) => {
    const { likes, passes, voters } = tally(dish.id);
    const likeRatio = totalMembers > 0 ? likes / totalMembers : 0;
    const unanimous = totalMembers > 0 && likes === totalMembers;
    // Scalar score is display/debug only; ordering uses the comparator below so
    // consensus priority is exact rather than weight-dependent.
    const score = (unanimous ? 1000 : 0) + likeRatio * 100 - passes * 3 + personalNorm(dish.id) * 8;
    return { dish, likes, passes, voters, totalMembers, likeRatio, unanimous, score, explanation: explain(likes, totalMembers, unanimous) };
  });

  const ranked = matches
    .filter((m) => m.likes > 0)
    .sort((a, b) => {
      if (a.unanimous !== b.unanimous) return a.unanimous ? -1 : 1;   // 1. unanimous likes
      if (a.likes !== b.likes) return b.likes - a.likes;               // 2. liked by most
      const pa = Math.round(personalNorm(a.dish.id) * 1000);
      const pb = Math.round(personalNorm(b.dish.id) * 1000);
      if (pa !== pb) return pb - pa;                                   // 3. personalized score
      if (a.passes !== b.passes) return a.passes - b.passes;           // 4. fewest passes
      return a.dish.name.localeCompare(b.dish.name);                   // stable
    });

  return {
    everyoneFinished,
    totalMembers,
    finishedMembers,
    best: ranked[0] ?? null,
    alternatives: ranked.slice(1, 4),
  };
}

export function scoreGroup(input: GroupScoreInput): GroupResult {
  const totalMembers = input.members.length;
  const finishedMembers = input.members.filter((m) => m.completed).length;
  const byDish = dedupeSwipes(input.swipes);
  const tally = (dishId: string): DishTally => {
    const votes = byDish.get(dishId) ?? new Map<string, SwipeChoice>();
    let likes = 0;
    let passes = 0;
    votes.forEach((choice) => (choice === 'like' ? (likes += 1) : (passes += 1)));
    return { likes, passes, voters: votes.size };
  };
  return buildResult(input.deck, totalMembers, finishedMembers, tally, input.personalScores);
}

export function scoreGroupFromTallies(input: GroupTallyInput): GroupResult {
  const empty: DishTally = { likes: 0, passes: 0, voters: 0 };
  return buildResult(
    input.deck,
    input.totalMembers,
    input.finishedMembers,
    (dishId) => input.tallies[dishId] ?? empty,
    input.personalScores,
  );
}

export const matchPercent = (match: Pick<GroupMatch, 'likeRatio'>) => Math.round(match.likeRatio * 100);
