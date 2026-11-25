// Pretends the network takes a moment, so the loading states can be seen. Removed in Stage 8.
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
