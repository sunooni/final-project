import { create } from 'zustand';

interface GameRound {
  artist: string;
  selectedFriend: string | null;
  correctFriend: string;
  isCorrect: boolean | null;
  playcounts: Record<string, number>;
}

interface GameState {
  // Состояние игры
  isGameActive: boolean;
  currentRound: number;
  rounds: GameRound[];
  score: number;
  gameOver: boolean;

  // Друзья для текущей игры
  gameFriends: Array<{ id: string; name: string; realname?: string }>;

  // Действия
  startGame: (friends: Array<{ id: string; name: string; realname?: string }>) => void;
  setCurrentArtist: (artist: string, correctFriend: string, playcounts: Record<string, number>) => void;
  selectFriend: (friendName: string) => void;
  nextRound: () => void;
  endGame: () => void;
  resetGame: () => void;

  // Геттеры
  getCurrentRound: () => GameRound | null;
  getGameProgress: () => { current: number; total: number };
  getGameResult: () => { score: number; total: number; percentage: number } | null;
}

const TOTAL_ROUNDS = 3;

export const useGameStore = create<GameState>((set, get) => ({
  isGameActive: false,
  currentRound: 0,
  rounds: [],
  score: 0,
  gameOver: false,
  gameFriends: [],

  startGame: (friends) => {
    set({
      isGameActive: true,
      currentRound: 1,
      rounds: [],
      score: 0,
      gameOver: false,
      gameFriends: friends,
    });
  },

  setCurrentArtist: (artist, correctFriend, playcounts) => {
    const state = get();
    const newRound: GameRound = {
      artist,
      selectedFriend: null,
      correctFriend,
      isCorrect: null,
      playcounts,
    };

    set({
      rounds: [...state.rounds, newRound],
    });
  },

  selectFriend: (friendName) => {
    const state = get();
    if (state.rounds.length === 0) return;

    const currentRoundIndex = state.rounds.length - 1;
    const currentRound = state.rounds[currentRoundIndex];
    const isCorrect = friendName === currentRound.correctFriend;

    // Обновляем текущий раунд с выбором
    const updatedRounds = [...state.rounds];
    updatedRounds[currentRoundIndex] = {
      ...currentRound,
      selectedFriend: friendName,
      isCorrect,
    };

    // Увеличиваем счет, если ответ правильный
    const newScore = isCorrect ? state.score + 1 : state.score;

    set({
      rounds: updatedRounds,
      score: newScore,
    });
  },

  nextRound: () => {
    const state = get();
    if (state.currentRound >= TOTAL_ROUNDS) {
      set({ gameOver: true, isGameActive: false });
    } else {
      set({ currentRound: state.currentRound + 1 });
    }
  },

  endGame: () => {
    set({
      gameOver: true,
      isGameActive: false,
    });
  },

  resetGame: () => {
    set({
      isGameActive: false,
      currentRound: 0,
      rounds: [],
      score: 0,
      gameOver: false,
      gameFriends: [],
    });
  },

  getCurrentRound: () => {
    const state = get();
    if (state.rounds.length === 0) return null;
    return state.rounds[state.rounds.length - 1];
  },

  getGameProgress: () => {
    const state = get();
    return {
      current: state.currentRound,
      total: TOTAL_ROUNDS,
    };
  },

  getGameResult: () => {
    const state = get();
    if (!state.gameOver) return null;

    return {
      score: state.score,
      total: TOTAL_ROUNDS,
      percentage: Math.round((state.score / TOTAL_ROUNDS) * 100),
    };
  },
}));
