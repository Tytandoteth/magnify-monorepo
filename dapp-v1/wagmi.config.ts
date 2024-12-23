import { defineConfig, Config } from "@wagmi/cli";
import { hardhat, react } from "@wagmi/cli/plugins";

const config = async (): Promise<Config> => {
  const response = await import("../deployments.json");
  const data = response.default;
  const hardhatAddress = data.magnifyCash.address as `0x${string}`
  return {
    out: "src/wagmi-generated.ts",
    plugins: [
      hardhat({
        project: "../contracts",
        deployments: {
          MagnifyCashV1: {
            31337: hardhatAddress, // hardhat
            11155111: "0x58b9F441b5c4681e1Ab74ecdE2A01698831BF2c4", // sepolia
            84532: "0x781EBE3865b0911D6989854dCD29DF3cd81168eB", // base sepolia
            8453: "0x9C8D226016492a8fE6531Fe1409aD79099Dd0729", // base mainnet
            1: "0xA5FE620E35A2f7459e8cb72bd567aBA8f294867a" // eth mainnet
          },
        },
      }),
      react(),
    ],
  };
};

export default defineConfig(config);
