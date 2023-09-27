import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  initializeLendingDesk,
  initializeLendingDeskAndAddLoanConfig,
} from "../utils/fixtures";
import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { LoanConfig } from "../utils/consts";

describe("NFTY Finance: Initialize new loan", () => {
  const loanDuration = 30;
  const loanAmount = ethers.utils.parseUnits("20", 18);
  const nftId = 0;

  const setup = async () => {
    const { borrower, erc20, erc721, nftyFinance, ...rest } =
      await initializeLendingDeskAndAddLoanConfig();

    // Give borrower some ERC20 and NFTs
    await erc20.connect(borrower).mint(10000);
    await erc721.connect(borrower).mint(1);

    // Approve NFTYLending to transfer tokens
    await erc20.connect(borrower).approve(nftyFinance.address, 10000);
    await erc721.connect(borrower).approve(nftyFinance.address, nftId);

    return { borrower, erc20, erc721, nftyFinance, ...rest };
  };

  it("should fail for invalid lending desk id", async () => {
    const { nftyFinance, lendingDeskId, borrower, erc721 } = await loadFixture(
      setup
    );

    const invalidLendingDeskId = 2;
    expect(invalidLendingDeskId).to.not.equal(lendingDeskId);

    await expect(
      nftyFinance
        .connect(borrower)
        .initializeNewLoan(
          invalidLendingDeskId,
          erc721.address,
          nftId,
          loanDuration,
          loanAmount
        )
    ).to.be.revertedWith("invalid lending desk id");
  });

  it("should fail for duration < min duration", async () => {
    const { nftyFinance, lendingDeskId, borrower, erc721 } = await loadFixture(
      setup
    );

    await expect(
      nftyFinance.connect(borrower).initializeNewLoan(
        lendingDeskId,
        erc721.address,
        nftId,
        10, // loan duration
        loanAmount
      )
    ).to.be.revertedWith("duration < min duration");
  });

  it("should fail for duration > max duration", async () => {
    const { nftyFinance, lendingDeskId, borrower, erc721 } = await loadFixture(
      setup
    );

    await expect(
      nftyFinance.connect(borrower).initializeNewLoan(
        lendingDeskId,
        erc721.address,
        nftId,
        300, // loan duration
        loanAmount
      )
    ).to.be.revertedWith("duration > max duration");
  });

  it("should fail for amount < min amount", async () => {
    const { nftyFinance, lendingDeskId, borrower, erc721 } = await loadFixture(
      setup
    );

    await expect(
      nftyFinance.connect(borrower).initializeNewLoan(
        lendingDeskId,
        erc721.address,
        nftId,
        loanDuration,
        ethers.utils.parseUnits("5", 18) // loan amount
      )
    ).to.be.revertedWith("amount < min amount");
  });

  it("should fail for amount > max amount", async () => {
    const { nftyFinance, lendingDeskId, borrower, erc721 } = await loadFixture(
      setup
    );

    await expect(
      nftyFinance.connect(borrower).initializeNewLoan(
        lendingDeskId,
        erc721.address,
        nftId,
        loanDuration,
        ethers.utils.parseUnits("200", 18) // loan amount
      )
    ).to.be.revertedWith("amount > max amount");
  });

  it("should fail if contract is paused", async () => {
    const { nftyFinance, lendingDeskId, borrower, erc721 } = await loadFixture(
      setup
    );
    await nftyFinance.setPaused(true);

    await expect(
      nftyFinance
        .connect(borrower)
        .initializeNewLoan(
          lendingDeskId,
          erc721.address,
          nftId,
          loanDuration,
          loanAmount
        )
    ).to.be.revertedWith("Pausable: paused");
  });

  it("should fail if lending desk does not support NFT collection", async () => {
    const { nftyFinance, lendingDeskId, borrower, erc20, erc721, lender } =
      await loadFixture(setup);

    // Remove support for ERC721
    await nftyFinance
      .connect(lender)
      .removeLendingDeskLoanConfig(lendingDeskId, erc721.address);

    await expect(
      nftyFinance.connect(borrower).initializeNewLoan(
        lendingDeskId,
        erc721.address, // not supported
        nftId,
        loanDuration,
        loanAmount
      )
    ).to.be.revertedWith("lending desk does not support NFT collection");
  });

  it("should fail if lending desk does not have enough balance", async () => {
    const {
      nftyFinance,
      lendingDeskId,
      lendingDesk,
      borrower,
      erc721,
      lender,
    } = await loadFixture(setup);

    const withdrawAmount = ethers.utils.parseUnits("990", 18);
    await nftyFinance
      .connect(lender)
      .withdrawLendingDeskLiquidity(lendingDeskId, withdrawAmount);

    // make sure balance is less than loan amount
    expect(loanAmount).to.be.greaterThan(
      lendingDesk.balance.sub(withdrawAmount)
    );

    await expect(
      nftyFinance
        .connect(borrower)
        .initializeNewLoan(
          lendingDeskId,
          erc721.address,
          nftId,
          loanDuration,
          loanAmount
        )
    ).to.be.revertedWith("insufficient lending desk balance");
  });

  it("should fail if liquidity shop is not active", async () => {
    const { nftyFinance, lendingDeskId, borrower, erc721, lender } =
      await loadFixture(setup);

    await nftyFinance.connect(lender).setLendingDeskState(lendingDeskId, true);

    await expect(
      nftyFinance
        .connect(borrower)
        .initializeNewLoan(
          lendingDeskId,
          erc721.address,
          nftId,
          loanDuration,
          loanAmount
        )
    ).to.be.revertedWith("lending desk not active");
  });

  it("should create loan", async () => {
    const {
      nftyFinance,
      lendingDeskId,
      borrower,
      erc721,
      erc20,
      platformWallet,
    } = await loadFixture(setup);

    // Check platform wallet balance
    const initialPlatformWalletBalance = await erc20.balanceOf(platformWallet);

    const tx = nftyFinance
      .connect(borrower)
      .initializeNewLoan(
        lendingDeskId,
        erc721.address,
        nftId,
        loanDuration,
        loanAmount
      );

    const platformFee = loanAmount.mul(2).div(100); // 2% of loan amount

    // Check emitted event
    await expect(tx).to.emit(nftyFinance, "NewLoanInitialized").withArgs(
      lendingDeskId,
      anyValue, // loanId
      borrower.address,
      erc721.address,
      nftId,
      loanAmount,
      loanDuration,
      anyValue, // interest
      platformFee
    );

    // Check loan details in storage
    const { events } = await (await tx).wait();
    const event = events?.find(
      (event) => event.event == "NewLoanInitialized"
    )?.args;
    const loanId = event?.loanId;

    const loan = await nftyFinance.loans(loanId);
    expect(loan.amount).to.equal(loanAmount);
    expect(loan.duration).to.equal(loanDuration);
    expect(loan.amountPaidBack).to.equal(0);
    expect(loan.nftCollection).to.equal(erc721.address);
    expect(loan.nftId).to.equal(nftId);
    expect(loan.lendingDeskId).to.equal(lendingDeskId);
    expect(loan.status).to.equal(0); // LoanStatus.Active

    // Check platform wallet balance has increased
    const platformWalletBalance = await erc20.balanceOf(platformWallet);
    expect(platformWalletBalance.sub(initialPlatformWalletBalance)).to.equal(
      platformFee
    );
  });

  it("should create loan if lending desk has constant params", async () => {
    const { nftyFinance, lender, lendingDeskId, erc721, erc20, borrower } =
      await loadFixture(initializeLendingDesk);

    // Set loan config with constant values
    const loanConfig: LoanConfig = {
      nftCollection: erc721.address,
      nftCollectionIsErc1155: false,
      minAmount: ethers.utils.parseUnits("10", 18),
      maxAmount: ethers.utils.parseUnits("10", 18),
      minDuration: BigNumber.from(24),
      maxDuration: BigNumber.from(24),
      minInterest: BigNumber.from(200),
      maxInterest: BigNumber.from(200),
    };
    await nftyFinance
      .connect(lender)
      .setLendingDeskLoanConfigs(lendingDeskId, [loanConfig]);

    // Give borrower some ERC20 and NFTs
    await erc20.connect(borrower).mint(10000);
    await erc721.connect(borrower).mint(1);

    // Approve NFTYLending to transfer tokens
    await erc20.connect(borrower).approve(nftyFinance.address, 10000);
    await erc721.connect(borrower).approve(nftyFinance.address, nftId);

    // Create loan
    const tx = await nftyFinance
      .connect(borrower)
      .initializeNewLoan(
        lendingDeskId,
        erc721.address,
        nftId,
        BigNumber.from(24),
        ethers.utils.parseUnits("10", 18)
      );
    // Make sure it passes
    await expect(tx).to.emit(nftyFinance, "NewLoanInitialized");
  });
});
