import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  LendingDeskLiquidityAdded,
  LendingDeskLiquidityWithdrawn,
  LendingDeskLoanConfigRemoved,
  LendingDeskLoanConfigsSet,
  LendingDeskLoanConfigsSetLoanConfigsStruct,
  LoanOriginationFeeSet,
  NewLendingDeskInitialized,
  OwnershipTransferred,
  Paused,
  Unpaused,
} from "../generated/NFTYFinance/NFTYFinance";
import {
  createMockedFunction,
  newTypedMockEvent,
  newTypedMockEventWithParams,
} from "matchstick-as";
import {
  handleLendingDeskLoanConfigsSet,
  handleNewLendingDeskInitialized,
  handleOwnershipTransferred,
} from "../src/nfty-finance";

export const createOwnershipTransferredEvent = (
  nftyFinance: Address,
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred => {
  const event = newTypedMockEventWithParams<OwnershipTransferred>([
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    ),
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner)),
  ]);
  event.address = nftyFinance;
  return event;
};

export const createLoanOriginationFeeSetEvent = (
  nftyFinance: Address,
  loanOriginationFee: number
): LoanOriginationFeeSet => {
  const event = newTypedMockEventWithParams<LoanOriginationFeeSet>([
    new ethereum.EventParam(
      "loanOriginationFee",
      // @ts-ignore
      ethereum.Value.fromI32(<i32>loanOriginationFee)
    ),
  ]);
  event.address = nftyFinance;
  return event;
};

export const intialOwnershipTransfer = (nftyFinance: Address): void => {
  const promissoryNotes = Address.fromString(
    "0x90cBa2Bbb19ecc291A12066Fd8329D65FA1f1947"
  );
  const obligationNotes = Address.fromString(
    "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097"
  );
  const lendingKeys = Address.fromString(
    "0x2546BcD3c84621e976D8185a91A922aE77ECEc30"
  );
  const loanOriginationFee = 200;
  const owner = Address.fromString(
    "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7"
  );

  // Mock loanOriginationFee
  createMockedFunction(
    nftyFinance,
    "loanOriginationFee",
    "loanOriginationFee():(uint256)"
  )
    .withArgs([])
    .returns([ethereum.Value.fromI32(loanOriginationFee)]);

  // Mock promissoryNotes
  createMockedFunction(
    nftyFinance,
    "promissoryNotes",
    "promissoryNotes():(address)"
  )
    .withArgs([])
    .returns([ethereum.Value.fromAddress(promissoryNotes)]);

  // Mock obligationNotes
  createMockedFunction(
    nftyFinance,
    "obligationNotes",
    "obligationNotes():(address)"
  )
    .withArgs([])
    .returns([ethereum.Value.fromAddress(obligationNotes)]);

  // Mock lendingKeys
  createMockedFunction(nftyFinance, "lendingKeys", "lendingKeys():(address)")
    .withArgs([])
    .returns([ethereum.Value.fromAddress(lendingKeys)]);

  // Initial OwnershipTransferred, i.e. contract deployment
  const event = createOwnershipTransferredEvent(
    nftyFinance,
    // this is contract initialization so previousOwner is zero address
    Address.zero(),
    owner
  );
  handleOwnershipTransferred(event);
};

export const createPausedEvent = (nftyFinance: Address): Paused => {
  const event = newTypedMockEvent<Paused>();
  event.address = nftyFinance;
  return event;
};

export const createUnpausedEvent = (nftyFinance: Address): Unpaused => {
  const event = newTypedMockEvent<Unpaused>();
  event.address = nftyFinance;
  return event;
};

export const createNewLendingDeskInitializedEvent = (
  nftyFinance: Address,
  owner: Address,
  erc20: Address,
  id: number
): NewLendingDeskInitialized => {
  const event = newTypedMockEventWithParams<NewLendingDeskInitialized>([
    // @ts-ignore
    new ethereum.EventParam("lendingDeskId", ethereum.Value.fromI32(<i32>id)),
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner)),
    new ethereum.EventParam("erc20", ethereum.Value.fromAddress(erc20)),
  ]);
  event.address = nftyFinance;
  return event;
};

export class TestLoanConfig {
  nftCollection: Address;
  nftCollectionIsErc1155: boolean;
  minAmount: BigInt;
  maxAmount: BigInt;
  minDuration: BigInt;
  maxDuration: BigInt;
  minInterest: BigInt;
  maxInterest: BigInt;
}

export const createLendingDeskLoanConfigsSetEvent = (
  nftyFinance: Address,
  lendingDeskId: number,
  loanConfigs: TestLoanConfig[]
): LendingDeskLoanConfigsSet => {
  const event = newTypedMockEventWithParams<LendingDeskLoanConfigsSet>([
    new ethereum.EventParam(
      "lendingDeskId",
      // @ts-ignore
      ethereum.Value.fromI32(<i32>lendingDeskId)
    ),
    new ethereum.EventParam(
      "loanConfigs",
      ethereum.Value.fromTupleArray(
        loanConfigs.map<ethereum.Tuple>((x) => {
          const struct = new LendingDeskLoanConfigsSetLoanConfigsStruct(0);

          struct.push(ethereum.Value.fromAddress(x.nftCollection));
          struct.push(ethereum.Value.fromBoolean(x.nftCollectionIsErc1155));
          struct.push(ethereum.Value.fromUnsignedBigInt(x.minAmount));
          struct.push(ethereum.Value.fromUnsignedBigInt(x.maxAmount));
          struct.push(ethereum.Value.fromUnsignedBigInt(x.minInterest));
          struct.push(ethereum.Value.fromUnsignedBigInt(x.maxInterest));
          struct.push(ethereum.Value.fromUnsignedBigInt(x.minDuration));
          struct.push(ethereum.Value.fromUnsignedBigInt(x.maxDuration));

          return struct;
        })
      )
    ),
  ]);

  event.address = nftyFinance;
  return event;
};

export const initializeLendingDesk = (
  nftyFinance: Address,
  lendingDeskId: number,
  owner: Address,
  erc20: Address,
  loanConfigs: TestLoanConfig[]
): void => {
  intialOwnershipTransfer(nftyFinance);

  const erc20Name = "USD Coin";
  const erc20Symbol = "USDC";
  const erc20Decimals = 18;

  createMockedFunction(erc20, "name", "name():(string)")
    .withArgs([])
    .returns([ethereum.Value.fromString(erc20Name)]);
  createMockedFunction(erc20, "symbol", "symbol():(string)")
    .withArgs([])
    .returns([ethereum.Value.fromString(erc20Symbol)]);
  createMockedFunction(erc20, "decimals", "decimals():(uint8)")
    .withArgs([])
    // @ts-ignore
    .returns([ethereum.Value.fromI32(<i32>erc20Decimals)]);

  // Create lending desk
  const newLendingDeskInitializedEvent = createNewLendingDeskInitializedEvent(
    nftyFinance,
    owner,
    erc20,
    lendingDeskId
  );
  handleNewLendingDeskInitialized(newLendingDeskInitializedEvent);

  // Set loan configs
  const lendingDeskLoanConfigsSetEvent = createLendingDeskLoanConfigsSetEvent(
    nftyFinance,
    lendingDeskId,
    loanConfigs
  );
  handleLendingDeskLoanConfigsSet(lendingDeskLoanConfigsSetEvent);
};

export const createLendingDeskLoanConfigRemovedEvent = (
  nftyFinance: Address,
  lendingDeskId: number,
  nftCollection: Address
): LendingDeskLoanConfigRemoved => {
  const event = newTypedMockEventWithParams<LendingDeskLoanConfigRemoved>([
    new ethereum.EventParam(
      "lendingDeskId",
      // @ts-ignore
      ethereum.Value.fromI32(<i32>lendingDeskId)
    ),
    new ethereum.EventParam(
      "nftCollection",
      ethereum.Value.fromAddress(nftCollection)
    ),
  ]);
  event.address = nftyFinance;
  return event;
};

export const createLendingDeskLiquidityAddedEvent = (
  nftyFinance: Address,
  lendingDeskId: number,
  amountAdded: BigInt,
  balance: BigInt
): LendingDeskLiquidityAdded => {
  const event = newTypedMockEventWithParams<LendingDeskLiquidityAdded>([
    new ethereum.EventParam(
      "lendingDeskId",
      // @ts-ignore
      ethereum.Value.fromI32(<i32>lendingDeskId)
    ),
    new ethereum.EventParam(
      "amountAdded",
      ethereum.Value.fromUnsignedBigInt(amountAdded)
    ),
    new ethereum.EventParam(
      "balance",
      ethereum.Value.fromUnsignedBigInt(balance)
    ),
  ]);
  event.address = nftyFinance;
  return event;
};

export const createLendingDeskLiquidityWithdrawEvent = (
  nftyFinance: Address,
  lendingDeskId: number,
  amountWithdrawn: BigInt,
  balance: BigInt
): LendingDeskLiquidityWithdrawn => {
  const event = newTypedMockEventWithParams<LendingDeskLiquidityWithdrawn>([
    new ethereum.EventParam(
      "lendingDeskId",
      // @ts-ignore
      ethereum.Value.fromI32(<i32>lendingDeskId)
    ),
    new ethereum.EventParam(
      "amountWithdrawn",
      ethereum.Value.fromUnsignedBigInt(amountWithdrawn)
    ),
    new ethereum.EventParam(
      "balance",
      ethereum.Value.fromUnsignedBigInt(balance)
    ),
  ]);
  event.address = nftyFinance;
  return event;
};
