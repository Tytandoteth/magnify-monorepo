import {
  OwnershipTransferred,
  Paused,
  Unpaused,
  NewLendingDeskInitialized,
  LoanOriginationFeeSet,
  LendingDeskLoanConfigsSet,
  LendingDeskLoanConfigRemoved,
  LendingDeskLiquidityAdded,
  LendingDeskLiquidityWithdrawn,
  LendingDeskStateSet,
  NewLoanInitialized,
  DefaultedLoanLiquidated,
  LoanPaymentMade,
  LendingDeskDissolved,
  ProtocolInitialized,
} from "../generated/NFTYFinance/NFTYFinance";
import { ERC20 } from "../generated/NFTYFinance/ERC20";
import {
  Erc20,
  LendingDesk,
  Loan,
  LoanConfig,
  NftCollection,
  ProtocolParams,
} from "../generated/schema";
import { Address, BigInt, store } from "@graphprotocol/graph-ts";

// Lending desk related events

export function handleNewLendingDeskInitialized(
  event: NewLendingDeskInitialized
): void {
  // Create ERC20 instance if doesn't exist
  if (!Erc20.load(event.params.erc20.toHex())) {
    const erc20 = new Erc20(event.params.erc20.toHex());
    const erc20Contract = ERC20.bind(event.params.erc20);

    erc20.name = erc20Contract.name();
    erc20.symbol = erc20Contract.symbol();
    erc20.decimals = erc20Contract.decimals();
    erc20.platformFees = BigInt.fromU32(0);

    erc20.save();
  }

  // Create LiquidityShop instance
  const lendingDesk = new LendingDesk(event.params.lendingDeskId.toString());

  lendingDesk.erc20 = event.params.erc20.toHex();
  lendingDesk.owner = event.params.owner;
  lendingDesk.status = "Active";
  lendingDesk.balance = new BigInt(0);

  lendingDesk.save();
}

export function handleLendingDeskLoanConfigsSet(
  event: LendingDeskLoanConfigsSet
): void {
  for (let i = 0; i < event.params.loanConfigs.length; i++) {
    const loanConfigStruct = event.params.loanConfigs[i];

    // Create NftCollection instance
    const nftCollection = new NftCollection(
      loanConfigStruct.nftCollection.toHex()
    );
    nftCollection.isErc1155 = loanConfigStruct.nftCollectionIsErc1155;
    nftCollection.save();

    // Create LoanConfig instance
    const loanConfig = new LoanConfig(
      event.params.lendingDeskId.toString() +
        "-" +
        loanConfigStruct.nftCollection.toHex()
    );

    loanConfig.lendingDesk = event.params.lendingDeskId.toString();
    loanConfig.nftCollection = loanConfigStruct.nftCollection.toHex();
    loanConfig.minAmount = loanConfigStruct.minAmount;
    loanConfig.maxAmount = loanConfigStruct.maxAmount;
    loanConfig.minDuration = loanConfigStruct.minDuration;
    loanConfig.maxDuration = loanConfigStruct.maxDuration;
    loanConfig.minInterest = loanConfigStruct.minInterest;
    loanConfig.maxInterest = loanConfigStruct.maxInterest;

    loanConfig.save();
  }
}

export function handleLendingDeskLoanConfigRemoved(
  event: LendingDeskLoanConfigRemoved
): void {
  store.remove(
    "LoanConfig",
    event.params.lendingDeskId.toString() +
      "-" +
      event.params.nftCollection.toHex()
  );
}

export function handleLendingDeskLiquidityAdded(
  event: LendingDeskLiquidityAdded
): void {
  const lendingDesk = LendingDesk.load(event.params.lendingDeskId.toString());
  if (!lendingDesk) return;

  lendingDesk.balance = lendingDesk.balance.plus(event.params.amountAdded);
  lendingDesk.save();
}

export function handleLendingDeskLiquidityWithdrawn(
  event: LendingDeskLiquidityWithdrawn
): void {
  const lendingDesk = LendingDesk.load(event.params.lendingDeskId.toString());
  if (!lendingDesk) return;

  lendingDesk.balance = lendingDesk.balance.minus(event.params.amountWithdrawn);
  lendingDesk.save();
}

export function handleLendingDeskStateSet(event: LendingDeskStateSet): void {
  const lendingDesk = LendingDesk.load(event.params.lendingDeskId.toString());
  if (!lendingDesk) return;

  if (event.params.freeze) lendingDesk.status = "Frozen";
  else lendingDesk.status = "Active";
  lendingDesk.save();
}

export function handleLendingDeskDissolved(event: LendingDeskDissolved): void {
  const lendingDesk = LendingDesk.load(event.params.lendingDeskId.toString());
  if (!lendingDesk) return;

  lendingDesk.status = "Dissolved";
  lendingDesk.save();
}

// Loan related events

export function handleNewLoanInitialized(event: NewLoanInitialized): void {
  const loan = new Loan(event.params.loanId.toString());

  // Enter loan details
  loan.lendingDesk = event.params.lendingDeskId.toString();
  loan.amount = event.params.amount;
  loan.amountPaidBack = BigInt.fromU32(0);
  loan.duration = event.params.duration;
  loan.startTime = event.block.timestamp;
  loan.status = "Active";
  loan.borrower = event.params.borrower;
  loan.nftCollection = event.params.nftCollection.toHex();
  loan.nftId = event.params.nftId;
  loan.interest = event.params.interest;

  // Fetch lending desk and set lender to lending desk owner
  const lendingDesk = LendingDesk.load(event.params.lendingDeskId.toString());
  if (!lendingDesk) return;
  loan.lender = lendingDesk.owner;

  // Save entity
  loan.save();
}

export function handleDefaultedLoanLiquidated(
  event: DefaultedLoanLiquidated
): void {
  const loan = Loan.load(event.params.loanId.toString());
  if (!loan) return;

  loan.status = "Defaulted";
  loan.save();
}

export function handleLoanPaymentMade(event: LoanPaymentMade): void {
  const loan = Loan.load(event.params.loanId.toString());
  if (!loan) return;

  loan.amountPaidBack = loan.amountPaidBack.plus(event.params.amountPaid);
  if (event.params.resolved) loan.status = "Resolved";
  loan.save();
}

// Protocol level parameters related events

export function handleLoanOriginationFeeSet(
  event: LoanOriginationFeeSet
): void {
  const protocolParams = ProtocolParams.load("0");
  if (!protocolParams) return;

  protocolParams.loanOriginationFee = event.params.loanOriginationFee;
  protocolParams.save();
}

export function handlePaused(event: Paused): void {
  const protocolParams = ProtocolParams.load("0");
  if (!protocolParams) return;

  protocolParams.paused = true;
  protocolParams.save();
}

export function handleUnpaused(event: Unpaused): void {
  const protocolParams = ProtocolParams.load("0");
  if (!protocolParams) return;

  protocolParams.paused = false;
  protocolParams.save();
}

export function handleProtocolInitialized(event: ProtocolInitialized): void {
  const protocolParams = ProtocolParams.load("0");
  if (!protocolParams) return;

  protocolParams.promissoryNotes = event.params.promissoryNotes;
  protocolParams.obligationNotes = event.params.obligationNotes;
  protocolParams.lendingKeys = event.params.lendingKeys;

  protocolParams.save();
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  // Contract deployment, create ProtocolParams entity
  if (event.params.previousOwner == Address.zero()) {
    const protocolParams = new ProtocolParams("0");
    protocolParams.owner = event.params.newOwner;
    protocolParams.paused = false;

    // Dummy values, will populate properly through ProtocolInitialized and LoanOriginationFeeSet
    protocolParams.loanOriginationFee = BigInt.fromU32(0);
    protocolParams.promissoryNotes = Address.zero();
    protocolParams.obligationNotes = Address.zero();
    protocolParams.lendingKeys = Address.zero();

    protocolParams.save();
  } else {
    // Ownership transfer, update owner
    const protocolParams = ProtocolParams.load("0");
    if (!protocolParams) return;

    protocolParams.owner = event.params.newOwner;
    protocolParams.save();
  }
}
