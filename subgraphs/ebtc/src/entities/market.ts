import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { bigIntToBigDecimal } from "../common/utils/numbers";
import {
  ACTIVE_POOL,
  ACTIVE_POOL_CREATED_BLOCK,
  ACTIVE_POOL_CREATED_TIMESTAMP,
  BIGDECIMAL_ZERO,
  BIGINT_ZERO,
  INT_ZERO,
  LIQUIDATION_FEE_PERCENT,
  MAXIMUM_LTV,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
} from "../common/constants";
import {
  getOrCreateEbtcProtocol,
  updateProtocolBorrowBalance,
  updateProtocolUSDLocked,
} from "./protocol";
import { getETHToken, getCurrentETHPrice, getEBTCToken } from "./token";
import {
  Market,
  MarketDailySnapshot,
  MarketHourlySnapshot,
} from "../../generated/schema";

export function getOrCreateMarket(): Market {
  let market = Market.load(ACTIVE_POOL);
  if (!market) {
    market = new Market(ACTIVE_POOL);
    market.protocol = getOrCreateEbtcProtocol().id;
    market.name = "eBTC";
    market.isActive = true;
    market.canBorrowFrom = true;
    market.canUseAsCollateral = true;
    market.maximumLTV = MAXIMUM_LTV;
    market.liquidationThreshold = MAXIMUM_LTV;
    market.liquidationPenalty = LIQUIDATION_FEE_PERCENT;
    market.canIsolate = false;
    market.createdTimestamp = ACTIVE_POOL_CREATED_TIMESTAMP;
    market.createdBlockNumber = ACTIVE_POOL_CREATED_BLOCK;
    // market.oracle: Oracle // " Details about the price oracle used to get this token's price "
    // market.relation: Bytes // " A unique identifier that can relate multiple markets. e.g. a common address that is the same for each related market. This is useful for markets with multiple input tokens "

    // ##### Incentives #####
    // market.rewardTokens: [RewardToken!] // " Additional tokens that are given as reward for position in a protocol, usually in liquidity mining programs. e.g. SUSHI in the Onsen program, MATIC for Aave Polygon "
    // market.rewardTokenEmissionsAmount: [BigInt!] // " Per-block reward token emission as of the current block normalized to a day, in token's native amount. This should be ideally calculated as the theoretical rate instead of the realized amount. "
    // market.rewardTokenEmissionsUSD: [BigDecimal!] // " Per-block reward token emission as of the current block normalized to a day, in USD value. This should be ideally calculated as the theoretical rate instead of the realized amount. "
    // market.stakedOutputTokenAmount: BigInt // " Total supply of output tokens that are staked. Used to calculate reward APY. "

    // ##### Quantitative Data #####
    market.inputToken = getETHToken().id;
    market.inputTokenBalance = BIGINT_ZERO;
    market.inputTokenPriceUSD = BIGDECIMAL_ZERO;
    // market.outputToken: Token // " Tokens that are minted to track ownership of position in protocol (e.g. aToken, cToken). Leave as null if doesn't exist (should be alphabetized) "
    market.outputTokenSupply = BIGINT_ZERO;
    market.outputTokenPriceUSD = BIGDECIMAL_ZERO;
    // market.exchangeRate: BigDecimal // " Amount of input token per full share of output token. Only applies when the output token exists (note this is a ratio and not a percentage value, i.e. 1.05 instead of 105%) "
    // market.rates: [InterestRate!] // " All interest rates for this input token. Should be in APR format "
    // market.reserves: BigDecimal // " Total amount of reserves (in USD) "
    // market.reserveFactor: BigDecimal // " The amount of revenue that is converted to reserves at the current time. 20% reserve factor should be in format 0.20 "
    market.borrowedToken = getEBTCToken().id;
    // market.variableBorrowedTokenBalance: BigInt // " Amount of input tokens borrowed in this market using variable interest rates (in native terms) "
    // market.stableBorrowedTokenBalance: BigInt // " Amount of input tokens borrowed in this market using stable interest rates (in native terms) "
    // market.indexLastUpdatedTimestamp: BigInt // " Last updated timestamp of supply/borrow index. "
    // market.supplyIndex: BigInt // " Index used by the protocol to calculate interest generated on the supply token (ie, liquidityIndex in Aave)"
    // market.supplyCap: BigInt // " Allowed limit to how much of the underlying asset can be supplied to this market. "
    // market.borrowIndex: BigInt // " Index used by the protocol to calculate the interest paid on the borrowed token (ie, variableBorrowIndex in Aave))"
    // market.borrowCap: BigInt // " Allowed limit for how much of the underlying asset can be borrowed from this market. "
    market.totalValueLockedUSD = BIGDECIMAL_ZERO;
    market.cumulativeSupplySideRevenueUSD = BIGDECIMAL_ZERO;
    market.cumulativeProtocolSideRevenueUSD = BIGDECIMAL_ZERO;
    market.cumulativeTotalRevenueUSD = BIGDECIMAL_ZERO;
    // market.revenueDetail: RevenueDetail // " Details of revenue sources and amounts "
    market.totalDepositBalanceUSD = BIGDECIMAL_ZERO;
    market.cumulativeDepositUSD = BIGDECIMAL_ZERO;
    market.totalBorrowBalanceUSD = BIGDECIMAL_ZERO;
    market.cumulativeBorrowUSD = BIGDECIMAL_ZERO;
    market.cumulativeLiquidateUSD = BIGDECIMAL_ZERO;
    market.cumulativeTransferUSD = BIGDECIMAL_ZERO;
    market.cumulativeFlashloanUSD = BIGDECIMAL_ZERO;
    market.transactionCount = INT_ZERO;
    market.depositCount = INT_ZERO;
    market.withdrawCount = INT_ZERO;
    market.borrowCount = INT_ZERO;
    market.repayCount = INT_ZERO;
    market.liquidationCount = INT_ZERO;
    market.transferCount = INT_ZERO;
    market.flashloanCount = INT_ZERO;

    // ##### Usage Data #####
    market.cumulativeUniqueUsers = INT_ZERO;
    market.cumulativeUniqueDepositors = INT_ZERO;
    market.cumulativeUniqueBorrowers = INT_ZERO;
    market.cumulativeUniqueLiquidators = INT_ZERO;
    market.cumulativeUniqueLiquidatees = INT_ZERO;
    market.cumulativeUniqueTransferrers = INT_ZERO;
    market.cumulativeUniqueFlashloaners = INT_ZERO;

    // ##### Account/Position Data #####
    market.positionCount = INT_ZERO;
    market.openPositionCount = INT_ZERO;
    market.closedPositionCount = INT_ZERO;
    market.lendingPositionCount = INT_ZERO;
    market.borrowingPositionCount = INT_ZERO;

    market.save();
  }
  return market;
}

export function getOrCreateMarketSnapshot(
  event: ethereum.Event,
  market: Market
): MarketDailySnapshot {
  const day: i64 = event.block.timestamp.toI64() / SECONDS_PER_DAY;
  const id = Bytes.fromHexString(`${market.id}-${day}`);
  let marketSnapshot = MarketDailySnapshot.load(id);
  if (!marketSnapshot) {
    marketSnapshot = new MarketDailySnapshot(id);
    marketSnapshot.protocol = market.protocol;
    marketSnapshot.market = market.id;
    marketSnapshot.rates = market.rates;

    marketSnapshot.dailySupplySideRevenueUSD = BIGDECIMAL_ZERO;
    marketSnapshot.dailyProtocolSideRevenueUSD = BIGDECIMAL_ZERO;
    marketSnapshot.dailyTotalRevenueUSD = BIGDECIMAL_ZERO;
    marketSnapshot.dailyDepositUSD = BIGDECIMAL_ZERO;
    marketSnapshot.dailyBorrowUSD = BIGDECIMAL_ZERO;
    marketSnapshot.dailyLiquidateUSD = BIGDECIMAL_ZERO;
    marketSnapshot.dailyWithdrawUSD = BIGDECIMAL_ZERO;
    marketSnapshot.dailyRepayUSD = BIGDECIMAL_ZERO;
  }
  marketSnapshot.rates = market.rates;
  marketSnapshot.totalValueLockedUSD = market.totalValueLockedUSD;
  marketSnapshot.cumulativeSupplySideRevenueUSD =
    market.cumulativeSupplySideRevenueUSD;
  marketSnapshot.cumulativeProtocolSideRevenueUSD =
    market.cumulativeProtocolSideRevenueUSD;
  marketSnapshot.cumulativeTotalRevenueUSD = market.cumulativeTotalRevenueUSD;
  marketSnapshot.totalDepositBalanceUSD = market.totalDepositBalanceUSD;
  marketSnapshot.cumulativeDepositUSD = market.cumulativeDepositUSD;
  marketSnapshot.totalBorrowBalanceUSD = market.totalBorrowBalanceUSD;
  marketSnapshot.cumulativeBorrowUSD = market.cumulativeBorrowUSD;
  marketSnapshot.cumulativeLiquidateUSD = market.cumulativeLiquidateUSD;
  marketSnapshot.inputTokenBalance = market.inputTokenBalance;
  marketSnapshot.inputTokenPriceUSD = market.inputTokenPriceUSD;
  marketSnapshot.outputTokenSupply = market.outputTokenSupply;
  marketSnapshot.outputTokenPriceUSD = market.outputTokenPriceUSD;
  marketSnapshot.exchangeRate = market.exchangeRate;
  marketSnapshot.rewardTokenEmissionsAmount = market.rewardTokenEmissionsAmount;
  marketSnapshot.rewardTokenEmissionsUSD = market.rewardTokenEmissionsUSD;
  marketSnapshot.blockNumber = event.block.number;
  marketSnapshot.timestamp = event.block.timestamp;
  marketSnapshot.save();
  return marketSnapshot;
}

export function getOrCreateMarketHourlySnapshot(
  event: ethereum.Event,
  market: Market
): MarketHourlySnapshot {
  const timestamp = event.block.timestamp.toI64();
  const hour: i64 = timestamp / SECONDS_PER_HOUR;
  const id = Bytes.fromHexString(`${market.id}-${hour}`);
  let marketSnapshot = MarketHourlySnapshot.load(id);
  if (!marketSnapshot) {
    marketSnapshot = new MarketHourlySnapshot(id);
    marketSnapshot.protocol = market.protocol;
    marketSnapshot.market = market.id;
    marketSnapshot.rates = market.rates;

    marketSnapshot.hourlySupplySideRevenueUSD = BIGDECIMAL_ZERO;
    marketSnapshot.hourlyProtocolSideRevenueUSD = BIGDECIMAL_ZERO;
    marketSnapshot.hourlyTotalRevenueUSD = BIGDECIMAL_ZERO;
    marketSnapshot.hourlyDepositUSD = BIGDECIMAL_ZERO;
    marketSnapshot.hourlyBorrowUSD = BIGDECIMAL_ZERO;
    marketSnapshot.hourlyLiquidateUSD = BIGDECIMAL_ZERO;
    marketSnapshot.hourlyWithdrawUSD = BIGDECIMAL_ZERO;
    marketSnapshot.hourlyRepayUSD = BIGDECIMAL_ZERO;
  }
  marketSnapshot.rates = market.rates;
  marketSnapshot.totalValueLockedUSD = market.totalValueLockedUSD;
  marketSnapshot.cumulativeSupplySideRevenueUSD =
    market.cumulativeSupplySideRevenueUSD;
  marketSnapshot.cumulativeProtocolSideRevenueUSD =
    market.cumulativeProtocolSideRevenueUSD;
  marketSnapshot.cumulativeTotalRevenueUSD = market.cumulativeTotalRevenueUSD;
  marketSnapshot.totalDepositBalanceUSD = market.totalDepositBalanceUSD;
  marketSnapshot.cumulativeDepositUSD = market.cumulativeDepositUSD;
  marketSnapshot.totalBorrowBalanceUSD = market.totalBorrowBalanceUSD;
  marketSnapshot.cumulativeBorrowUSD = market.cumulativeBorrowUSD;
  marketSnapshot.cumulativeLiquidateUSD = market.cumulativeLiquidateUSD;
  marketSnapshot.inputTokenBalance = market.inputTokenBalance;
  marketSnapshot.inputTokenPriceUSD = market.inputTokenPriceUSD;
  marketSnapshot.outputTokenSupply = market.outputTokenSupply;
  marketSnapshot.outputTokenPriceUSD = market.outputTokenPriceUSD;
  marketSnapshot.exchangeRate = market.exchangeRate;
  marketSnapshot.rewardTokenEmissionsAmount = market.rewardTokenEmissionsAmount;
  marketSnapshot.rewardTokenEmissionsUSD = market.rewardTokenEmissionsUSD;
  marketSnapshot.blockNumber = event.block.number;
  marketSnapshot.timestamp = event.block.timestamp;
  marketSnapshot.save();
  return marketSnapshot;
}

export function setMarketEBTCDebt(
  event: ethereum.Event,
  debtEBTC: BigInt
): void {
  // TODO: debtEBTC needs to be converted to USD value!!
  const debtUSD = bigIntToBigDecimal(debtEBTC);
  const market = getOrCreateMarket();
  market.totalBorrowBalanceUSD = debtUSD;
  market.save();
  getOrCreateMarketSnapshot(event, market);
  getOrCreateMarketHourlySnapshot(event, market);
  updateProtocolBorrowBalance(event, debtUSD, debtEBTC);
}

export function setMarketCollBalance(
  event: ethereum.Event,
  balanceColl: BigInt
): void {
  const balanceUSD = bigIntToBigDecimal(balanceColl).times(
    getCurrentETHPrice()
  );
  const market = getOrCreateMarket();
  const netChangeUSD = balanceUSD.minus(market.totalValueLockedUSD);
  market.totalValueLockedUSD = balanceUSD;
  market.totalDepositBalanceUSD = balanceUSD;
  market.inputTokenBalance = balanceColl;
  market.inputTokenPriceUSD = getCurrentETHPrice();
  market.save();
  getOrCreateMarketSnapshot(event, market);
  getOrCreateMarketHourlySnapshot(event, market);
  updateProtocolUSDLocked(event, netChangeUSD);
}
