import { Dish, DishImage } from '@/types';

// ---------------------------------------------------------------------------
// Image policy
// ---------------------------------------------------------------------------
// Every photo below is hot-linked from Unsplash's CDN and used under the
// Unsplash License (https://unsplash.com/license), which permits this use.
// `sourceName`/`sourceUrl` are kept for attribution; `photographer` is only set
// where it is known (we never invent a credit). `SmartImage` renders a reliable
// fallback if any URL fails, so a broken link never breaks a card.
export const FALLBACK_DISH_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80';

const img = (id: string, alt: string, photographer?: string): DishImage => ({
  url: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`,
  alt,
  sourceName: 'Unsplash',
  sourceUrl: 'https://unsplash.com',
  ...(photographer ? { photographer } : {}),
});

type RawDish = Omit<Dish, 'image' | 'tags'> & { tags?: string[] };

const defineDish = (dish: RawDish): Dish => ({
  ...dish,
  image: dish.images[0]?.url ?? FALLBACK_DISH_IMAGE,
  tags: dish.tags ?? dish.searchTerms.slice(0, 3),
});

export const dishes: Dish[] = [
  // ---------------------------------------------------------------- Italian
  defineDish({
    id: 'hot-honey-pizza', name: 'Hot Honey Pizza', cuisine: 'Italian',
    description: 'Blistered wood-fired crust, creamy mozzarella, and a slow chili-honey glow.',
    images: [
      img('photo-1565299624946-b28f40a0ae38', 'Wood-fired pizza with pepperoni and melted cheese'),
      img('photo-1513104890138-7c749659a591', 'Overhead pizza sliced on a dark board'),
      img('photo-1594007654729-407eedc4be65', 'Close-up of a cheesy pepperoni pizza slice'),
    ],
    moods: ['spicy', 'cheesy', 'comfort'], textures: ['crispy', 'chewy'],
    mealTypes: ['dinner', 'lunch'], dietaryTags: [], proteins: ['pork'],
    spiceLevel: 2, price: 2, time: 25,
    searchTerms: ['hot honey pizza', 'wood fired pizza', 'pizzeria'], tags: ['hot honey', 'wood-fired', 'pepperoni'],
  }),
  defineDish({
    id: 'truffle-tagliatelle', name: 'Truffle Tagliatelle', cuisine: 'Italian',
    description: 'Fresh ribbons of pasta tossed with parmesan cream and earthy black truffle.',
    images: [
      img('photo-1473093295043-cdd812d0e601', 'Twirled tagliatelle pasta with herbs'),
      img('photo-1473091534298-04dcbce3278c', 'Creamy pasta plated with parmesan'),
    ],
    moods: ['cheesy', 'comfort'], textures: ['silky', 'tender'],
    mealTypes: ['dinner'], dietaryTags: ['vegetarian'], proteins: ['none'],
    spiceLevel: 0, price: 3, time: 25,
    searchTerms: ['truffle pasta', 'tagliatelle', 'italian restaurant'], tags: ['truffle', 'parmesan', 'silky'],
  }),
  defineDish({
    id: 'cacio-e-pepe', name: 'Cacio e Pepe', cuisine: 'Italian',
    description: 'Three ingredients done right: pecorino, cracked black pepper, and glossy pasta.',
    images: [
      img('photo-1608219992759-8d74ed8d76eb', 'Bowl of cacio e pepe spaghetti with pepper'),
      img('photo-1551892374-ecf8754cf8b0', 'Spaghetti twirled on a fork'),
    ],
    moods: ['cheesy', 'comfort'], textures: ['silky', 'chewy'],
    mealTypes: ['dinner', 'lunch'], dietaryTags: ['vegetarian'], proteins: ['none'],
    spiceLevel: 1, price: 2, time: 18,
    searchTerms: ['cacio e pepe', 'roman pasta', 'trattoria'], tags: ['pecorino', 'black pepper', 'simple'],
  }),
  defineDish({
    id: 'eggplant-parmigiana', name: 'Eggplant Parmigiana', cuisine: 'Italian',
    description: 'Layered fried eggplant, bright tomato sugo, basil, and bubbling mozzarella.',
    images: [
      img('photo-1601050690597-df0568f70950', 'Baked eggplant parmigiana with melted cheese and tomato'),
      img('photo-1432139509613-5c4255815697', 'Rustic baked pasta bake close-up'),
    ],
    moods: ['cheesy', 'comfort'], textures: ['tender', 'creamy'],
    mealTypes: ['dinner'], dietaryTags: ['vegetarian', 'gluten-free'], proteins: ['none'],
    spiceLevel: 0, price: 2, time: 35,
    searchTerms: ['eggplant parmigiana', 'melanzane', 'italian restaurant'], tags: ['tomato sugo', 'basil', 'baked'],
  }),

  // --------------------------------------------------------------- Japanese
  defineDish({
    id: 'tonkotsu-ramen', name: 'Tonkotsu Ramen', cuisine: 'Japanese',
    description: 'Silky pork-bone broth with a jammy egg, scallion, and springy noodles.',
    images: [
      img('photo-1569718212165-3a8278d5f624', 'Bowl of tonkotsu ramen with egg and pork'),
      img('photo-1591814468924-caf88d1232e1', 'Chopsticks lifting ramen noodles from a bowl'),
      img('photo-1557872943-16a5ac26437e', 'Ramen bowl topped with nori and scallions'),
    ],
    moods: ['soupy', 'comfort'], textures: ['silky', 'chewy'],
    mealTypes: ['dinner', 'lunch'], dietaryTags: [], proteins: ['pork', 'egg'],
    spiceLevel: 1, price: 2, time: 20,
    searchTerms: ['tonkotsu ramen', 'ramen shop', 'japanese noodles'], tags: ['rich broth', 'noodles', 'umami'],
  }),
  defineDish({
    id: 'citrus-salmon-poke', name: 'Citrus Salmon Poke', cuisine: 'Japanese',
    description: 'Bright cubed salmon, avocado, cucumber, rice, and toasted sesame.',
    images: [
      img('photo-1547592180-85f173990554', 'Salmon poke bowl with avocado and rice'),
      img('photo-1526318472351-c75fcf070305', 'Fresh poke bowl with vegetables'),
    ],
    moods: ['fresh'], textures: ['tender', 'juicy'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: ['pescatarian', 'dairy-free', 'gluten-free'], proteins: ['seafood'],
    spiceLevel: 1, price: 3, time: 15,
    searchTerms: ['salmon poke bowl', 'poke', 'hawaiian poke'], tags: ['salmon', 'avocado', 'sesame'],
  }),
  defineDish({
    id: 'chicken-katsu-curry', name: 'Chicken Katsu Curry', cuisine: 'Japanese',
    description: 'Crunchy panko chicken over rice with a mellow, glossy curry sauce.',
    images: [
      img('photo-1604908176997-125f25cc6f3d', 'Chicken katsu curry with rice'),
      img('photo-1580476262798-bddd9f4b7369', 'Breaded cutlet sliced over curry and rice'),
    ],
    moods: ['crispy', 'comfort'], textures: ['crunchy', 'tender'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: [], proteins: ['chicken'],
    spiceLevel: 1, price: 2, time: 28,
    searchTerms: ['chicken katsu curry', 'japanese curry', 'katsu'], tags: ['panko', 'curry sauce', 'rice'],
  }),
  defineDish({
    id: 'salmon-nigiri-set', name: 'Salmon Nigiri Set', cuisine: 'Japanese',
    description: 'Hand-pressed rice and clean, buttery slices of salmon.',
    images: [
      img('photo-1579584425555-c3ce17fd4351', 'Plate of salmon nigiri sushi'),
      img('photo-1611143669185-af224c5e3252', 'Assorted nigiri sushi close-up'),
    ],
    moods: ['fresh'], textures: ['tender', 'silky'],
    mealTypes: ['dinner', 'lunch'], dietaryTags: ['pescatarian', 'dairy-free'], proteins: ['seafood'],
    spiceLevel: 0, price: 3, time: 12,
    searchTerms: ['salmon nigiri', 'sushi bar', 'omakase'], tags: ['salmon', 'sushi rice', 'clean'],
  }),

  // ---------------------------------------------------------------- Mexican
  defineDish({
    id: 'birria-tacos', name: 'Crispy Birria Tacos', cuisine: 'Mexican',
    description: 'Chile-braised beef, molten cheese, and a deeply savory consommé for dipping.',
    images: [
      img('photo-1552332386-f8dd00dc2f85', 'Crispy birria tacos with dipping consomme'),
      img('photo-1624300629298-e9de39c13be5', 'Cheesy quesabirria tacos on a plate'),
      img('photo-1613514785940-daed07799d9b', 'Tacos with red chili braised beef'),
    ],
    moods: ['crispy', 'spicy', 'comfort'], textures: ['crispy', 'juicy'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: [], proteins: ['beef'],
    spiceLevel: 3, price: 2, time: 24,
    searchTerms: ['birria tacos', 'quesabirria', 'taqueria'], tags: ['slow-cooked', 'consommé', 'cheesy'],
  }),
  defineDish({
    id: 'al-pastor-tacos', name: 'Al Pastor Tacos', cuisine: 'Mexican',
    description: 'Spit-roasted pork with charred pineapple, onion, cilantro, and lime.',
    images: [
      img('photo-1565299507177-b0ac66763828', 'Al pastor tacos topped with pineapple'),
      img('photo-1551504734-5ee1c4a1479b', 'Street tacos with cilantro and onion'),
    ],
    moods: ['smoky', 'spicy'], textures: ['juicy', 'tender'],
    mealTypes: ['lunch', 'dinner', 'snack'], dietaryTags: ['dairy-free', 'gluten-free'], proteins: ['pork'],
    spiceLevel: 2, price: 1, time: 20,
    searchTerms: ['al pastor tacos', 'tacos al pastor', 'taqueria'], tags: ['spit-roasted', 'pineapple', 'lime'],
  }),
  defineDish({
    id: 'chicken-tinga-bowl', name: 'Chicken Tinga Bowl', cuisine: 'Mexican',
    description: 'Smoky chipotle chicken over rice and beans with avocado and crema.',
    images: [
      img('photo-1543339308-43e59d6b73a6', 'Mexican rice bowl with chicken and avocado'),
      img('photo-1590301157890-4810ed352733', 'Burrito bowl with beans, rice, and toppings'),
    ],
    moods: ['smoky', 'spicy', 'comfort'], textures: ['tender', 'creamy'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: ['gluten-free'], proteins: ['chicken'],
    spiceLevel: 2, price: 2, time: 22,
    searchTerms: ['chicken tinga bowl', 'burrito bowl', 'mexican grill'], tags: ['chipotle', 'rice & beans', 'avocado'],
  }),
  defineDish({
    id: 'cinnamon-churros', name: 'Cinnamon Churros', cuisine: 'Mexican',
    description: 'Hot, cinnamon-sugar churros with a dark chocolate dipping sauce.',
    images: [
      img('photo-1624371414361-e670edf4898d', 'Cinnamon sugar churros with chocolate sauce'),
      img('photo-1626200419199-391ae4be7a41', 'Freshly fried churros dusted with sugar'),
    ],
    moods: ['sweet', 'crispy', 'comfort'], textures: ['crunchy', 'crumbly'],
    mealTypes: ['dessert', 'snack'], dietaryTags: ['vegetarian'], proteins: ['none'],
    spiceLevel: 0, price: 1, time: 15,
    searchTerms: ['churros', 'churreria', 'mexican dessert'], tags: ['cinnamon sugar', 'chocolate', 'warm'],
  }),

  // ------------------------------------------------------------------- Thai
  defineDish({
    id: 'red-coconut-curry', name: 'Red Coconut Curry', cuisine: 'Thai',
    description: 'Fragrant red curry with coconut milk, Thai basil, lime, and warming spice.',
    images: [
      img('photo-1455619452474-d2be8b1e70cd', 'Bowl of red Thai coconut curry with basil'),
      img('photo-1562565652-a0d8f0c59eb4', 'Thai curry served with jasmine rice'),
    ],
    moods: ['spicy', 'soupy', 'comfort'], textures: ['creamy', 'silky'],
    mealTypes: ['dinner', 'lunch'], dietaryTags: ['gluten-free', 'dairy-free'], proteins: ['chicken'],
    spiceLevel: 3, price: 2, time: 28,
    searchTerms: ['thai red curry', 'coconut curry', 'thai restaurant'], tags: ['coconut', 'thai basil', 'aromatic'],
  }),
  defineDish({
    id: 'pad-thai', name: 'Pad Thai', cuisine: 'Thai',
    description: 'Wok-tossed rice noodles with tamarind, egg, peanuts, and lime.',
    images: [
      img('photo-1559314809-0d155014e29e', 'Plate of pad thai noodles with lime and peanuts'),
      img('photo-1637806930600-37fa8892069d', 'Stir-fried rice noodles with shrimp'),
    ],
    moods: ['sweet', 'comfort'], textures: ['chewy', 'crunchy'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: ['dairy-free'], proteins: ['egg', 'seafood'],
    spiceLevel: 1, price: 2, time: 20,
    searchTerms: ['pad thai', 'thai noodles', 'thai restaurant'], tags: ['tamarind', 'peanuts', 'rice noodles'],
  }),
  defineDish({
    id: 'tom-yum-goong', name: 'Tom Yum Goong', cuisine: 'Thai',
    description: 'Hot-and-sour shrimp soup with lemongrass, galangal, lime, and chili.',
    images: [
      img('photo-1548943487-a2e4e43b4853', 'Bowl of spicy tom yum soup with shrimp'),
      img('photo-1569562211093-4ed0d0758f12', 'Hot and sour Thai soup with herbs'),
    ],
    moods: ['spicy', 'soupy', 'fresh'], textures: ['juicy'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: ['pescatarian', 'gluten-free', 'dairy-free'], proteins: ['seafood'],
    spiceLevel: 4, price: 2, time: 22,
    searchTerms: ['tom yum goong', 'tom yum soup', 'thai restaurant'], tags: ['lemongrass', 'hot & sour', 'shrimp'],
  }),
  defineDish({
    id: 'mango-sticky-rice', name: 'Mango Sticky Rice', cuisine: 'Thai',
    description: 'Warm coconut sticky rice with ripe mango and toasted sesame.',
    images: [
      img('photo-1621293954908-907159247fc8', 'Mango sticky rice with coconut sauce'),
      img('photo-1490474418585-ba9bad8fd0ea', 'Sweet fruit dessert with syrup'),
    ],
    moods: ['sweet', 'fresh'], textures: ['creamy', 'chewy'],
    mealTypes: ['dessert', 'snack'], dietaryTags: ['vegan', 'gluten-free', 'dairy-free'], proteins: ['none'],
    spiceLevel: 0, price: 1, time: 15,
    searchTerms: ['mango sticky rice', 'thai dessert', 'khao niao mamuang'], tags: ['coconut', 'ripe mango', 'sesame'],
  }),

  // --------------------------------------------------------------- American
  defineDish({
    id: 'smash-burger', name: 'Double Smash Burger', cuisine: 'American',
    description: 'Lacy caramelized beef edges, American cheese, pickles, and special sauce.',
    images: [
      img('photo-1568901346375-23c9450c58cd', 'Double smash burger with melted cheese'),
      img('photo-1550547660-d9450f859349', 'Cheeseburger with fries on parchment'),
      img('photo-1586190848861-99aa4a171e90', 'Stacked burger with sauce dripping'),
    ],
    moods: ['crispy', 'cheesy', 'comfort', 'smoky'], textures: ['juicy', 'crispy'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: [], proteins: ['beef'],
    spiceLevel: 0, price: 2, time: 18,
    searchTerms: ['smash burger', 'cheeseburger', 'burger joint'], tags: ['griddled', 'special sauce', 'pickles'],
  }),
  defineDish({
    id: 'fire-grilled-steak', name: 'Fire-Grilled Steak', cuisine: 'American',
    description: 'Hard-seared steak rested under rosemary garlic butter and flaky salt.',
    images: [
      img('photo-1546833999-b9f581a1996d', 'Sliced grilled steak with herb butter'),
      img('photo-1600891964092-4316c288032e', 'Seared steak on a wooden board'),
    ],
    moods: ['smoky', 'comfort'], textures: ['juicy', 'tender'],
    mealTypes: ['dinner'], dietaryTags: ['gluten-free'], proteins: ['beef'],
    spiceLevel: 0, price: 3, time: 30,
    searchTerms: ['grilled steak', 'steakhouse', 'ribeye'], tags: ['charred', 'garlic butter', 'hearty'],
  }),
  defineDish({
    id: 'buttermilk-pancakes', name: 'Buttermilk Pancakes', cuisine: 'American',
    description: 'Tall, fluffy stack with melting butter and a slow pour of maple syrup.',
    images: [
      img('photo-1567620905732-2d1ec7ab7445', 'Stack of buttermilk pancakes with syrup'),
      img('photo-1528207776546-365bb710ee93', 'Pancakes topped with butter and berries'),
    ],
    moods: ['sweet', 'comfort'], textures: ['creamy', 'tender'],
    mealTypes: ['breakfast'], dietaryTags: ['vegetarian'], proteins: ['egg'],
    spiceLevel: 0, price: 1, time: 20,
    searchTerms: ['buttermilk pancakes', 'breakfast diner', 'brunch'], tags: ['fluffy', 'maple syrup', 'butter'],
  }),
  defineDish({
    id: 'buffalo-cauliflower', name: 'Buffalo Cauliflower', cuisine: 'American',
    description: 'Crispy roasted cauliflower tossed in tangy buffalo sauce with a cool dip.',
    images: [
      img('photo-1625938144755-652e08e359b7', 'Buffalo cauliflower bites with dip'),
      img('photo-1608039755401-742074f0548d', 'Roasted cauliflower wings on a plate'),
    ],
    moods: ['spicy', 'crispy'], textures: ['crunchy', 'tender'],
    mealTypes: ['snack', 'lunch'], dietaryTags: ['vegetarian'], proteins: ['none'],
    spiceLevel: 3, price: 1, time: 25,
    searchTerms: ['buffalo cauliflower', 'cauliflower wings', 'vegetarian bar food'], tags: ['buffalo sauce', 'roasted', 'tangy'],
  }),

  // ----------------------------------------------------------- Mediterranean
  defineDish({
    id: 'mezze-plate', name: 'Golden Mezze Plate', cuisine: 'Mediterranean',
    description: 'Creamy dips, bright herbs, crunchy vegetables, olives, and warm pita.',
    images: [
      img('photo-1540914124281-342587941389', 'Mediterranean mezze platter with dips and pita'),
      img('photo-1544025162-d76694265947', 'Spread of hummus, olives, and vegetables'),
    ],
    moods: ['fresh'], textures: ['creamy', 'crunchy'],
    mealTypes: ['lunch', 'snack'], dietaryTags: ['vegetarian', 'nut-free'], proteins: ['none'],
    spiceLevel: 1, price: 2, time: 16,
    searchTerms: ['mezze platter', 'mediterranean restaurant', 'meze'], tags: ['hummus', 'herbs', 'warm pita'],
  }),
  defineDish({
    id: 'chicken-souvlaki', name: 'Chicken Souvlaki', cuisine: 'Mediterranean',
    description: 'Lemon-oregano grilled chicken skewers with tzatziki and charred pita.',
    images: [
      img('photo-1633504581786-316c8002b1b9', 'Grilled chicken souvlaki skewers with pita'),
      img('photo-1662116765994-1e4200c43589', 'Greek skewers with tzatziki and salad'),
    ],
    moods: ['smoky', 'fresh', 'comfort'], textures: ['juicy', 'tender'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: ['nut-free'], proteins: ['chicken'],
    spiceLevel: 1, price: 2, time: 24,
    searchTerms: ['chicken souvlaki', 'greek grill', 'souvlaki'], tags: ['lemon-oregano', 'tzatziki', 'grilled'],
  }),
  defineDish({
    id: 'falafel-wrap', name: 'Falafel Wrap', cuisine: 'Mediterranean',
    description: 'Crunchy herb falafel, pickles, tahini, and salad rolled in warm flatbread.',
    images: [
      img('photo-1615870216519-2f9fa575fa5c', 'Falafel wrap cut in half with tahini'),
      img('photo-1593001874117-c99c800e3eb8', 'Fried falafel balls with fresh vegetables'),
    ],
    moods: ['crispy', 'fresh'], textures: ['crunchy', 'creamy'],
    mealTypes: ['lunch', 'snack'], dietaryTags: ['vegan', 'dairy-free'], proteins: ['beans'],
    spiceLevel: 1, price: 1, time: 18,
    searchTerms: ['falafel wrap', 'falafel', 'mediterranean restaurant'], tags: ['herb falafel', 'tahini', 'pickles'],
  }),
  defineDish({
    id: 'shakshuka', name: 'Shakshuka', cuisine: 'Mediterranean',
    description: 'Eggs poached in a spiced tomato-pepper sauce with feta and herbs.',
    images: [
      img('photo-1590412200988-a436970781fa', 'Shakshuka with poached eggs in tomato sauce'),
      img('photo-1626700051175-6818013e1d4f', 'Skillet of shakshuka with bread'),
    ],
    moods: ['spicy', 'soupy', 'comfort'], textures: ['silky', 'juicy'],
    mealTypes: ['breakfast', 'lunch'], dietaryTags: ['vegetarian', 'gluten-free'], proteins: ['egg'],
    spiceLevel: 2, price: 2, time: 25,
    searchTerms: ['shakshuka', 'brunch', 'middle eastern breakfast'], tags: ['poached eggs', 'tomato', 'feta'],
  }),

  // ------------------------------------------------------------------ Indian
  defineDish({
    id: 'butter-chicken', name: 'Butter Chicken', cuisine: 'Indian',
    description: 'Tandoori chicken folded into a velvety tomato-butter sauce with garam masala.',
    images: [
      img('photo-1603894584373-5ac82b2ae398', 'Butter chicken curry in a bowl with naan'),
      img('photo-1631452180519-c014fe946bc7', 'Creamy tomato chicken curry close-up'),
    ],
    moods: ['comfort', 'spicy'], textures: ['creamy', 'tender'],
    mealTypes: ['dinner', 'lunch'], dietaryTags: ['gluten-free'], proteins: ['chicken'],
    spiceLevel: 2, price: 2, time: 30,
    searchTerms: ['butter chicken', 'murgh makhani', 'indian restaurant'], tags: ['creamy', 'tomato', 'garam masala'],
  }),
  defineDish({
    id: 'chana-masala', name: 'Chana Masala', cuisine: 'Indian',
    description: 'Chickpeas simmered with onion, tomato, ginger, and toasted spice.',
    images: [
      img('photo-1585937421612-70a008356fbe', 'Chana masala chickpea curry with cilantro'),
      img('photo-1546833998-877b37c2e5c6', 'Spiced chickpea curry in a bowl'),
    ],
    moods: ['spicy', 'comfort'], textures: ['tender'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: ['vegan', 'gluten-free', 'dairy-free'], proteins: ['beans'],
    spiceLevel: 3, price: 1, time: 25,
    searchTerms: ['chana masala', 'chickpea curry', 'indian restaurant'], tags: ['chickpeas', 'tomato', 'spiced'],
  }),
  defineDish({
    id: 'masala-dosa', name: 'Masala Dosa', cuisine: 'Indian',
    description: 'Crackly fermented rice crepe wrapped around spiced potato, with chutneys.',
    images: [
      img('photo-1668236543090-82eba5ee5976', 'Masala dosa with coconut chutney and sambar'),
      img('photo-1630383249896-424e482df921', 'Crispy dosa served on a banana leaf'),
    ],
    moods: ['crispy', 'comfort'], textures: ['crispy', 'flaky'],
    mealTypes: ['breakfast', 'lunch'], dietaryTags: ['vegetarian', 'vegan', 'gluten-free'], proteins: ['none'],
    spiceLevel: 2, price: 1, time: 20,
    searchTerms: ['masala dosa', 'south indian restaurant', 'dosa'], tags: ['rice crepe', 'spiced potato', 'chutney'],
  }),
  defineDish({
    id: 'paneer-tikka', name: 'Paneer Tikka', cuisine: 'Indian',
    description: 'Charred marinated paneer and peppers straight off the skewer with mint chutney.',
    images: [
      img('photo-1701579231305-d84d8af9a3fd', 'Grilled paneer tikka skewers with peppers'),
      img('photo-1567188040759-fb8a883dc6d8', 'Charred paneer cubes with onions'),
    ],
    moods: ['smoky', 'spicy'], textures: ['tender', 'juicy'],
    mealTypes: ['dinner', 'snack'], dietaryTags: ['vegetarian', 'gluten-free'], proteins: ['paneer'],
    spiceLevel: 2, price: 2, time: 26,
    searchTerms: ['paneer tikka', 'tandoori paneer', 'indian restaurant'], tags: ['charred', 'marinated', 'mint chutney'],
  }),

  // ------------------------------------------------------------------ Korean
  defineDish({
    id: 'korean-fried-chicken', name: 'Korean Fried Chicken', cuisine: 'Korean',
    description: 'Glass-crisp double-fried chicken lacquered in sweet-spicy gochujang glaze.',
    images: [
      img('photo-1575932444877-5106bee2a599', 'Korean fried chicken with sesame and scallions'),
      img('photo-1608039829572-78524f79c4c7', 'Glazed crispy chicken wings piled high'),
    ],
    moods: ['crispy', 'spicy', 'sweet'], textures: ['crunchy', 'juicy'],
    mealTypes: ['dinner', 'snack'], dietaryTags: ['dairy-free'], proteins: ['chicken'],
    spiceLevel: 3, price: 2, time: 26,
    searchTerms: ['korean fried chicken', 'KFC korean', 'chimaek'], tags: ['gochujang', 'crunchy', 'sticky'],
  }),
  defineDish({
    id: 'bibimbap', name: 'Bibimbap', cuisine: 'Korean',
    description: 'Warm rice under seasoned vegetables, beef, a runny egg, and gochujang.',
    images: [
      img('photo-1553163147-622ab57be1c7', 'Bibimbap bowl with vegetables and egg'),
      img('photo-1512621776951-a57141f2eefd', 'Colorful grain bowl with assorted vegetable toppings'),
    ],
    moods: ['fresh', 'spicy', 'comfort'], textures: ['chewy', 'crunchy'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: ['gluten-free', 'dairy-free'], proteins: ['beef', 'egg'],
    spiceLevel: 2, price: 2, time: 22,
    searchTerms: ['bibimbap', 'korean rice bowl', 'korean restaurant'], tags: ['mixed rice', 'runny egg', 'gochujang'],
  }),
  defineDish({
    id: 'kimchi-jjigae', name: 'Kimchi Jjigae', cuisine: 'Korean',
    description: 'Bubbling stew of aged kimchi, pork, tofu, and scallion.',
    images: [
      img('photo-1583224964978-2257b960c3d3', 'Bubbling red kimchi stew with tofu'),
      img('photo-1626509653291-18d9a934b9db', 'Korean kimchi jjigae in a stone pot'),
    ],
    moods: ['spicy', 'soupy', 'comfort'], textures: ['silky', 'tender'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: ['dairy-free'], proteins: ['pork', 'tofu'],
    spiceLevel: 3, price: 2, time: 25,
    searchTerms: ['kimchi jjigae', 'kimchi stew', 'korean restaurant'], tags: ['aged kimchi', 'pork', 'tofu'],
  }),
  defineDish({
    id: 'japchae', name: 'Japchae', cuisine: 'Korean',
    description: 'Chewy sweet-potato glass noodles tossed with vegetables and sesame.',
    images: [
      img('photo-1512152272829-e3139592d56f', 'Japchae glass noodles with vegetables'),
      img('photo-1645112411341-6c4fd023714a', 'Stir-fried sweet potato noodles with sesame'),
    ],
    moods: ['sweet', 'comfort'], textures: ['chewy', 'silky'],
    mealTypes: ['lunch', 'dinner', 'snack'], dietaryTags: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'], proteins: ['none'],
    spiceLevel: 0, price: 2, time: 24,
    searchTerms: ['japchae', 'korean glass noodles', 'korean restaurant'], tags: ['glass noodles', 'sesame', 'vegetables'],
  }),

  // ----------------------------------------------------------------- Chinese
  defineDish({
    id: 'dan-dan-noodles', name: 'Dan Dan Noodles', cuisine: 'Chinese',
    description: 'Springy noodles in a numbing chili-sesame sauce with crumbled pork.',
    images: [
      img('photo-1552611052-33e04de081de', 'Dan dan noodles with chili oil and pork'),
      img('photo-1585032226651-759b368d7246', 'Sichuan noodles topped with peanuts'),
    ],
    moods: ['spicy', 'comfort'], textures: ['chewy', 'silky'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: ['dairy-free'], proteins: ['pork'],
    spiceLevel: 4, price: 1, time: 18,
    searchTerms: ['dan dan noodles', 'sichuan noodles', 'chinese restaurant'], tags: ['mala', 'sesame', 'chili oil'],
  }),
  defineDish({
    id: 'soup-dumplings', name: 'Soup Dumplings', cuisine: 'Chinese',
    description: 'Delicate xiao long bao filled with pork and a burst of hot broth.',
    images: [
      img('photo-1563245372-f21724e3856d', 'Steamer basket of soup dumplings'),
      img('photo-1541696490-8744a5dc0228', 'Xiao long bao held with chopsticks'),
    ],
    moods: ['soupy', 'comfort'], textures: ['silky', 'tender'],
    mealTypes: ['lunch', 'dinner', 'snack'], dietaryTags: ['dairy-free'], proteins: ['pork'],
    spiceLevel: 0, price: 2, time: 20,
    searchTerms: ['soup dumplings', 'xiao long bao', 'dim sum'], tags: ['xiao long bao', 'hot broth', 'steamed'],
  }),
  defineDish({
    id: 'kung-pao-chicken', name: 'Kung Pao Chicken', cuisine: 'Chinese',
    description: 'Wok-fired chicken with dried chilies, peanuts, and a glossy tangy sauce.',
    images: [
      img('photo-1525755662778-989d0524087e', 'Kung pao chicken with peanuts and chilies'),
      img('photo-1617093727343-374698b1b08d', 'Stir-fried chicken in dark sauce'),
    ],
    moods: ['spicy', 'smoky'], textures: ['juicy', 'crunchy'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: ['dairy-free'], proteins: ['chicken'],
    spiceLevel: 3, price: 2, time: 20,
    searchTerms: ['kung pao chicken', 'gong bao', 'chinese restaurant'], tags: ['dried chili', 'peanuts', 'wok'],
  }),
  defineDish({
    id: 'mapo-tofu', name: 'Mapo Tofu', cuisine: 'Chinese',
    description: 'Silken tofu in a fiery, numbing bean sauce with scallion.',
    images: [
      img('photo-1495521821757-a1efb6729352', 'Mapo tofu in spicy red sauce'),
      img('photo-1607330289024-1535c6b4e1c1', 'Braised tofu with chili and scallion'),
    ],
    moods: ['spicy', 'soupy', 'comfort'], textures: ['silky', 'tender'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: ['vegetarian'], proteins: ['tofu'],
    spiceLevel: 4, price: 1, time: 18,
    searchTerms: ['mapo tofu', 'sichuan tofu', 'chinese restaurant'], tags: ['silken tofu', 'mala', 'bean sauce'],
  }),

  // -------------------------------------------------------------- Vietnamese
  defineDish({
    id: 'beef-pho', name: 'Beef Pho', cuisine: 'Vietnamese',
    description: 'Clear, long-simmered beef broth with rice noodles, herbs, and lime.',
    images: [
      img('photo-1582878826629-29b7ad1cdc43', 'Bowl of beef pho with herbs and lime'),
      img('photo-1519708227418-c8fd9a32b7a2', 'Steaming noodle soup bowl with chopsticks'),
    ],
    moods: ['soupy', 'fresh', 'comfort'], textures: ['silky', 'tender'],
    mealTypes: ['breakfast', 'lunch', 'dinner'], dietaryTags: ['dairy-free', 'gluten-free'], proteins: ['beef'],
    spiceLevel: 1, price: 2, time: 20,
    searchTerms: ['beef pho', 'pho', 'vietnamese restaurant'], tags: ['star anise broth', 'rice noodles', 'herbs'],
  }),
  defineDish({
    id: 'banh-mi', name: 'Banh Mi', cuisine: 'Vietnamese',
    description: 'Crackly baguette with pâté, grilled pork, pickled daikon, cilantro, and chili.',
    images: [
      img('photo-1467453678174-768ec283a940', 'Vietnamese banh mi sandwich cut in half'),
      img('photo-1540189549336-e6e99c3679fe', 'Crusty baguette sandwich with pickled vegetables'),
    ],
    moods: ['crispy', 'fresh'], textures: ['crunchy', 'juicy'],
    mealTypes: ['breakfast', 'lunch', 'snack'], dietaryTags: ['dairy-free'], proteins: ['pork'],
    spiceLevel: 2, price: 1, time: 15,
    searchTerms: ['banh mi', 'vietnamese sandwich', 'banh mi shop'], tags: ['baguette', 'pickled daikon', 'cilantro'],
  }),
  defineDish({
    id: 'fresh-spring-rolls', name: 'Fresh Spring Rolls', cuisine: 'Vietnamese',
    description: 'Cool rice-paper rolls with shrimp, herbs, and vermicelli, with peanut dip.',
    images: [
      img('photo-1490645935967-10de6ba17061', 'Fresh Vietnamese spring rolls with peanut sauce'),
      img('photo-1625944230945-1b7dd3b949ab', 'Rice paper rolls sliced to show filling'),
    ],
    moods: ['fresh'], textures: ['crunchy', 'chewy'],
    mealTypes: ['snack', 'lunch'], dietaryTags: ['pescatarian', 'gluten-free', 'dairy-free'], proteins: ['seafood'],
    spiceLevel: 0, price: 1, time: 15,
    searchTerms: ['fresh spring rolls', 'goi cuon', 'vietnamese restaurant'], tags: ['rice paper', 'herbs', 'peanut dip'],
  }),
  defineDish({
    id: 'lemongrass-chicken-vermicelli', name: 'Lemongrass Chicken Bun', cuisine: 'Vietnamese',
    description: 'Charred lemongrass chicken over cool rice vermicelli with herbs and nuoc cham.',
    images: [
      img('photo-1503764654157-72d979d9af2f', 'Vermicelli bowl with grilled lemongrass chicken and herbs'),
      img('photo-1569058242253-92a9c755a0ec', 'Bun cha style noodle bowl with herbs'),
    ],
    moods: ['fresh', 'smoky'], textures: ['juicy', 'chewy'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: ['dairy-free', 'gluten-free'], proteins: ['chicken'],
    spiceLevel: 1, price: 2, time: 22,
    searchTerms: ['lemongrass chicken vermicelli', 'bun ga nuong', 'vietnamese restaurant'], tags: ['lemongrass', 'vermicelli', 'nuoc cham'],
  }),

  // ---------------------------------------------------------------- Caribbean
  defineDish({
    id: 'jerk-chicken', name: 'Jerk Chicken', cuisine: 'Caribbean',
    description: 'Smoky charred chicken with allspice, thyme, and scotch bonnet heat.',
    images: [
      img('photo-1598515213692-5f252f75d785', 'Jerk chicken pieces with charred edges'),
      img('photo-1432139555190-58524dae6a55', 'Grilled chicken with spice rub and lime'),
    ],
    moods: ['smoky', 'spicy'], textures: ['juicy', 'tender'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: ['dairy-free', 'gluten-free'], proteins: ['chicken'],
    spiceLevel: 4, price: 2, time: 30,
    searchTerms: ['jerk chicken', 'jamaican restaurant', 'caribbean grill'], tags: ['allspice', 'scotch bonnet', 'charred'],
  }),
  defineDish({
    id: 'jamaican-beef-patty', name: 'Jamaican Beef Patty', cuisine: 'Caribbean',
    description: 'Flaky turmeric pastry with a spiced, savory beef filling.',
    images: [
      img('photo-1601050690117-94f5f6fa8bd7', 'Golden Jamaican beef patties'),
      img('photo-1619740455993-9e612b1af08a', 'Flaky pastry patty broken open'),
    ],
    moods: ['spicy', 'crispy', 'comfort'], textures: ['flaky', 'crumbly'],
    mealTypes: ['snack', 'lunch'], dietaryTags: [], proteins: ['beef'],
    spiceLevel: 2, price: 1, time: 12,
    searchTerms: ['jamaican beef patty', 'caribbean bakery', 'beef patty'], tags: ['turmeric pastry', 'spiced beef', 'flaky'],
  }),
  defineDish({
    id: 'oxtail-rice-and-peas', name: 'Braised Oxtail', cuisine: 'Caribbean',
    description: 'Fall-apart oxtail in rich brown gravy with rice and peas.',
    images: [
      img('photo-1604329760661-e71dc83f8f26', 'Braised oxtail with rice and peas'),
      img('photo-1547592166-23ac45744acd', 'Stewed beef with gravy over rice'),
    ],
    moods: ['comfort', 'smoky'], textures: ['tender', 'silky'],
    mealTypes: ['dinner'], dietaryTags: ['dairy-free', 'gluten-free'], proteins: ['beef'],
    spiceLevel: 2, price: 3, time: 40,
    searchTerms: ['oxtail rice and peas', 'jamaican oxtail', 'caribbean restaurant'], tags: ['brown gravy', 'rice & peas', 'slow-braised'],
  }),
  defineDish({
    id: 'caribbean-pineapple-beans', name: 'Pineapple Rice & Beans', cuisine: 'Caribbean',
    description: 'Coconut rice with red beans, sweet pineapple, lime, and scallion.',
    images: [
      img('photo-1512058564366-18510be2db19', 'Coconut rice and beans with pineapple'),
      img('photo-1543353071-873f17a7a088', 'Bowl of rice with beans and herbs'),
    ],
    moods: ['sweet', 'fresh', 'comfort'], textures: ['creamy', 'chewy'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], proteins: ['beans'],
    spiceLevel: 1, price: 1, time: 25,
    searchTerms: ['caribbean rice and beans', 'coconut rice', 'vegan caribbean'], tags: ['coconut rice', 'pineapple', 'red beans'],
  }),

  // ------------------------------------------------------------- Middle Eastern
  defineDish({
    id: 'chicken-shawarma', name: 'Chicken Shawarma', cuisine: 'Middle Eastern',
    description: 'Spit-roasted spiced chicken with garlic sauce, pickles, and warm flatbread.',
    images: [
      img('photo-1529006557810-274b9b2fc783', 'Chicken shawarma wrap with garlic sauce'),
      img('photo-1414235077428-338989a2e8c0', 'Shaved shawarma meat plated with flatbread'),
    ],
    moods: ['smoky', 'comfort'], textures: ['juicy', 'tender'],
    mealTypes: ['lunch', 'dinner', 'snack'], dietaryTags: ['dairy-free', 'nut-free', 'halal'], proteins: ['chicken'],
    spiceLevel: 2, price: 1, time: 18,
    searchTerms: ['chicken shawarma', 'shawarma', 'middle eastern grill'], tags: ['spit-roasted', 'garlic sauce', 'pickles'],
  }),
  defineDish({
    id: 'beef-kofta', name: 'Beef Kofta Skewers', cuisine: 'Middle Eastern',
    description: 'Char-grilled spiced beef skewers with sumac onions and tahini.',
    images: [
      img('photo-1633945274405-b6c8069047b0', 'Grilled beef kofta skewers with herbs'),
      img('photo-1541518763669-27fef04b14ea', 'Minced meat skewers over coals'),
    ],
    moods: ['smoky', 'spicy'], textures: ['juicy', 'tender'],
    mealTypes: ['dinner'], dietaryTags: ['dairy-free', 'gluten-free', 'nut-free', 'halal'], proteins: ['beef'],
    spiceLevel: 2, price: 2, time: 26,
    searchTerms: ['beef kofta', 'kofta kebab', 'middle eastern restaurant'], tags: ['char-grilled', 'sumac onion', 'tahini'],
  }),
  defineDish({
    id: 'hummus-warm-pita', name: 'Hummus & Warm Pita', cuisine: 'Middle Eastern',
    description: 'Whipped chickpea hummus pooled with olive oil, za’atar, and fluffy pita.',
    images: [
      img('photo-1590779033100-9f60a05a013d', 'Creamy hummus topped with chickpeas and olive oil'),
      img('photo-1476718406336-bb5a9690ee2a', 'Mezze table spread with dips and flatbread'),
    ],
    moods: ['fresh', 'comfort'], textures: ['creamy'],
    mealTypes: ['snack', 'lunch'], dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'nut-free'], proteins: ['beans'],
    spiceLevel: 0, price: 1, time: 10,
    searchTerms: ['hummus', 'mezze', 'middle eastern restaurant'], tags: ['whipped chickpea', 'olive oil', 'za’atar'],
  }),
  defineDish({
    id: 'mujadara', name: 'Lentil Mujadara', cuisine: 'Middle Eastern',
    description: 'Earthy lentils and rice under a heap of deeply caramelized onions.',
    images: [
      img('photo-1615485290382-441e4d049cb5', 'Mujadara lentils and rice with fried onions'),
      img('photo-1482049016688-2d3e1b311543', 'Bowl of spiced lentils and rice'),
    ],
    moods: ['comfort', 'smoky'], textures: ['tender', 'crunchy'],
    mealTypes: ['lunch', 'dinner'], dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'nut-free', 'halal'], proteins: ['beans'],
    spiceLevel: 1, price: 1, time: 30,
    searchTerms: ['mujadara', 'lentils and rice', 'middle eastern restaurant'], tags: ['lentils', 'caramelized onion', 'cumin'],
  }),
];

export const dishById = new Map(dishes.map((dish) => [dish.id, dish]));
