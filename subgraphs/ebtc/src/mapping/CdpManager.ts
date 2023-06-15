import { CdpUpdated } from "../../generated/CdpManager/CdpManager";
import { getOrCreateCdp } from "../entities/cdp";

/**
 * Emitted whenever a Cdp is Updated
 *
 * @param event CdpUpdated event
 */
export function handleCdpUpdated(event: CdpUpdated): void {
  const cdp = getOrCreateCdp(event.params._cdpId, event.params._borrower);
  cdp.debt = event.params._debt;
  cdp.collateral = event.params._coll;
  cdp.save();
}
