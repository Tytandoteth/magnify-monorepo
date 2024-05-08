import { getDefaultConfig } from "connectkit";
import { createConfig } from "wagmi";
import { base, baseSepolia, hardhat } from "wagmi/chains";

const walletConnectProjectId = "6f26f99d86d880b561988f69808456d3";
const chainlist: any = [
  baseSepolia, // Note: First chain in list is default
  base,
];
if (import.meta.env.DEV) {
  chainlist.push(hardhat);
}

export const config = createConfig(
  getDefaultConfig({
    autoConnect: true,
    appName: "Magnify.Cash",
    walletConnectProjectId,
    chains: chainlist,
  }),
);
