import { useEffect, useState } from "react";
import { useChainId } from "wagmi";
import { PopupTransaction } from "@/components";
import {
  usePrepareNftyFinanceV1MakeLoanPayment,
  useNftyFinanceV1MakeLoanPayment,
  usePrepareNftyFinanceV1LiquidateDefaultedLoan,
  useNftyFinanceV1LiquidateDefaultedLoan,
  nftyFinanceV1Address,
  useErc20Approve,
} from "@/wagmi-generated";
import { calculateTimeInfo, formatTimeInfo } from "@/utils";
import { Loan } from "../../.graphclient";

// Interface
interface ILoanRowProps {
  loans: Array<Loan> | any; // Loan array
  status?: string; // Status of the loan row
  payback?: boolean; // Whether or not loan card should have payback UI
  liquidate?: boolean; // Whether or not loan card should have liquidate UI
}

export const LoanRow = ({
  loans,
  payback,
  status,
  liquidate,
}: ILoanRowProps) => {
  // Setup loan data && handle empty state
  // Note: Handle "Pending Default" manually
  loans = loans.filter((loan: Loan) => {
    if (status === "Pending Default") {
      if (loan.status === "Active") {
        return loan;
      }
    }
    if (loan.status === status) {
      return loan;
    }
  });
  if (loans.length === 0) {
    return (
      <img
        height="200"
        src="/theme/images/thinking_guy.svg"
        alt="No items found"
      />
    );
  }

  // OK
  return loans.map((loan: Loan) => {
    // Date/Time info
    const [timeInfo, setTimeInfo] = useState(
      calculateTimeInfo(loan?.startTime, loan?.duration)
    );
    useEffect(() => {
      const intervalId = setInterval(() => {
        setTimeInfo(calculateTimeInfo(loan?.startTime, loan?.duration));
      }, 1000);
      return () => {
        clearInterval(intervalId);
      };
    }, [loan?.startTime, loan?.duration]);

    // Make Loan Payment Hook
    const [payBackAmount, setPayBackAmount] = useState("0");
    const chainId = useChainId();
    const { writeAsync: approveErc20 } = useErc20Approve({
      address: loan?.lendingDesk?.erc20.id as `0x${string}`,
      args: [nftyFinanceV1Address[chainId], BigInt(payBackAmount)],
    });
    const { config: makeLoanPaymentConfig, refetch: makeLoanPaymentRefetch } =
      usePrepareNftyFinanceV1MakeLoanPayment({
        enabled: false,
        args: [
          BigInt(loan?.id || 0), // loan ID
          BigInt(payBackAmount), // amout
        ],
      });
    const { writeAsync: makeLoanPaymentWrite } =
      useNftyFinanceV1MakeLoanPayment(makeLoanPaymentConfig);
    async function makeLoanPayment(loanID: string) {
      console.log("loanID", loanID);
      console.log("payBackAmount", payBackAmount);
      await approveErc20?.();
      await makeLoanPaymentRefetch?.();
      await makeLoanPaymentWrite?.();
    }

    // Liquidate Overdue loan Hook
    const { config: liquidateConfig, refetch: liquidateRefetch } =
      usePrepareNftyFinanceV1LiquidateDefaultedLoan({
        enabled: false,
        args: [
          BigInt(loan?.id || 0), // loan ID
        ],
      });
    const { writeAsync: liquidateWrite } =
      useNftyFinanceV1LiquidateDefaultedLoan(liquidateConfig);
    async function liquidateOverdueLoan(loanID: string) {
      console.log("loanID", loanID);
      await liquidateRefetch();
      await liquidateWrite?.();
    }

    return (
      <div className="col-md-6 col-xl-4" key={loan?.id}>
        <div className="card border-0 shadow rounded-4 h-100">
          <div className="card-body p-4">
            <div className="specific-w-100 specific-h-100 d-flex align-items-center justify-content-center rounded-circle overflow-hidden mx-auto position-relative">
              <img
                className="object-fit-cover"
                src="theme/images/image-1.png"
                alt="test"
                height="100%"
              />
              {status === "Defaulted" ? (
                <div
                  className="position-absolute top-50 start-50 translate-middle z-1 w-100 h-100 d-flex align-items-center justify-content-center"
                  style={{ backgroundColor: "hsla(var(--bs-black-hsl), 0.25)" }}
                >
                  <img
                    src="theme/images/wasted.png"
                    className="img-fluid mt-4"
                    alt="Wasted"
                  />
                </div>
              ) : null}
            </div>
            <div className="h5 text-center mt-3">
              {loan?.nftCollection.id} #{loan?.nftId}
            </div>
            <div className="container-fluid g-0 mt-4">
              <div className="row g-3">
                <div className="col-sm">
                  <div
                    className={`p-2 rounded-3 ${
                      status === "Defaulted"
                        ? "bg-secondary-subtle"
                        : "bg-info-subtle"
                    } text-center`}
                  >
                    <div className="text-info-emphasis h3 mb-3">
                      <i className="fa-light fa-hand-holding-dollar"></i>
                    </div>
                    <div className="h6 mb-0">
                      {loan?.amount} {loan?.lendingDesk?.erc20.symbol}
                    </div>
                    <div>borrowed</div>
                  </div>
                </div>
                <div className="col-sm">
                  <div
                    className={`p-2 rounded-3 ${
                      status === "Defaulted"
                        ? "bg-secondary-subtle"
                        : "bg-success-subtle"
                    } text-center`}
                  >
                    <div className="text-success-emphasis h3 mb-3">
                      <i className="fa-light fa-calendar-lines"></i>
                    </div>
                    <div className="h6 mb-0">
                      {loan?.amount - loan?.amountPaidBack}{" "}
                      {loan?.lendingDesk?.erc20.symbol}
                    </div>
                    <div>payoff</div>
                  </div>
                </div>
                <div className="mt-2">
                  {status === "Active" ? (
                    <div className="mt-2">
                      <strong className="fs-4">{timeInfo.remainingTime}</strong>
                      <span className="text-body-secondary">{` left`}</span>
                    </div>
                  ) : status === "Defaulted" ? (
                    <div className="mt-2">
                      <strong className="fs-4">{`0 days`}</strong>
                      <span className="text-body-secondary">{` left`}</span>
                    </div>
                  ) : status === "Completed" ? (
                    <div className="mt-2">
                      <strong className="fs-5">{`Complete`}</strong>
                    </div>
                  ) : null}
                  <div className="progress mt-3 shadow-none">
                    {status === "Active" ? (
                      <div
                        className="progress-bar text-bg-success"
                        role="progressbar"
                        aria-valuenow={timeInfo.calculateProgress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        style={{ width: `${timeInfo.calculateProgress}%` }}
                      />
                    ) : status === "Defaulted" ? (
                      <div
                        className="progress-bar text-bg-danger"
                        role="progressbar"
                        aria-label="Progress"
                        aria-valuenow={100}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        style={{ width: "100%" }}
                      ></div>
                    ) : status === "Completed" ? (
                      <div
                        className="progress-bar text-bg-success"
                        role="progressbar"
                        aria-label="Progress"
                        aria-valuenow={100}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        style={{ width: "100%" }}
                      ></div>
                    ) : null}
                  </div>
                  <div className="d-flex align-items-center mt-3">
                    <div className="text-body-secondary pe-2 lh-sm">
                      {formatTimeInfo(timeInfo.startDate)}
                      <br />
                      <small>loan issued</small>
                    </div>
                    <div className="text-body-secondary pe-2 lh-sm">
                      {formatTimeInfo(timeInfo.endDate)}
                      <br />
                      <small>due date</small>
                    </div>
                  </div>
                </div>
              </div>
              {payback ? (
                <PopupTransaction
                  btnClass="btn btn-primary btn-lg rounded-pill w-100 d-block mt-3"
                  btnText="Pay Back"
                  modalId={`paybackModal${loan?.id}`}
                  modalTitle="Make Loan Payment"
                  modalContent={
                    <div>
                      <small>Loan Details</small>
                      <p>
                        {loan?.nftCollection.id} #{loan?.nftId}
                      </p>
                      <div className="row g-4">
                        <div className="col-6 bg-secondary">
                          <h6>
                            {loan?.amount} {loan?.lendingDesk?.erc20.symbol}
                          </h6>
                          <small>original borrow</small>
                        </div>
                        <div className="col-6 bg-secondary">
                          <h6>{loan?.interest} %</h6>
                          <small>interest date</small>
                        </div>
                        <div className="col-6 bg-secondary">
                          <h6>{timeInfo.elapsedTime}</h6>
                          <small>loan duration</small>
                        </div>
                        <div className="col-6 bg-secondary">
                          <h6>[x]{loan?.lendingDesk?.erc20.symbol}</h6>
                          <small>amount due on expiry date</small>
                        </div>
                        <div className="col-12 bg-success">
                          <h6>[x]{loan?.lendingDesk?.erc20.symbol}</h6>
                          <small>current payoff amount</small>
                        </div>
                      </div>
                      <hr />
                      <p className="text-start">Enter Amount</p>
                      <div className="input-group">
                        <input
                          value={payBackAmount}
                          onChange={(e) => setPayBackAmount(e.target.value)}
                          type="number"
                          className="me-2"
                        />
                        <span>{loan?.lendingDesk?.erc20.symbol}</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => makeLoanPayment(loan?.id)}
                      >
                        Make Loan Payment
                      </button>
                    </div>
                  }
                />
              ) : null}
              {liquidate ? (
                <PopupTransaction
                  btnClass="btn btn-primary btn-lg mt-4"
                  btnText="Liquidate Overdue Loan"
                  modalId={`liquidateModal${loan?.id}`}
                  modalTitle="Liquidate Overdue Loan"
                  modalContent={
                    <div>
                      <small>Loan Details</small>
                      <p>
                        {loan?.nftCollection.id} #{loan?.nftId}
                      </p>
                      <div className="row g-4">
                        <div className="col-6 bg-secondary">
                          <h6>
                            {loan?.amount} {loan?.lendingDesk?.erc20.symbol}
                          </h6>
                          <small>original borrow</small>
                        </div>
                        <div className="col-6 bg-secondary">
                          <h6>{loan?.interest} %</h6>
                          <small>interest date</small>
                        </div>
                        <div className="col-6 bg-secondary">
                          <h6>{timeInfo.elapsedTime}</h6>
                          <small>loan duration</small>
                        </div>
                        <div className="col-6 bg-secondary">
                          <h6>[x]{loan?.lendingDesk?.erc20.symbol}</h6>
                          <small>amount due on expiry date</small>
                        </div>
                        <div className="col-12 bg-success">
                          <h6>[x]{loan?.lendingDesk?.erc20.symbol}</h6>
                          <small>current payoff amount</small>
                        </div>
                      </div>
                      <hr />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => liquidateOverdueLoan(loan?.id)}
                      >
                        Liquidate Overdue Loan
                      </button>
                    </div>
                  }
                />
              ) : null}
            </div>
          </div>
          {status === "Defaulted" ? (
            <i className="fa-solid fa-times-circle text-danger-emphasis fs-4 position-absolute top-0 start-0 m-2"></i>
          ) : status === "Completed" ? (
            <i className="fa-solid fa-check-circle text-success-emphasis fs-4 position-absolute top-0 start-0 m-2"></i>
          ) : null}
        </div>
      </div>
    );
  });
};
