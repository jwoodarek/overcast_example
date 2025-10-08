/**
 * Layout Store
 * 
 * Manages video tile layout preferences for instructor view.
 * 
 * WHY layout customization:
 * - Different teaching styles need different video arrangements
 * - Screen sizes vary (desktop vs tablet, ultrawide vs standard)
 * - Some instructors prefer Grid (equal tiles), others Spotlight (active speaker focus)
 * - Drag-resize allows fine-tuning for specific scenarios
 * 
 * Layout modes:
 * - **Grid**: Equal-sized tiles in rows/columns (good for seeing everyone equally)
 * - **Spotlight**: One large tile (active speaker) + smaller sidebar (others)
 * - **Custom**: User has manually resized tiles (override presets)
 * - **Screen Share** (temporary): Auto-adapts when someone shares screen (75% for content, 25% for faces)
 * 
 * WHY in-memory + session-scoped:
 * - Layout preference is personal and context-specific
 * - Different classes may need different layouts
 * - Not persisting avoids "why is my layout weird?" confusion next session
 * - Can add localStorage persistence later if users request it
 * 
 * Constraints from research.md:
 * - Min tile size: 160×90px (16:9 ratio, faces remain recognizable)
 * - Max tile size: 25% of viewport (prevents one tile dominating screen)
 * - Responsive: Desktop (full features), Tablet (presets only), Mobile (auto-layout)
 * 
 * Memory: ~200 bytes per instructor (negligible)
 */

import { atom } from 'jotai';

/**
 * Video tile size configuration
 * 
 * Stored as pixels, but validated against viewport percentage
 * WHY pixels: Easier to work with in drag-resize logic
 * WHY validate: Enforce 160px min, 25% viewport max
 */
export interface TileSize {
  /** Width in pixels (must be >= 160px and <= 25% of viewport width) */
  width: number;
  
  /** Height in pixels (must maintain ~16:9 ratio: height = width * 9/16) */
  height: number;
}

/**
 * Layout configuration structure
 * 
 * Matches data-model.md specification
 */
export interface LayoutConfiguration {
  /** Active layout mode */
  preset: 'grid' | 'spotlight' | 'custom';
  
  /** Custom tile sizes per participant (only used when preset='custom') 
   * Map<participantSessionId, TileSize> */
  tileSizes: Map<string, TileSize>;
  
  /** Grid column override (1-6 columns, undefined = auto-calculate) */
  gridColumns?: number;
  
  /** Spotlight participant override (undefined = use active speaker detection) */
  spotlightParticipantId?: string;
}

/**
 * Primary layout configuration atom
 * 
 * WHY Map for tileSizes:
 * - Each participant can have custom size (keyed by session ID)
 * - Fast lookup: O(1) to get specific participant's size
 * - Easy to add/remove participants (Map.set/delete)
 * - More efficient than array of objects
 * 
 * Default state:
 * - Grid mode (most common starting point)
 * - Empty tileSizes (no custom overrides)
 * - Auto-calculated columns (based on participant count)
 * - Auto-detected spotlight (based on audio levels)
 * 
 * Usage:
 * ```tsx
 * const [layout, setLayout] = useAtom(layoutConfigAtom);
 * 
 * // Switch to spotlight mode
 * setLayout(prev => ({ ...prev, preset: 'spotlight' }));
 * 
 * // Custom resize a tile
 * setLayout(prev => ({
 *   ...prev,
 *   preset: 'custom',
 *   tileSizes: new Map(prev.tileSizes).set(participantId, { width: 320, height: 180 })
 * }));
 * ```
 */
export const layoutConfigAtom = atom<LayoutConfiguration>({
  preset: 'grid',
  tileSizes: new Map(),
  gridColumns: undefined,
  spotlightParticipantId: undefined,
});

/**
 * Screen share active state
 * 
 * WHY separate from layoutConfigAtom:
 * - Screen share is detected externally (Daily.co useScreenShare hook)
 * - Temporary override (doesn't change user's preset preference)
 * - When screen share stops, revert to previous layout
 * - Simpler logic (don't modify layoutConfigAtom during screen share)
 * 
 * State changes:
 * - Someone starts screen share: screenShareActiveAtom = true
 * - Screen share stops: screenShareActiveAtom = false
 * - Layout automatically adapts based on this flag
 * 
 * Layout behavior when true:
 * - Shared screen: 75% of width
 * - Participant videos: 25% sidebar (vertical scrollable if many)
 * - Ignores Grid/Spotlight/Custom preset temporarily
 * 
 * Usage:
 * ```tsx
 * const isScreenSharing = useAtomValue(screenShareActiveAtom);
 * if (isScreenSharing) {
 *   return <ScreenShareLayout />; // 75/25 split
 * }
 * return <NormalLayout preset={layout.preset} />; // Grid/Spotlight/Custom
 * ```
 */
export const screenShareActiveAtom = atom<boolean>(false);

/**
 * Derived atom: Effective layout mode
 * 
 * WHY useful:
 * - Single source of truth for "what layout should I show?"
 * - Handles screen share override logic centrally
 * - Components don't need to check screenShareActiveAtom separately
 * 
 * Returns:
 * - 'screen-share' if screen sharing is active (overrides everything)
 * - Layout preset otherwise (grid/spotlight/custom)
 * 
 * Usage:
 * ```tsx
 * const effectiveMode = useAtomValue(effectiveLayoutModeAtom);
 * switch (effectiveMode) {
 *   case 'screen-share': return <ScreenShareLayout />;
 *   case 'grid': return <GridLayout />;
 *   case 'spotlight': return <SpotlightLayout />;
 *   case 'custom': return <CustomLayout />;
 * }
 * ```
 */
export const effectiveLayoutModeAtom = atom((get) => {
  const isScreenSharing = get(screenShareActiveAtom);
  if (isScreenSharing) return 'screen-share' as const;
  
  const layout = get(layoutConfigAtom);
  return layout.preset;
});

/**
 * Derived atom: Has custom tile sizes?
 * 
 * WHY useful:
 * - Show "Reset to default" button only if user has customized
 * - Indicate to user that layout is personalized
 * - Optimization: skip custom size logic if no customizations
 * 
 * Returns true if any participant has a custom tile size
 */
export const hasCustomTileSizesAtom = atom((get) => {
  const layout = get(layoutConfigAtom);
  return layout.tileSizes.size > 0;
});

/**
 * Derived atom: Layout summary for debugging
 * 
 * WHY useful during development:
 * - See current mode and any overrides at a glance
 * - DevTools inspection (can log this atom)
 * - Helps debug layout switching issues
 * 
 * Returns human-readable summary object
 */
export const layoutSummaryAtom = atom((get) => {
  const layout = get(layoutConfigAtom);
  const isScreenSharing = get(screenShareActiveAtom);
  const effectiveMode = get(effectiveLayoutModeAtom);
  
  return {
    currentPreset: layout.preset,
    effectiveMode,
    screenShareActive: isScreenSharing,
    customTileCount: layout.tileSizes.size,
    gridColumnsOverride: layout.gridColumns ?? 'auto',
    spotlightOverride: layout.spotlightParticipantId ?? 'auto-detect',
  };
});

/**
 * Helper: Validate tile size constraints
 * 
 * WHY needed:
 * - Enforce 160px minimum (from research.md - faces must be recognizable)
 * - Enforce 25% viewport maximum (from research.md - no tile dominates)
 * - Maintain 16:9 aspect ratio (standard video format)
 * 
 * Returns error message if invalid, null if valid
 * 
 * Usage in drag-resize handler:
 * ```tsx
 * const error = validateTileSize(newWidth, newHeight, viewportWidth);
 * if (error) {
 *   toast.error(error);
 *   return; // Don't apply invalid size
 * }
 * setLayout(prev => ({
 *   ...prev,
 *   tileSizes: new Map(prev.tileSizes).set(participantId, { width: newWidth, height: newHeight })
 * }));
 * ```
 */
export function validateTileSize(
  width: number,
  height: number,
  viewportWidth: number
): string | null {
  // Check minimum size (160×90 = 16:9 ratio)
  if (width < 160) {
    return 'Tile width cannot be less than 160px (faces must remain recognizable)';
  }
  if (height < 90) {
    return 'Tile height cannot be less than 90px';
  }
  
  // Check maximum size (25% of viewport)
  const maxWidth = viewportWidth * 0.25;
  if (width > maxWidth) {
    return `Tile width cannot exceed 25% of viewport (${Math.round(maxWidth)}px)`;
  }
  
  // Check aspect ratio (16:9 with ±5% tolerance)
  const aspectRatio = width / height;
  const expectedRatio = 16 / 9; // ~1.778
  const tolerance = 0.05;
  const minRatio = expectedRatio * (1 - tolerance);
  const maxRatio = expectedRatio * (1 + tolerance);
  
  if (aspectRatio < minRatio || aspectRatio > maxRatio) {
    return 'Tile must maintain approximately 16:9 aspect ratio';
  }
  
  return null; // Valid
}

/**
 * Helper: Calculate grid layout dimensions
 * 
 * WHY needed:
 * - Auto-calculate optimal grid based on participant count
 * - Balance: not too wide (hard to scan), not too tall (requires scrolling)
 * - Square-ish grids are most visually comfortable
 * 
 * Algorithm:
 * - cols = ceil(sqrt(participantCount))
 * - rows = ceil(participantCount / cols)
 * - Example: 7 participants → 3 cols × 3 rows (last row has 1 tile)
 * 
 * Returns { cols, rows }
 * 
 * Usage in Grid layout component:
 * ```tsx
 * const { cols, rows } = calculateGridDimensions(participantCount);
 * return <div style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
 *   {participants.map(p => <VideoTile key={p.id} />)}
 * </div>;
 * ```
 */
export function calculateGridDimensions(participantCount: number): { cols: number; rows: number } {
  if (participantCount === 0) return { cols: 0, rows: 0 };
  if (participantCount === 1) return { cols: 1, rows: 1 };
  
  // Square-ish grid (cols ~= rows)
  const cols = Math.ceil(Math.sqrt(participantCount));
  const rows = Math.ceil(participantCount / cols);
  
  return { cols, rows };
}

