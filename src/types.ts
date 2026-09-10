// ---------------------------------------------------------------------------
// Core taste vocabulary
// ---------------------------------------------------------------------------
export type Mood = 'spicy' | 'soupy' | 'crispy' | 'cheesy' | 'fresh' | 'comfort' | 'sweet' | 'smoky';

export type Cuisine =
  | 'Italian' | 'Japanese' | 'Mexican' | 'Thai' | 'American' | 'Mediterranean'
  | 'Indian' | 'Korean' | 'Chinese' | 'Vietnamese' | 'Caribbean' | 'Middle Eastern';

// Version 4 discovery attributes. Kept as string unions for ergonomics, but the
// Dish model stores them as plain string[] so unknown tags never break parsing.
export type Texture = 'crispy' | 'crunchy' | 'creamy' | 'silky' | 'chewy' | 'juicy' | 'flaky' | 'tender' | 'crumbly';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
export type Protein = 'chicken' | 'beef' | 'pork' | 'lamb' | 'seafood' | 'egg' | 'tofu' | 'beans' | 'paneer' | 'none';
export type DietaryTag = 'vegetarian' | 'vegan' | 'pescatarian' | 'gluten-free' | 'dairy-free' | 'nut-free' | 'halal';
export type Temperature = 'hot' | 'cold';
export type Fullness = 'light' | 'filling';

// ---------------------------------------------------------------------------
// Dishes
// ---------------------------------------------------------------------------
export type DishImage = {
  url: string;
  alt: string;
  sourceName?: string;
  sourceUrl?: string;
  photographer?: string;
};

export type Dish = {
  id: string;
  name: string;
  cuisine: Cuisine;
  description: string;
  images: DishImage[];
  moods: Mood[];
  textures: string[];
  mealTypes: string[];
  dietaryTags: string[];
  proteins: string[];
  spiceLevel: number; // 0-4
  price: number;      // 1-3
  time: number;       // minutes
  searchTerms: string[];
  // Backward-compatible convenience fields, always populated by defineDish().
  image: string;
  tags: string[];
};

// ---------------------------------------------------------------------------
// Solo history
// ---------------------------------------------------------------------------
export type SwipeChoice = 'like' | 'pass';
export type SwipeRecord = { id?: string; dishId: string; choice: SwipeChoice; at: number };

export type Filters = {
  moods: Mood[];
  cuisines: Cuisine[];
  textures: Texture[];
  mealTypes: MealType[];
  proteins: Protein[];
  dietary: DietaryTag[];
  maxSpice: number | null;   // null = any
  maxPrice: number | null;   // null = any
  temperature: Temperature | null;
  fullness: Fullness | null;
};

export type PreferenceSession = {
  id: string;
  moods: Mood[];
  cuisines: Cuisine[];
  createdAt: number;
  // Optional richer filters (local only; not written to the cloud schema).
  filters?: Partial<Omit<Filters, 'moods' | 'cuisines'>>;
};

export type TasteSignal = { label: string; kind: 'mood' | 'cuisine'; score: number };

// ---------------------------------------------------------------------------
// Shared craving rooms (Version 4)
// ---------------------------------------------------------------------------
export type RoomStatus = 'waiting' | 'swiping' | 'completed' | 'closed';

export type CravingRoom = {
  id: string;
  code: string;
  name: string;
  createdBy: string;
  status: RoomStatus;
  dishIds: string[];
  selectedMoods: Mood[];
  selectedCuisines: Cuisine[];
  createdAt: number;
  expiresAt: number | null;
};

export type RoomMember = {
  roomId: string;
  userId: string;
  displayName: string;
  joinedAt: number;
  completedAt: number | null;
};

export type RoomSwipe = {
  roomId: string;
  userId: string;
  dishId: string;
  choice: SwipeChoice;
  swipedAt: number;
};

export type GroupMatch = {
  dish: Dish;
  likes: number;
  passes: number;
  voters: number;          // members who swiped this dish at all
  totalMembers: number;
  likeRatio: number;       // likes / totalMembers (0-1)
  unanimous: boolean;
  score: number;
  explanation: string;     // e.g. "3 of 4 friends liked this"
};

export type GroupResult = {
  everyoneFinished: boolean;
  totalMembers: number;
  finishedMembers: number;
  best: GroupMatch | null;
  alternatives: GroupMatch[];
};
