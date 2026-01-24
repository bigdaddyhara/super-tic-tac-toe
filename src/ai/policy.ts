import { PolicyOptions } from "./types";

export const defaultPolicy: PolicyOptions = {
  presets: {
    easy: {
      timeBudgetMs: 50,
      iterationBudget: 50,
      randomness: 0.6,
      useTranspositionTable: false,
      ttMaxEntries: 500,
      progressiveWideningK: 1,
      progressiveWideningAlpha: 0.5,
      moveOrderingTopK: 2,
    },
    medium: {
      timeBudgetMs: 400,
      iterationBudget: 800,
      randomness: 0.25,
      useTranspositionTable: true,
      ttMaxEntries: 3000,
      progressiveWideningK: 2,
      progressiveWideningAlpha: 0.5,
      moveOrderingTopK: 3,
    },
    hard: {
      timeBudgetMs: 4000,
      iterationBudget: 8000,
      randomness: 0.02,
      useTranspositionTable: true,
      ttMaxEntries: 20000,
      progressiveWideningK: 4,
      progressiveWideningAlpha: 0.5,
      moveOrderingTopK: 6,
    },
    insane: {
      timeBudgetMs: 12000,
      iterationBudget: 50000,
      randomness: 0.0,
      useTranspositionTable: true,
      ttMaxEntries: 100000,
      progressiveWideningK: 6,
      progressiveWideningAlpha: 0.5,
      moveOrderingTopK: 10,
    },
  },
};

export function getPreset(name: string) {
  return defaultPolicy.presets?.[name] ?? null;
}

// Heuristic weight profiles for baseline bots (tunable)
export const heuristicProfiles = {
  medium: {
    bigWin: 10000,
    localWin: 500,
    localLossPenalty: -400,
    avoidSendingOpponentWin: -800,
    forceClosedBoardBonus: 30,
    makeThreatBonus: 50,
    blockThreatBonus: 40,
    positionalMultiplier: 5,
    mobilityMultiplier: 2,
  },
}

export function getHeuristicProfile(name: string) {
  return (heuristicProfiles as any)[name] ?? heuristicProfiles.medium
}
