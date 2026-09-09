export type Mood = 'spicy' | 'soupy' | 'crispy' | 'cheesy' | 'fresh' | 'comfort' | 'sweet' | 'smoky';
export type Cuisine = 'Italian' | 'Japanese' | 'Mexican' | 'Thai' | 'American' | 'Mediterranean' | 'Indian' | 'Korean';
export type Dish = { id: string; name: string; cuisine: Cuisine; image: string; moods: Mood[]; tags: string[]; price: 1 | 2 | 3; time: number; description: string };
export type SwipeChoice = 'like' | 'pass';
export type SwipeRecord = { id?: string; dishId: string; choice: SwipeChoice; at: number };
export type PreferenceSession = { id: string; moods: Mood[]; cuisines: Cuisine[]; createdAt: number };
export type TasteSignal = { label: string; kind: 'mood' | 'cuisine'; score: number };
