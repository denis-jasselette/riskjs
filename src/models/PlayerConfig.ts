export type PlayerColor = "black" | "white" | "pink" | "purple" | "green" | "blue" | "red" | "yellow" | "orange"

export const PlayerColorValues: PlayerColor[] = ["black", "white", "pink", "purple", "green", "blue", "red", "yellow", "orange"]

export type BotSkill = "easy" | "medium" | "hard" | "expert" | "neutral"

export default interface PlayerConfig {
  currentUser: boolean;
  name: string;
  color: PlayerColor;
  human: boolean;
  botSkill?: BotSkill;
  position: number;

  host?: boolean;
  country?: string;
  avatar?: string;
  decoration?: string;
  troopShape?: string;
}