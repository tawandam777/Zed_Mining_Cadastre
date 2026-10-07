import Snap from "ol/interaction/Snap";
import type VectorSource from "ol/source/Vector";
import { toLonLat } from "ol/proj";

/**
 * Snaps sketch-tool clicks/drags to licence-plot vertices and edges. Mutates the
 * MapBrowserEvent's coordinate in place before MapCanvas's own singleclick/pointermove
 * listeners run, so the existing click-to-place-vertex and rubber-band preview logic gets
 * snapping for free with no changes of its own. Starts inactive — MapCanvas toggles it based
 * on activeTool/toolFrozen.
 *
 * OL's Snap has no public setter for its vertex/edge flags (constructor-only — see
 * node_modules/ol/interaction/Snap.js) — to change which kinds of snapping are enabled at
 * runtime, call this again and swap the interaction (see MapCanvas's snapFlagsRef/useEffect).
 */
export function createSnapInteraction(
  source: VectorSource,
  flags: { vertex: boolean; edge: boolean },
  onSnapChange: (lonLat: [number, number] | null) => void,
): Snap {
  // pixelTolerance 10 (OL's own default): a reasonably tight catch radius so snapping doesn't
  // reach out to an unrelated, visually-distant feature at low zoom. Licence parcels tile
  // edge-to-edge with zero gap (scripts/generate-licences.ts), so adjacent plots literally
  // share corner/edge coordinates rather than having distinct nearby ones — the "which of two
  // close-but-different corners gets picked" ambiguity that motivated shrinking this value in
  // the first place (see todo.md) no longer applies now that there's no gap to be ambiguous
  // about, but a tight tolerance remains good practice regardless.
  const snap = new Snap({ source, pixelTolerance: 10, vertex: flags.vertex, edge: flags.edge });
  snap.setActive(false);
  snap.on("snap", (evt) => onSnapChange(toLonLat(evt.vertex) as [number, number]));
  snap.on("unsnap", () => onSnapChange(null));
  return snap;
}
