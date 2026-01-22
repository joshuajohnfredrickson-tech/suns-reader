import { Article } from '../types/article';

const loremBody = `This is a placeholder article body demonstrating the Reader view layout. In a production version, this would contain the full article content extracted from the source.

The Reader view provides a clean, distraction-free reading experience optimized for mobile devices while maintaining excellent readability on desktop screens.

Key features of this reader include automatic dark mode support that follows your system preferences, smooth scrolling, and a minimalist design that puts the content front and center.

This is sample paragraph text to show how longer articles would appear in the reader. The typography is carefully chosen for optimal readability with appropriate line height, font size, and spacing.

More content would appear here in a real article, including multiple paragraphs, proper formatting, and the complete text from the original source.

The navigation is simple and intuitive - just tap the back arrow to return to your article list and continue browsing.`;

export const trustedArticles: Article[] = [
  {
    id: '1',
    title: 'Breaking: Major Climate Agreement Reached at Summit',
    source: 'Reuters',
    author: 'Sarah Johnson',
    timeAgo: '2h ago',
    date: 'January 21, 2026',
    isRead: false,
    body: `World leaders reached a historic climate agreement today at the Global Climate Summit in Geneva. The landmark deal commits 150 nations to achieving net-zero carbon emissions by 2045, five years ahead of previous targets.

${loremBody}

The agreement includes unprecedented funding commitments of $500 billion annually to support developing nations in their transition to renewable energy sources.`
  },
  {
    id: '2',
    title: 'Tech Giants Announce New AI Safety Initiative',
    source: 'The Verge',
    author: 'Michael Chen',
    timeAgo: '3h ago',
    date: 'January 21, 2026',
    isRead: false,
    body: `Major technology companies announced a joint initiative to establish safety standards for artificial intelligence development. The coalition includes leading AI research labs and tech companies.

${loremBody}

The initiative focuses on transparency, ethical AI development, and ensuring AI systems are aligned with human values.`
  },
  {
    id: '3',
    title: 'Global Markets Rally on Economic Growth Data',
    source: 'Financial Times',
    author: 'Emma Thompson',
    timeAgo: '4h ago',
    date: 'January 21, 2026',
    isRead: true,
    body: `Stock markets around the world surged today following the release of stronger-than-expected economic growth data. The S&P 500 rose 2.3% while European and Asian markets posted similar gains.

${loremBody}

Analysts attribute the growth to robust consumer spending and increased business investment across multiple sectors.`
  },
  {
    id: '4',
    title: 'Scientists Discover New Treatment for Rare Disease',
    source: 'Nature',
    author: 'Dr. Robert Martinez',
    timeAgo: '5h ago',
    date: 'January 21, 2026',
    isRead: true,
    body: `Researchers at Johns Hopkins University have identified a promising new treatment for a rare genetic disorder affecting thousands worldwide. The breakthrough came after five years of intensive research.

${loremBody}

Clinical trials are expected to begin in the next six months, offering hope to patients who previously had limited treatment options.`
  },
  {
    id: '5',
    title: 'International Space Station Mission Extended',
    source: 'NASA',
    timeAgo: '6h ago',
    date: 'January 21, 2026',
    isRead: false,
    body: `NASA announced today that the International Space Station's operational lifespan will be extended through 2035. The decision reflects the station's continued scientific value and international cooperation in space exploration.

${loremBody}

The extension will enable new research opportunities in microgravity and serve as a testbed for deep space exploration technologies.`
  },
  {
    id: '6',
    title: 'Renewable Energy Surpasses Coal in Power Generation',
    source: 'Bloomberg',
    author: 'Alexandra Kim',
    timeAgo: '7h ago',
    date: 'January 21, 2026',
    isRead: true,
    body: `For the first time in history, renewable energy sources have surpassed coal in global electricity generation. Solar and wind power led the transition, accounting for the majority of new capacity additions.

${loremBody}

Energy experts hail this as a turning point in the fight against climate change and a sign of the energy sector's ongoing transformation.`
  },
];

export const discoveryArticles: Article[] = [
  {
    id: '7',
    title: 'How Modern Architecture Is Reshaping Cities',
    source: 'Architectural Digest',
    author: 'David Lee',
    timeAgo: '1h ago',
    date: 'January 21, 2026',
    isRead: false,
    body: `Urban landscapes are undergoing dramatic transformations as architects embrace sustainable design principles and innovative building materials. From vertical forests to carbon-neutral skyscrapers, modern architecture is redefining city living.

${loremBody}

These new designs prioritize both environmental sustainability and human well-being, creating spaces that enhance quality of life.`
  },
  {
    id: '8',
    title: 'The Rise of Plant-Based Cuisine Around the World',
    source: 'Food & Wine',
    author: 'Julia Santos',
    timeAgo: '2h ago',
    date: 'January 21, 2026',
    isRead: false,
    body: `Plant-based dining has evolved from a niche movement to a mainstream culinary trend. Michelin-starred restaurants and casual eateries alike are expanding their plant-based offerings.

${loremBody}

Chefs are discovering innovative techniques to create complex flavors and textures using only plant-based ingredients.`
  },
  {
    id: '9',
    title: 'Exploring Ancient Ruins: New Archaeological Findings',
    source: 'National Geographic',
    author: 'Dr. Patricia Williams',
    timeAgo: '3h ago',
    date: 'January 21, 2026',
    isRead: false,
    body: `Archaeologists working in Peru have uncovered a previously unknown ancient city dating back over 2,000 years. The discovery includes well-preserved temples, residential structures, and intricate ceramic artifacts.

${loremBody}

The findings are expected to provide new insights into pre-Columbian civilizations and their sophisticated urban planning.`
  },
  {
    id: '10',
    title: 'The Future of Electric Vehicles in Urban Planning',
    source: 'Wired',
    author: 'James Anderson',
    timeAgo: '4h ago',
    date: 'January 21, 2026',
    isRead: true,
    body: `City planners are reimagining urban infrastructure to accommodate the rapid adoption of electric vehicles. From charging stations to redesigned parking facilities, cities worldwide are adapting to this transportation revolution.

${loremBody}

The shift to electric vehicles is also influencing broader urban design decisions, including public transit integration and pedestrian-friendly spaces.`
  },
  {
    id: '11',
    title: 'Mental Health Awareness: A Growing Priority',
    source: 'Psychology Today',
    author: 'Dr. Rachel Green',
    timeAgo: '5h ago',
    date: 'January 21, 2026',
    isRead: false,
    body: `Mental health support is becoming increasingly accessible as organizations and governments prioritize psychological well-being. New initiatives are breaking down stigma and expanding access to care.

${loremBody}

Digital mental health tools and teletherapy options are making professional support more convenient and affordable for millions of people.`
  },
  {
    id: '12',
    title: 'Art and Technology: The Digital Renaissance',
    source: 'The Atlantic',
    author: 'Marcus Taylor',
    timeAgo: '6h ago',
    date: 'January 21, 2026',
    isRead: true,
    body: `The intersection of art and technology is creating entirely new forms of creative expression. Digital artists are pushing boundaries with immersive installations, AI-generated art, and interactive experiences.

${loremBody}

Museums and galleries are adapting to showcase these new art forms, creating spaces that blend traditional and digital experiences.`
  },
];
