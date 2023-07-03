import {
  OwnershipTransferred,
  Paused,
  Unpaused,
  NewLendingDeskInitialized,
  LoanOriginationFeeSet,
  LendingDeskLoanConfigSet,
  LendingDeskLoanConfigRemoved,
  LendingDeskLiquidityAdded,
  LendingDeskLiquidityWithdrawn,
  LendingDeskStateSet,
  NewLoanInitialized,
  NFTYFinance,
  DefaultedLoanLiquidated,
  LoanPaymentMade,
} from "../generated/NFTYFinance/NFTYFinance";
import { ERC20 } from "../generated/NFTYLending/ERC20";
import {
  Erc20,
  LendingDesk,
  Loan,
  LoanConfig,
  NftCollection,
  ProtocolParams,
} from "../generated/schema";
import { BigInt, store } from "@graphprotocol/graph-ts";

// Lending desk related events

export function handleNewLendingDeskInitialized(
  event: NewLendingDeskInitialized
): void {
  // Create ERC20 instance
  const erc20 = new Erc20(event.params.erc20.toHex());
  const erc20Contract = ERC20.bind(event.params.erc20);

  erc20.name = erc20Contract.name();
  erc20.symbol = erc20Contract.symbol();
  erc20.decimals = erc20Contract.decimals();

  erc20.save();

  // Create LiquidityShop instance
  const lendingDesk = new LendingDesk(event.params.id.toString());

  lendingDesk.erc20 = event.params.erc20.toHex();
  lendingDesk.owner = event.params.owner;
  lendingDesk.status = "Active";

  lendingDesk.save();
}

export function handleLendingDeskLoanConfigSet(
  event: LendingDeskLoanConfigSet
): void {
  event.params.loanConfigs.forEach((loanConfigStruct) => {
    // Create NftCollection instance
    const nftCollection = new NftCollection(
      loanConfigStruct.nftCollection.toHex()
    );
    nftCollection.isErc1155 = loanConfigStruct.nftCollectionIsErc1155;
    nftCollection.save();

    // Create LoanConfig instance
    const loanConfig = new LoanConfig(
      event.params.lendingDeskId.toString() +
        ":" +
        loanConfigStruct.nftCollection.toHex()
    );

    loanConfig.minAmount = loanConfigStruct.minAmount;
    loanConfig.maxAmount = loanConfigStruct.maxAmount;
    loanConfig.minDuration = loanConfigStruct.minDuration;
    loanConfig.maxDuration = loanConfigStruct.maxDuration;
    loanConfig.minInterest = loanConfigStruct.minInterest;
    loanConfig.maxInterest = loanConfigStruct.maxInterest;

    loanConfig.save();
  });
}

export function handleLendingDeskLoanConfigRemoved(
  event: LendingDeskLoanConfigRemoved
): void {
  store.remove(
    "LoanConfig",
    event.params.lendingDeskId.toString() +
      ":" +
      event.params.nftCollection.toHex()
  );
}

export function handleLendingDeskLiquidityAdded(
  event: LendingDeskLiquidityAdded
): void {
  const lendingDesk = new LendingDesk(event.params.id.toString());
  lendingDesk.balance = event.params.balance;
  lendingDesk.save();
}

export function handleLendingDeskLiquidityWithdrawn(
  event: LendingDeskLiquidityWithdrawn
): void {
  const lendingDesk = new LendingDesk(event.params.id.toString());
  lendingDesk.balance = event.params.balance;
  lendingDesk.save();
}

export function handleLendingDeskStateSet(event: LendingDeskStateSet): void {
  const lendingDesk = new LendingDesk(event.params.lendingDeskId.toString());
  if (event.params.freeze) lendingDesk.status = "Frozen";
  else lendingDesk.status = "Active";
  lendingDesk.save();
}

// Loan related events

export function handleNewLoanInitialized(event: NewLoanInitialized): void {
  const loan = new Loan(event.params.loanId.toString());

  // Get loan details
  const nftyFinanceContract = NFTYFinance.bind(event.address);
  const loanDetails = nftyFinanceContract.loans(event.params.loanId);

  // Enter loan details
  loan.lendingDesk = event.params.lendingDeskId.toString();
  loan.amount = loanDetails.getAmount();
  loan.amountPaidBack = new BigInt(0);
  loan.duration = loanDetails.getDuration();
  loan.startTime = loanDetails.getStartTime();
  loan.status = "Active";
  loan.lender = event.params.lender;
  loan.borrower = event.params.borrower;
  loan.nftCollection = loanDetails.getNftCollection().toHex();
  loan.nftId = loanDetails.getNftId();

  // Save entity
  loan.save();
}

export function handleDefaultedLoanLiquidated(
  event: DefaultedLoanLiquidated
): void {
  const loan = new Loan(event.params.loanId.toString());
  loan.status = "Defaulted";
  loan.save();
}

export function handleLoanPaymentMade(event: LoanPaymentMade): void {
  const loan = new Loan(event.params.loanId.toString());
  loan.amount = event.params.amount;
  if (event.params.resolved) loan.status = "Resolved";
  loan.save();
}

// Protocol level parameters related events

export function handleLoanOriginationFeeSet(
  event: LoanOriginationFeeSet
): void {
  const protocolParams = new ProtocolParams("0");
  protocolParams.loanOriginationFee = event.params.loanOriginationFee;
  protocolParams.save();
}

export function handlePaused(event: Paused): void {
  const protocolParams = new ProtocolParams("0");
  protocolParams.paused = true;
  protocolParams.save();
}

export function handleUnpaused(event: Unpaused): void {
  const protocolParams = new ProtocolParams("0");
  protocolParams.paused = false;
  protocolParams.save();
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  const protocolParams = new ProtocolParams("0");

  // Load contract details
  const nftyFinanceContract = NFTYFinance.bind(event.address);
  protocolParams.loanOriginationFee = nftyFinanceContract.loanOriginationFee();
  protocolParams.paused = false;
  protocolParams.owner = nftyFinanceContract.owner();
  protocolParams.promissoryNotes = nftyFinanceContract.promissoryNotes();
  protocolParams.obligationNotes = nftyFinanceContract.obligationNotes();
  protocolParams.lendingKeys = nftyFinanceContract.lendingKeys();

  protocolParams.owner = event.params.newOwner;
  protocolParams.save();
}
