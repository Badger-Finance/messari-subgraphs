import { BigDecimal, BigInt, Address } from "@graphprotocol/graph-ts";
import { Token } from "../../generated/schema";
import {
  ETH_ADDRESS,
  ETH_NAME,
  ETH_SYMBOL,
  EBTC_ADDRESS,
  BIGDECIMAL_ONE,
} from "../utils/constants";
import { bigIntToBigDecimal } from "../utils/numbers";
import { getUsdPrice } from "../prices";

export function getETHToken(): Token {
  const token = new Token(ETH_ADDRESS);
  token.name = ETH_NAME;
  token.symbol = ETH_SYMBOL;
  token.decimals = 18;
  token.save();
  return token;
}

export function getEBTCToken(): Token {
  const token = new Token(EBTC_ADDRESS);
  token.name = "EBTC Stablecoin";
  token.symbol = "EBTC";
  token.decimals = 18;
  token.save();
  return token;
}

export function setCurrentETHPrice(blockNumber: BigInt, price: BigInt): void {
  const token = getETHToken();
  token.lastPriceUSD = bigIntToBigDecimal(price);
  token.lastPriceBlockNumber = blockNumber;
  token.save();
}

export function getCurrentETHPrice(): BigDecimal {
  const ethToken = Token.load(ETH_ADDRESS);
  return ethToken!.lastPriceUSD!;
}

export function getCurrentEBTCPrice(): BigDecimal {
  // TODO: come up with better fallback value than BIGDECIMAL_ONE
  let price = getUsdPrice(Address.fromString(EBTC_ADDRESS), BIGDECIMAL_ONE);

  const token = Token.load(EBTC_ADDRESS)!;
  token.lastPriceUSD = price;
  token.save();
  return token.lastPriceUSD!;
}
