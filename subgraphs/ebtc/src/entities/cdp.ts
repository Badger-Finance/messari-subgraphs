import { Bytes } from "@graphprotocol/graph-ts";
import { Cdp } from "../../generated/schema";
import { BIGINT_ZERO } from "../common/constants";

export function getOrCreateCdp(cdpId: Bytes): Cdp {
  let cdp = Cdp.load(cdpId);
  if (cdp == null) {
    cdp = new Cdp(cdpId);
    cdp.collateral = BIGINT_ZERO;
    cdp.debt = BIGINT_ZERO;
    cdp.save();
  }
  return cdp;
}
