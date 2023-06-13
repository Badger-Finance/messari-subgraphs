import { BigDecimal, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  FinancialsDailySnapshot,
  LendingProtocol,
} from "../../generated/schema";
import {
  BIGDECIMAL_ZERO,
  INT_ONE,
  INT_ZERO,
  LendingType,
  Network,
  ProtocolType,
  PROTOCOL_NAME,
  PROTOCOL_SLUG,
  RiskType,
  SECONDS_PER_DAY,
  CDP_MANAGER,
} from "../common/constants";
import { Versions } from "../versions";
import { getEBTCToken } from "./token";

export function getOrCreateEbtcProtocol(): LendingProtocol {
  let protocol = LendingProtocol.load(CDP_MANAGER);
  if (!protocol) {
    protocol = new LendingProtocol(CDP_MANAGER);
    protocol.name = PROTOCOL_NAME;
    protocol.slug = PROTOCOL_SLUG;
    protocol.network = Network.MAINNET;
    protocol.type = ProtocolType.LENDING;
    protocol.lendingType = LendingType.CDP;
    protocol.riskType = RiskType.ISOLATED;
    protocol.mintedTokens = [getEBTCToken().id];
    protocol.totalPoolCount = INT_ONE; // Only one active pool

    protocol.cumulativeUniqueUsers = INT_ZERO;
    protocol.cumulativeUniqueDepositors = INT_ZERO;
    protocol.cumulativeUniqueBorrowers = INT_ZERO;
    protocol.cumulativeUniqueLiquidators = INT_ZERO;
    protocol.cumulativeUniqueLiquidatees = INT_ZERO;
    protocol.totalValueLockedUSD = BIGDECIMAL_ZERO;
    protocol.cumulativeSupplySideRevenueUSD = BIGDECIMAL_ZERO;
    protocol.cumulativeProtocolSideRevenueUSD = BIGDECIMAL_ZERO;
    protocol.cumulativeTotalRevenueUSD = BIGDECIMAL_ZERO;
    protocol.totalDepositBalanceUSD = BIGDECIMAL_ZERO;
    protocol.cumulativeDepositUSD = BIGDECIMAL_ZERO;
    protocol.totalBorrowBalanceUSD = BIGDECIMAL_ZERO;
    protocol.cumulativeBorrowUSD = BIGDECIMAL_ZERO;
    protocol.cumulativeLiquidateUSD = BIGDECIMAL_ZERO;
    protocol.openPositionCount = INT_ZERO;
    protocol.cumulativePositionCount = INT_ZERO;
  }

  protocol.schemaVersion = Versions.getSchemaVersion();
  protocol.subgraphVersion = Versions.getSubgraphVersion();
  protocol.methodologyVersion = Versions.getMethodologyVersion();

  protocol.save();

  return protocol;
}

export function getOrCreateFinancialsSnapshot(
  event: ethereum.Event,
  protocol: LendingProtocol
): FinancialsDailySnapshot {
  // Number of days since Unix epoch
  const id = Bytes.fromHexString(
    `${event.block.timestamp.toI64() / SECONDS_PER_DAY}`
  );
  let financialsSnapshot = FinancialsDailySnapshot.load(id);
  if (!financialsSnapshot) {
    financialsSnapshot = new FinancialsDailySnapshot(id);
    financialsSnapshot.protocol = protocol.id;
    financialsSnapshot.dailySupplySideRevenueUSD = BIGDECIMAL_ZERO;
    financialsSnapshot.dailyProtocolSideRevenueUSD = BIGDECIMAL_ZERO;
    financialsSnapshot.dailyTotalRevenueUSD = BIGDECIMAL_ZERO;
    financialsSnapshot.dailyDepositUSD = BIGDECIMAL_ZERO;
    financialsSnapshot.dailyBorrowUSD = BIGDECIMAL_ZERO;
    financialsSnapshot.dailyLiquidateUSD = BIGDECIMAL_ZERO;
    financialsSnapshot.dailyWithdrawUSD = BIGDECIMAL_ZERO;
    financialsSnapshot.dailyRepayUSD = BIGDECIMAL_ZERO;
  }
  financialsSnapshot.totalValueLockedUSD = protocol.totalValueLockedUSD;
  financialsSnapshot.mintedTokenSupplies = protocol.mintedTokenSupplies;
  financialsSnapshot.cumulativeSupplySideRevenueUSD =
    protocol.cumulativeSupplySideRevenueUSD;
  financialsSnapshot.cumulativeProtocolSideRevenueUSD =
    protocol.cumulativeProtocolSideRevenueUSD;
  financialsSnapshot.cumulativeTotalRevenueUSD =
    protocol.cumulativeTotalRevenueUSD;
  financialsSnapshot.totalDepositBalanceUSD = protocol.totalDepositBalanceUSD;
  financialsSnapshot.cumulativeDepositUSD = protocol.cumulativeDepositUSD;
  financialsSnapshot.totalBorrowBalanceUSD = protocol.totalBorrowBalanceUSD;
  financialsSnapshot.cumulativeBorrowUSD = protocol.cumulativeBorrowUSD;
  financialsSnapshot.cumulativeLiquidateUSD = protocol.cumulativeLiquidateUSD;
  financialsSnapshot.blockNumber = event.block.number;
  financialsSnapshot.timestamp = event.block.timestamp;
  return financialsSnapshot;
}

export function updateProtocolUSDLocked(
  event: ethereum.Event,
  netChangeUSD: BigDecimal
): void {
  const protocol = getOrCreateEbtcProtocol();
  const totalValueLocked = protocol.totalValueLockedUSD.plus(netChangeUSD);
  protocol.totalValueLockedUSD = totalValueLocked;
  protocol.totalDepositBalanceUSD = totalValueLocked;
  protocol.save();
  const financialsSnapshot = getOrCreateFinancialsSnapshot(event, protocol);
  financialsSnapshot.save();
}

export function updateProtocolBorrowBalance(
  event: ethereum.Event,
  borrowedUSD: BigDecimal,
  totalEBTCSupply: BigInt
): void {
  const protocol = getOrCreateEbtcProtocol();
  protocol.totalBorrowBalanceUSD = borrowedUSD;
  protocol.mintedTokenSupplies = [totalEBTCSupply];
  protocol.save();
  const financialsSnapshot = getOrCreateFinancialsSnapshot(event, protocol);
  financialsSnapshot.save();
}
