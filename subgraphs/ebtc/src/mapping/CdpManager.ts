import { CdpUpdated } from "../../generated/CdpManager/CdpManager";
import { getOrCreateCdp } from "../entities/cdp";

/**
 * Emitted whenever latest ETH price is fetched from oracle
 *
 * @param event LastGoodPriceUpdated event
 */
export function handleCdpUpdated(event: CdpUpdated): void {
  const cdp = getOrCreateCdp(event.params._cdpId);
  cdp.debt = event.params._debt;
  cdp.collateral = event.params._coll;
  cdp.save();
}
