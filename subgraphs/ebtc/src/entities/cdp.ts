import { Address, Bytes } from "@graphprotocol/graph-ts";
import { Cdp } from "../../generated/schema";
import { BIGINT_ZERO } from "../common/constants";

export function getOrCreateCdp(cdpId: Bytes, owner: Address): Cdp {
  let cdp = Cdp.load(cdpId);
  if (cdp == null) {
    cdp = new Cdp(cdpId);
    cdp.owner = owner;
    cdp.collateral = BIGINT_ZERO;
    cdp.debt = BIGINT_ZERO;
    cdp.save();
  }
  return cdp;
}
