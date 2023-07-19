import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { initializeLoan } from "../utils/fixtures";
import { expect } from "chai";

describe("Withdraw platform fees", () => {
  it("should withdraw platform fees", async () => {
    const { nftyFinance, erc20, alice } = await loadFixture(initializeLoan);
    const oldPlatformFee = await nftyFinance.platformFees(erc20.address);

    const tx = await nftyFinance.withdrawPlatformFees(alice.address, [
      erc20.address,
    ]);

    // Check emitted event
    expect(tx)
      .to.emit(nftyFinance, "PlatformFeesWithdrawn")
      .withArgs(alice.address, [erc20.address]);

    // Check balance
    expect(await erc20.balanceOf(alice.address)).to.equal(oldPlatformFee);

    // Check storage
    const platformFees = await nftyFinance.platformFees(erc20.address);
    expect(platformFees).to.equal(0);
  });
});
