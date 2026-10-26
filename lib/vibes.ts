// The vibes from AGENTS.md. An event matches a vibe on its primary Ticketmaster
// category or on words in the event or venue name, and can match several.

export const VIBES = [
  { key: "all_dressed_up", name: "All Dressed Up" },
  { key: "laugh_together", name: "Laugh Together" },
  { key: "cozy_and_close", name: "Cozy & Close" },
  { key: "night_out", name: "Night Out" },
  { key: "concerts", name: "Concerts" },
  { key: "cheer_together", name: "Cheer Together" },
  { key: "try_something_new", name: "Try Something New" },
  { key: "grown_ups_only", name: "Grown-Ups Only" },
  { key: "daytime_date", name: "Daytime Date" },
] as const;

export type VibeKey = (typeof VIBES)[number]["key"];

// The parts of a Ticketmaster event that vibe matching reads.
export type VibeInput = {
  name: string;
  venueName: string;
  localTime: string | null; // "HH:mm"
  segment: string;
  genre: string;
  subGenre: string;
  type: string;
  subType: string;
  notes: string; // pleaseNote, info and description
};

// Whole words, case-insensitive, with an optional plural "s".
const words = (list: string[]) => new RegExp(`\\b(?:${list.join("|")})s?\\b`, "i");

const DRESSY_ARTS = new Set(["Theatre", "Opera", "Dance", "Classical", "Performance Art"]);
const DRESSY_WORDS = words(["orchestra", "symphony", "philharmonic", "opera", "ballet", "shakespeare"]);
const FUNNY_WORDS = words(["comedy", "comedian", "improv", "second city", "stand-up", "standup"]);
const COZY_MUSIC = new Set(["Jazz", "Blues", "Folk"]);
const COZY_WORDS = words(["jazz", "acoustic", "drive-in", "unplugged"]);
const PARTY_MUSIC = new Set(["Dance/Electronic", "Hip-Hop/Rap", "R&B", "Latin", "Reggae"]);
const PARTY_WORDS = words(["party", "dj", "dance night", "rave"]);
const NOT_CONCERTS = new Set(["Jazz", "Blues", "Folk", "Classical"]);
const SPORTS_WORDS = /\bvs\b/i;
const NEW_ARTS = new Set([
  "Magic & Illusion",
  "Circus & Specialty Acts",
  "Fine Art",
  "Puppetry",
  "Spectacular",
  "Variety",
  "Multimedia",
]);
const NEW_STYLES = new Set(["Exhibit", "Sightseeing/Facility", "Festival", "Expo", "Tour"]);
const ADULTS_ONLY = /21\+|21 and over|21 years|ages 21/i;

export function matchVibes(e: VibeInput): VibeKey[] {
  const text = `${e.name} ${e.venueName}`;
  const time = e.localTime ?? "";
  const rules: [VibeKey, boolean][] = [
    [
      "all_dressed_up",
      (e.segment === "Arts & Theatre" && DRESSY_ARTS.has(e.genre)) ||
        (e.segment === "Music" && e.genre === "Classical") ||
        DRESSY_WORDS.test(text),
    ],
    [
      "laugh_together",
      e.genre === "Comedy" || e.subGenre === "Comedy" || e.subType === "Comedian" || FUNNY_WORDS.test(text),
    ],
    [
      "cozy_and_close",
      (e.segment === "Music" && COZY_MUSIC.has(e.genre)) ||
        e.segment === "Film" ||
        e.subGenre.includes("Acoustic") ||
        (e.segment === "Miscellaneous" && (e.genre === "Food & Drink" || e.genre === "Lecture/Seminar")) ||
        COZY_WORDS.test(text),
    ],
    [
      "night_out",
      (e.segment === "Music" && PARTY_MUSIC.has(e.genre)) ||
        e.subType === "Party/Gala" ||
        e.subType === "Club" ||
        time >= "21:00" ||
        PARTY_WORDS.test(text),
    ],
    ["concerts", e.segment === "Music" && !NOT_CONCERTS.has(e.genre)],
    ["cheer_together", e.segment === "Sports" || SPORTS_WORDS.test(text)],
    [
      "try_something_new",
      e.segment === "Miscellaneous" ||
        (e.segment === "Arts & Theatre" && NEW_ARTS.has(e.genre)) ||
        e.type === "Venue Based" ||
        e.type === "Transportation" ||
        NEW_STYLES.has(e.subType),
    ],
    ["grown_ups_only", ADULTS_ONLY.test(`${e.name} ${e.notes}`)],
    ["daytime_date", time !== "" && time < "17:00"],
  ];
  return rules.filter(([, hit]) => hit).map(([key]) => key);
}
