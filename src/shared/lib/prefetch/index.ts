/* -------------------------------------------------------------------------- */
/* Intent prefetch — the public surface                                        */
/*                                                                            */
/* The MadarDashboard pattern, applied app-wide: any control whose click will  */
/* download a code chunk or fire a query warms it the moment intent appears    */
/* (hover, focus, touch), so the click lands on work already done.             */
/*                                                                            */
/*   intentProps(warm)        — the three handlers every surface spreads.      */
/*   prefetchRoute(path, qc)  — nav surfaces: chunk + deterministic data.      */
/*   preloadChunk('trip-edit')— surfaces that know their destination chunk.    */
/*   entities/x/queries.ts    — per-entity data warmers, colocated with the    */
/*                              hooks whose keys they must mirror.             */
/* -------------------------------------------------------------------------- */

export { intentProps, type IntentHandlers } from './intent';
export { preloadChunk, preloadChunkForPath, chunkForPath, type ChunkKey } from './chunks';
export { prefetchRoute, prefetchRouteData } from './routes';
export { prefetchAnimations } from './assets';
export * from './forms';
