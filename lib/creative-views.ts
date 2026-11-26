export const VIEWS = ["gallery", "board", "leaderboard"] as const;
export type View = (typeof VIEWS)[number];
