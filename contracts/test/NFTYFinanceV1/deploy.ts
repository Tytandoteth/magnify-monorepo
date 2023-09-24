import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  NFTYFinanceV1,
  NFTYFinanceV1__factory,
  NFTYLendingKeysV1__factory,
  NFTYObligationNotesV1__factory,
  NFTYPromissoryNotesV1__factory,
} from "typechain-types";

describe("NFTY Finance: Deploy", () => {
  const deployDependencies = async () => {
    // Promissory Notes
    const PromissoryNotes = (await ethers.getContractFactory(
      "NFTYPromissoryNotesV1"
    )) as NFTYPromissoryNotesV1__factory;
    const promissoryNotes = await PromissoryNotes.deploy(
      "NFTY Promissory Notes",
      "LEND",
      "https://metadata.nfty.finance/LEND/"
    );
    await promissoryNotes.deployed();

    // Obligation Notes
    const ObligationNotes = (await ethers.getContractFactory(
      "NFTYObligationNotesV1"
    )) as NFTYObligationNotesV1__factory;
    const obligationNotes = await ObligationNotes.deploy(
      "NFTY Obligation Notes",
      "BORROW",
      "https://metadata.nfty.finance/BORROW/"
    );
    await obligationNotes.deployed();

    // Lending Keys
    const LendingKeys = (await ethers.getContractFactory(
      "NFTYLendingKeysV1"
    )) as NFTYLendingKeysV1__factory;
    const lendingKeys = await LendingKeys.deploy(
      "NFTY Lending Keys",
      "KEYS",
      "https://metadata.nfty.finance/KEYS/"
    );
    await lendingKeys.deployed();

    const NFTYFinance = (await ethers.getContractFactory(
      "NFTYFinanceV1"
    )) as NFTYFinanceV1__factory;

    const [owner, alice, platformWallet] = await ethers.getSigners();

    return {
      promissoryNotes,
      obligationNotes,
      lendingKeys,
      NFTYFinance,
      platformWallet: platformWallet.address,
    };
  };

  it("should fail for zero addr promissory note", async () => {
    const { NFTYFinance, obligationNotes, lendingKeys, platformWallet } =
      await loadFixture(deployDependencies);

    await expect(
      NFTYFinance.deploy(
        ethers.constants.AddressZero, // zero address for promissory note
        obligationNotes.address,
        lendingKeys.address,
        200,
        platformWallet
      )
    ).to.be.revertedWith("promissory note is zero addr");
  });

  it("should fail for zero addr obligation receipt", async () => {
    const { NFTYFinance, promissoryNotes, lendingKeys, platformWallet } =
      await loadFixture(deployDependencies);

    await expect(
      NFTYFinance.deploy(
        promissoryNotes.address,
        ethers.constants.AddressZero, // zero address for obligation notes
        lendingKeys.address,
        200,
        platformWallet
      )
    ).to.be.revertedWith("obligation note is zero addr");
  });

  it("should fail for zero addr lending keys", async () => {
    const { NFTYFinance, promissoryNotes, obligationNotes, platformWallet } =
      await loadFixture(deployDependencies);

    await expect(
      NFTYFinance.deploy(
        promissoryNotes.address,
        obligationNotes.address,
        ethers.constants.AddressZero, // zero address for lending keys
        200,
        platformWallet
      )
    ).to.be.revertedWith("lending keys is zero addr");
  });

  it("should deploy", async () => {
    const {
      NFTYFinance,
      promissoryNotes,
      obligationNotes,
      lendingKeys,
      platformWallet,
    } = await loadFixture(deployDependencies);
    const [owner] = await ethers.getSigners();

    const nftyFinance = (await NFTYFinance.deploy(
      promissoryNotes.address,
      obligationNotes.address,
      lendingKeys.address,
      200,
      platformWallet
    )) as NFTYFinanceV1;

    // Assert order of 3 emitted events
    const receipt = await nftyFinance.deployTransaction.wait();
    const eventNames = receipt.logs.map(
      (x) => nftyFinance.interface.parseLog(x).name
    );
    expect(eventNames).to.deep.equal([
      "OwnershipTransferred",
      "LoanOriginationFeeSet",
      "PlatformWalletSet",
      "ProtocolInitialized",
    ]);

    // check if emitted OwnershipTransferred event
    expect(nftyFinance.deployTransaction)
      .to.emit(nftyFinance, "OwnershipTransferred")
      .withArgs(ethers.constants.AddressZero, owner.address);

    // check if emitted LoanOriginationFeeSet event
    expect(nftyFinance.deployTransaction)
      .to.emit(nftyFinance, "LoanOriginationFeeSet")
      .withArgs(200);

    // check if emitted PlatformWalletSet event
    expect(nftyFinance.deployTransaction)
      .to.emit(nftyFinance, "PlatformWalletSet")
      .withArgs(platformWallet);

    // check if emitted ProtocolInitialized event
    expect(nftyFinance.deployTransaction)
      .to.emit(nftyFinance, "ProtocolInitialized")
      .withArgs(
        promissoryNotes.address,
        obligationNotes.address,
        lendingKeys.address
      );

    // check expected values set in constructor
    expect(await nftyFinance.owner()).to.equal(owner.address);
    expect(await nftyFinance.paused()).to.be.false;
    expect(await nftyFinance.promissoryNotes()).to.equal(
      promissoryNotes.address
    );
    expect(await nftyFinance.obligationNotes()).to.equal(
      obligationNotes.address
    );
    expect(await nftyFinance.lendingKeys()).to.equal(lendingKeys.address);
    expect(await nftyFinance.loanOriginationFee()).to.equal(200);
    expect(await nftyFinance.platformWallet()).to.equal(platformWallet);
  });
});
