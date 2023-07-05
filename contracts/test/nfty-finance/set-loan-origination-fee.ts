import { expect } from "chai";
import { deployNftyFinance } from "../utils/fixtures";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Set loan origination fee", function () {
  it("should fail when fee > 10%", async () => {
    const { nftyFinance } = await loadFixture(deployNftyFinance);

    const tx = await nftyFinance.setLoanOriginationFee(10000);
    expect(tx).to.be.revertedWith("fee > 10%");
  });
  it("should set loan origination fee", async () => {
    const { nftyFinance } = await loadFixture(deployNftyFinance);
    const loanOriginationFee = 100;

    const tx = await nftyFinance.setLoanOriginationFee(loanOriginationFee);

    expect(tx)
      .to.emit(nftyFinance, "LoanOriginationFeeSet")
      .withArgs(loanOriginationFee);
    expect(await nftyFinance.loanOriginationFee()).to.equal(loanOriginationFee);
  });
});
