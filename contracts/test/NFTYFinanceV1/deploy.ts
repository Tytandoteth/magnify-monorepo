import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { getEventNames } from "../utils/utils";

describe("NFTY Finance: Deploy", () => {
  const deployDependencies = async () => {
    const [owner, alice, platformWallet] = await ethers.getSigners();

    // Obligation Notes
    const ObligationNotes = await ethers.getContractFactory(
      "NFTYObligationNotesV1"
    );
    const obligationNotes = await ObligationNotes.deploy(
      "NFTY Obligation Notes",
      "BORROW",
      "https://metadata.nfty.finance/BORROW/",
      owner.address
    );
    await obligationNotes.waitForDeployment();

    // Lending Keys
    const LendingKeys = await ethers.getContractFactory("NFTYLendingKeysV1");
    const lendingKeys = await LendingKeys.deploy(
      "NFTY Lending Keys",
      "KEYS",
      "https://metadata.nfty.finance/KEYS/",
      owner.address
    );
    await lendingKeys.waitForDeployment();

    const NFTYFinance = await ethers.getContractFactory("NFTYFinanceV1");

    return {
      obligationNotes,
      lendingKeys,
      NFTYFinance,
      platformWallet: platformWallet.address,
      owner,
    };
  };

  it("should fail for zero addr obligation receipt", async () => {
    const { NFTYFinance, lendingKeys, platformWallet, owner } =
      await loadFixture(deployDependencies);

    await expect(
      NFTYFinance.deploy(
        ethers.ZeroAddress, // zero address for obligation notes
        lendingKeys.target,
        200,
        platformWallet,
        owner.address
      )
    ).to.be.revertedWithCustomError(NFTYFinance, "ObligationNotesIsZeroAddr");
  });

  it("should fail for zero addr lending keys", async () => {
    const {
      NFTYFinance,
      obligationNotes,
      platformWallet,
      owner,
    } = await loadFixture(deployDependencies);

    await expect(
      NFTYFinance.deploy(
        obligationNotes.target,
        ethers.ZeroAddress, // zero address for lending keys
        200,
        platformWallet,
        owner.address
      )
    ).to.be.revertedWithCustomError(NFTYFinance, "LendingKeysIsZeroAddr");
  });

  it("should deploy", async () => {
    const {
      NFTYFinance,
      obligationNotes,
      lendingKeys,
      platformWallet,
    } = await loadFixture(deployDependencies);
    const [owner] = await ethers.getSigners();

    const nftyFinance = await NFTYFinance.deploy(
      obligationNotes.target,
      lendingKeys.target,
      200,
      platformWallet,
      owner.address
    );

    const tx = nftyFinance.deploymentTransaction();

    // Assert order of 4 emitted events
    const eventNames = await getEventNames(tx!);
    expect(eventNames).to.deep.equal([
      "OwnershipTransferred",
      "LoanOriginationFeeSet",
      "PlatformWalletSet",
      "ProtocolInitialized",
    ]);

    // check if emitted OwnershipTransferred event
    expect(tx)
      .to.emit(nftyFinance, "OwnershipTransferred")
      .withArgs(ethers.ZeroAddress, owner.address);

    // check if emitted LoanOriginationFeeSet event
    expect(tx).to.emit(nftyFinance, "LoanOriginationFeeSet").withArgs(200);

    // check if emitted PlatformWalletSet event
    expect(tx)
      .to.emit(nftyFinance, "PlatformWalletSet")
      .withArgs(platformWallet);

    // check if emitted ProtocolInitialized event
    expect(tx)
      .to.emit(nftyFinance, "ProtocolInitialized")
      .withArgs(
        obligationNotes.target,
        lendingKeys.target
      );

    // check expected values set in constructor
    expect(await nftyFinance.owner()).to.equal(owner.address);
    expect(await nftyFinance.paused()).to.be.false;
    expect(await nftyFinance.obligationNotes()).to.equal(
      obligationNotes.target
    );
    expect(await nftyFinance.lendingKeys()).to.equal(lendingKeys.target);
    expect(await nftyFinance.loanOriginationFee()).to.equal(200);
    expect(await nftyFinance.platformWallet()).to.equal(platformWallet);
  });
});
