import './worker'; // starts the BullMQ worker process

console.log('[analysis-worker] 🚀 Chesswise Analysis Worker started');
console.log(`[analysis-worker] Redis: ${process.env.REDIS_URL ?? 'redis://localhost:6379'}`);
console.log(`[analysis-worker] Analysis depth: ${process.env.ANALYSIS_DEPTH ?? '20'}`);
console.log('[analysis-worker] Waiting for jobs...');
